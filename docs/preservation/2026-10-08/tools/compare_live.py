"""Classify known edge-server transformations without discarding raw evidence."""
import difflib
import html
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

def decode_cf(value):
    raw = bytes.fromhex(value)
    return bytes(item ^ raw[0] for item in raw[1:]).decode('utf-8')

def normalize(content):
    content = re.sub(r'<script\b[^>]*\bsrc=["\'](?:https://static\.cloudflareinsights\.com/[^"\']+|/cdn-cgi/scripts/[^"\']+)["\'][^>]*>\s*</script>', '', content, flags=re.I)
    content = re.sub(r'/cdn-cgi/l/email-protection#([0-9a-f]+)', lambda m:'mailto:'+decode_cf(m[1]), content)
    content = re.sub(r'<span\b[^>]*data-cfemail=["\']([0-9a-f]+)["\'][^>]*>.*?</span>', lambda m:html.escape(decode_cf(m[1])), content, flags=re.S)
    content = re.sub(r'(styles\.css|script\.js)\?v=[^"\'\s>]+', r'\1', content)
    content = re.sub(r'>\s+<', '><', content)
    return re.sub(r'\s+', ' ', html.unescape(content)).strip()

def main():
    path = ROOT/'live-comparison.json'
    record = json.loads(path.read_text(encoding='utf-8-sig'))
    record['normalization'] = ['CSS/JS v query values', 'Cloudflare beacon and email-decoder scripts',
                               'Cloudflare email link/text obfuscation decoded', 'HTML whitespace and entities']
    for page in record['pages']:
        if page['status'] != 200:
            continue
        local = (ROOT/'snapshot'/f'{page["page"]}.html').read_text(encoding='utf-8')
        live = (ROOT/page['file']).read_text(encoding='utf-8')
        left, right = normalize(local), normalize(live)
        page['matches_baseline_after_documented_normalization'] = left == right
        if left != right:
            differences = list(difflib.unified_diff(local.splitlines(),live.splitlines(),fromfile='baseline',tofile='production',n=2))
            filename = f'evidence/live/{page["page"]}.diff.txt'
            (ROOT/filename).write_text('\n'.join(differences),encoding='utf-8')
            page['diff_file'] = filename
    path.write_text(json.dumps(record, ensure_ascii=False, indent=2)+'\n',encoding='utf-8')
    print(json.dumps({p['page']:p.get('matches_baseline_after_documented_normalization', False) for p in record['pages']}))

if __name__ == '__main__':
    main()
