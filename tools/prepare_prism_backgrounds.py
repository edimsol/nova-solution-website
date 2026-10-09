"""Export generated originals as bounded, metadata-free progressive sRGB JPEGs."""
from pathlib import Path
from PIL import Image, ImageOps, ImageCms
import hashlib, json, shutil, io
from reference_paths import ROOT, DOCS_ROOT, manifest_path, resolve_source_path

config = json.loads((ROOT / 'tools/prism-background-sources.json').read_text())
out = ROOT / 'assets/backgrounds/prism'
originals = DOCS_ROOT / 'renewal/prism-phase-2/originals'
out.mkdir(parents=True, exist_ok=True)
originals.mkdir(parents=True, exist_ok=True)
manifest = {'generator': 'built-in image_gen', 'targetResolution': [3840,2160], 'upscaled': False, 'images': []}
for item in config['images']:
    original = originals / (item['name'] + '.png')
    source = resolve_source_path(item['source'])
    if source.resolve() != original.resolve(): shutil.copy2(source, original)
    image = Image.open(original)
    if image.info.get('icc_profile'):
        image = ImageCms.profileToProfile(image, ImageCms.ImageCmsProfile(io.BytesIO(image.info['icc_profile'])), ImageCms.createProfile('sRGB'), outputMode='RGB')
    else: image = image.convert('RGB')
    record = {'name': item['name'], 'original': manifest_path(original), 'resolution': list(image.size), 'sha256': hashlib.sha256(original.read_bytes()).hexdigest(), 'prompt': item['prompt'], 'files': []}
    variants = [(str(w), image.resize((w, round(image.height*w/image.width)), Image.Resampling.LANCZOS), 150000 if w<=640 else 450000) for w in (640,1280,image.width) if w<=image.width]
    variants.append(('portrait-640',ImageOps.fit(image,(640,900),Image.Resampling.LANCZOS,centering=(.69,.5)),150000))
    for suffix, rendered, budget in variants:
        path = out / f"{item['name']}-{suffix}.jpg"
        for quality in range(88,54,-2):
            buffer = io.BytesIO()
            rendered.save(buffer, 'JPEG', quality=quality, optimize=True, progressive=True, subsampling=0)
            if buffer.tell() <= budget: break
        if buffer.tell()>budget: raise RuntimeError(f'Image exceeds budget: {path}')
        path.write_bytes(buffer.getvalue())
        record['files'].append({'path':str(path.relative_to(ROOT)).replace('\\','/'),'size':list(rendered.size),'bytes':path.stat().st_size,'quality':quality})
    manifest['images'].append(record)
    item['source'] = manifest_path(original)
(DOCS_ROOT/'renewal/prism-phase-2/background-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
(ROOT/'tools/prism-background-sources.json').write_text(json.dumps(config,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps([{'name':i['name'],'resolution':i['resolution'],'bytes':[f['bytes'] for f in i['files']]} for i in manifest['images']],indent=2))
