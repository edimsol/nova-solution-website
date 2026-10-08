"""Validate the preservation package without changing the production source."""
from collections import Counter
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import subprocess
from urllib.parse import unquote, urlsplit
import xml.etree.ElementTree as ET

BASE = Path(__file__).resolve().parents[1]
REPO = BASE.parents[2]
OUTPUTS = {BASE/'validation.json', BASE/'archive-manifest.json'}

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

class Document(HTMLParser):
    def __init__(self, path):
        super().__init__(convert_charrefs=True)
        self.ids, self.refs, self.issues = [], [], []
        self.image_count = 0
        self.feed(path.read_text(encoding='utf-8'))
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        for name in ('href', 'src', 'poster'):
            if attrs.get(name):
                self.refs.append(attrs[name])
        if tag in ('form', 'iframe', 'object', 'embed'):
            self.issues.append('Executable original element: '+tag)
        if tag == 'script' and attrs.get('type') != 'application/json':
            self.issues.append('Executable script')
        if any(k.lower().startswith('on') for k in attrs):
            self.issues.append('Inline event handler')
        if tag == 'img':
            self.image_count += 1
            if not attrs.get('src', '').startswith('data:'):
                self.issues.append('Image is not embedded')
            if 'alt' not in attrs:
                self.issues.append('Image has no alt')
        if tag in ('input', 'select', 'textarea') and 'disabled' not in attrs:
            self.issues.append('Live form control: '+tag)

def main():
    failures = []
    baseline = json.loads((BASE/'baseline-manifest.json').read_text(encoding='utf-8'))
    for entry in baseline['files']:
        for path, expected in [(BASE/'snapshot'/entry['path'],entry['sha256']),
                               (REPO/entry['path'],entry['worktree_sha256'])]:
            if not path.is_file() or digest(path) != expected:
                failures.append('Baseline changed: '+str(path))
    diff = subprocess.run(['git','diff','--exit-code'],cwd=REPO,capture_output=True,text=True)
    if diff.returncode:
        failures.append('Tracked source diff is not empty')
    page_docs = sorted((BASE/'pages').glob('*.html'))
    source_pages = sorted((BASE/'snapshot').glob('*.html'))
    if [p.name for p in page_docs] != [p.name for p in source_pages] or len(page_docs) != 11:
        failures.append('Page/document mapping must be exactly 11 to 11')
    documents = page_docs + [BASE/name for name in ('index.html','common.html','renewal-spec.html','logo-preview.html')]
    parsed = {p:Document(p) for p in documents}
    local_links_checked = 0
    for path, document in parsed.items():
        failures.extend(str(path.relative_to(BASE))+': '+issue for issue in document.issues)
        duplicates = [key for key, count in Counter(document.ids).items() if count > 1]
        if duplicates:
            failures.append(f'Duplicate IDs in {path.name}: {duplicates}')
        for ref in document.refs:
            url = urlsplit(ref)
            if url.scheme or url.netloc:
                continue
            target = ((REPO/unquote(url.path).lstrip('/')) if url.path.startswith('/') else (path.parent/unquote(url.path))).resolve() if url.path else path
            local_links_checked += 1
            if not target.is_file() and target not in OUTPUTS:
                failures.append(f'Missing link in {path.name}: {ref}')
            if url.fragment and target in parsed and unquote(url.fragment) not in parsed[target].ids:
                failures.append(f'Missing anchor in {path.name}: {ref}')
    source_validation = json.loads((BASE/'documents-validation.json').read_text(encoding='utf-8'))
    if not source_validation['all_source_text_preserved']:
        failures.append('Source text preservation failed')
    browser = json.loads((BASE/'evidence/browser-checks.json').read_text(encoding='utf-8'))
    for capture in browser['captures']:
        if not (BASE/capture['file']).is_file():
            failures.append('Missing capture: '+capture['file'])
    for slug in [p.stem for p in page_docs]:
        for mode in ('desktop','mobile'):
            if not (BASE/'evidence'/f'{slug}-{mode}.jpg').is_file():
                failures.append(f'Missing {mode} base capture: {slug}')
    mobile = json.loads((BASE/'evidence/document-layout-checks.json').read_text(encoding='utf-8'))
    auxiliary = json.loads((BASE/'evidence/auxiliary-layout-checks.json').read_text(encoding='utf-8'))
    for item in mobile + auxiliary:
        if item['width'] > 390 or item['scrollWidth'] > item['width'] or item.get('brokenImages'):
            failures.append('Mobile document layout failed: '+item['page'])
    logo_files = [REPO/'assets/brand'/f'nova-symbol-{name}.svg' for name in ('color','light','dark')]
    logo_roots = [ET.parse(p).getroot() for p in logo_files]
    ns = {'s':'http://www.w3.org/2000/svg'}
    paths = [[e.attrib['d'] for e in root.findall('.//s:path',ns)] for root in logo_roots]
    if not paths[0] or paths[0] != paths[1] or paths[0] != paths[2]:
        failures.append('Logo silhouettes differ')
    if any(root.attrib.get('viewBox') != '0 0 1254 1254' for root in logo_roots):
        failures.append('Logo viewBox differs')
    for root, color in zip(logo_roots[1:],('#fefefe','#242424')):
        if any(e.attrib.get('fill','').lower() != color for e in root.findall('.//s:path',ns)):
            failures.append('Logo solid color mismatch')
    for root in logo_roots:
        for node in root.iter():
            if node.tag.split('}')[-1] in ('image','script','foreignObject'):
                failures.append('SVG contains raster or executable content')
            for key,value in node.attrib.items():
                if key.split('}')[-1] == 'href' and not value.startswith('#'):
                    failures.append('External SVG reference')
    live = json.loads((BASE/'live-comparison.json').read_text(encoding='utf-8'))
    live_matches = sum(p.get('matches_baseline_after_documented_normalization',False) for p in live['pages'])
    result = {
        'date_kst':'2026-10-08','baseline_commit':baseline['baseline_commit'],
        'status':'passed' if not failures else 'failed','failures':failures,
        'snapshot_and_worktree_files_checked':len(baseline['files']),
        'tracked_source_unchanged':diff.returncode == 0,
        'standalone_page_documents':len(page_docs),'auxiliary_html_documents':4,
        'original_main_text_preserved':source_validation['all_source_text_preserved'],
        'embedded_document_image_elements':sum(d.image_count for d in parsed.values()),
        'local_document_links_checked':local_links_checked,
        'browser_capture_count':len(browser['captures']),
        'browser_check_count':len(browser['checks']),
        'mobile_layout_documents_checked':len(mobile)+len(auxiliary),
        'production_pages_matching_after_documented_normalization':live_matches,
        'logo_count':len(logo_files),'logo_silhouettes_identical':paths[0]==paths[1]==paths[2],
        'deployment_build':{'command':'node scripts/build-pages.mjs 17940ae','result':'passed',
                            'details':'11 HTML files and 31 referenced image assets; executed separately by root agent.'},
        'verification_limits':['No real Formspree submission or email sent.',
                               'Responsive viewports tested; no physical touch-device, Safari or Firefox test.',
                               'Product performance/patent/first-in-market claims preserved, not independently substantiated.',
                               'novascroll and Pretendard are future specifications, not installed.',
                               'Print CSS inspected; no paper/PDF pagination guarantee.']
    }
    (BASE/'validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    artifact_files = [p for p in BASE.rglob('*') if p.is_file() and p != BASE/'archive-manifest.json' and '__pycache__' not in p.parts]
    artifact_files += logo_files + [REPO/'tools/build_documents.py']
    artifact = {'date_kst':'2026-10-08','baseline_commit':baseline['baseline_commit'],
                'paths_relative_to':'repository root','self_excluded':'docs/preservation/2026-10-08/archive-manifest.json',
                'files':[{'path':p.relative_to(REPO).as_posix(),'bytes':p.stat().st_size,'sha256':digest(p)} for p in sorted(set(artifact_files))]}
    artifact['file_count'] = len(artifact['files'])
    (BASE/'archive-manifest.json').write_text(json.dumps(artifact,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    for output in OUTPUTS:
        assert output.is_file()
    print(json.dumps({k:v for k,v in result.items() if k not in ('verification_limits','deployment_build')},ensure_ascii=False))
    if failures:
        raise SystemExit(1)

if __name__ == '__main__':
    main()
