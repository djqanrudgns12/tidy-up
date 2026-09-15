"""Build a portable project handoff; excludes dependencies, secrets and prior archives."""
import hashlib
import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'output' / 'transfer'
OUT.mkdir(parents=True, exist_ok=True)
TARGET = OUT / 'Cleaning-handoff.zip'
excluded_dirs = {'node_modules', '.git', '__pycache__', '.venv', '.cache'}
files = []
for file in sorted(ROOT.rglob('*')):
    if not file.is_file():
        continue
    relative = file.relative_to(ROOT)
    if any(part in excluded_dirs for part in relative.parts):
        continue
    if relative.parts[:2] == ('output', 'transfer'):
        continue
    if file.name.startswith('.env') or file.suffix in {'.log', '.pyc'}:
        continue
    files.append((file, relative.as_posix()))

manifest = [{'path': relative, 'bytes': file.stat().st_size,
             'sha256': hashlib.sha256(file.read_bytes()).hexdigest()}
            for file, relative in files]
manifest_text = json.dumps({'entrypoint': 'handoff.md', 'files': manifest}, ensure_ascii=False, indent=2)
with zipfile.ZipFile(TARGET, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=3) as archive:
    for file, relative in files:
        archive.write(file, 'Cleaning/' + relative)
    archive.writestr('Cleaning/TRANSFER_MANIFEST.json', manifest_text)
with zipfile.ZipFile(TARGET) as archive:
    broken = archive.testzip()
    if broken:
        raise ValueError('Archive CRC failed: ' + broken)
    for entry in manifest:
        actual = hashlib.sha256(archive.read('Cleaning/' + entry['path'])).hexdigest()
        if actual != entry['sha256']:
            raise ValueError('Archive content mismatch: ' + entry['path'])
    state = json.loads(archive.read('Cleaning/docs/wiki/asset-state.json'))
    for asset in state['assets']:
        if asset['sourcePresent']:
            original = archive.read('Cleaning/' + asset['source'])
            assert hashlib.sha256(original).hexdigest() == asset['sha256'], asset['id']
(OUT / 'TRANSFER_MANIFEST.json').write_text(manifest_text + '\n', encoding='utf-8')
summary = {'archive': TARGET.relative_to(ROOT).as_posix(), 'files': len(files),
           'bytes': TARGET.stat().st_size, 'originalsVerified': state['summary']['localOriginals'],
           'sha256': hashlib.sha256(TARGET.read_bytes()).hexdigest(), 'verification': 'CRC and all file SHA-256 passed'}
(OUT / 'package-report.json').write_text(json.dumps(summary, indent=2) + '\n', encoding='utf-8')
print(json.dumps(summary))
