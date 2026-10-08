"""Freeze the approved Git baseline; never modify the production source files."""
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import subprocess
import tarfile

ROOT = Path(__file__).resolve().parents[4]
OUT = Path(__file__).resolve().parents[1]
COMMIT = '17940aeff93b3ea17179a9a9048886e3b8ee6ed8'

def sha(data):
    return hashlib.sha256(data).hexdigest()

def main():
    revision = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    if revision != COMMIT:
        raise RuntimeError('HEAD no longer matches the approved baseline')
    archive = subprocess.check_output(['git', 'archive', '--format=tar', COMMIT], cwd=ROOT)
    snapshot = OUT / 'snapshot'
    rows = []
    with tarfile.open(fileobj=io.BytesIO(archive)) as tar:
        for member in tar.getmembers():
            path = PurePosixPath(member.name)
            if path.is_absolute() or '..' in path.parts:
                raise RuntimeError('Unsafe archive path')
            if member.isdir():
                continue
            if not member.isfile():
                raise RuntimeError('Unexpected archive entry: ' + member.name)
            data = tar.extractfile(member).read()
            dest = snapshot.joinpath(*path.parts)
            dest.parent.mkdir(parents=True, exist_ok=True)
            if dest.exists() and dest.read_bytes() != data:
                raise RuntimeError('Frozen snapshot differs: ' + member.name)
            if not dest.exists():
                dest.write_bytes(data)
            current = ROOT.joinpath(*path.parts).read_bytes()
            rows.append({'path': member.name, 'bytes': len(data), 'sha256': sha(data),
                         'worktree_sha256': sha(current)})
    manifest = {'schema_version': 1, 'date_kst': '2026-10-08', 'baseline_commit': COMMIT,
                'repository': 'https://github.com/edimsol/nova-solution-website',
                'source': 'git archive of the approved commit; exact Git blob bytes',
                'worktree_hash_note': 'Working-tree hashes separately retain checkout line-ending differences.',
                'file_count': len(rows), 'total_bytes': sum(r['bytes'] for r in rows),
                'files': rows}
    manifest_path = OUT / 'baseline-manifest.json'
    if manifest_path.exists():
        prior = json.loads(manifest_path.read_text(encoding='utf-8'))
        if prior != manifest:
            raise RuntimeError('Existing baseline manifest differs; do not overwrite')
    else:
        manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Frozen {len(rows)} files, {manifest["total_bytes"]:,} bytes, commit {COMMIT[:7]}')

if __name__ == '__main__':
    main()
