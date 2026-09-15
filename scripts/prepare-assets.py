"""Copy generated originals and prepare web delivery; never repaint image content."""
import json
import shutil
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
entries = json.loads((ROOT / 'artwork/generation-log.json').read_text(encoding='utf-8-sig'))
report = []
for entry in entries:
    # Prefer the portable project copy; originPath is provenance, not a dependency.
    local_original = ROOT / 'artwork' / (entry['id'] + '.png')
    recorded_original = Path(entry['source'])
    if not recorded_original.is_absolute():
        recorded_original = ROOT / recorded_original
    original = local_original if local_original.exists() else recorded_original
    target = ROOT / 'public/assets' / entry['target']
    target.parent.mkdir(parents=True, exist_ok=True)
    copy = ROOT / 'artwork' / (entry['id'] + '.png')
    if not copy.exists():
        shutil.copy2(original, copy)
    with Image.open(original) as source:
        if any(kind in entry['target'] for kind in ('items/', 'characters/', 'tools/', 'effects/')):
            if 'A' not in source.getbands() or source.getchannel('A').getextrema()[0] != 0:
                raise ValueError(f"Actual transparent background missing: {entry['id']}")
        size = (1920, 1440) if '/background' in entry['target'] else (256, 256) if entry['target'].startswith('effects/') else (512, 512)
        wrong_size = False
        if target.exists():
            with Image.open(target) as current:
                wrong_size = current.size != size
        if not target.exists() or wrong_size:
            if '/background' in entry['target']:
                delivered = ImageOps.fit(source, size, Image.Resampling.LANCZOS)
            else:
                contained = ImageOps.contain(source, size, Image.Resampling.LANCZOS)
                delivered = Image.new('RGBA', size)
                delivered.paste(contained, ((size[0] - contained.width) // 2, (size[1] - contained.height) // 2))
            delivered.save(target, 'WEBP', quality=84, method=6)
        # Thumbnails are composed from the verified base-eight scene in the dev review UI.
        # An empty furniture image is not the activity thumbnail.
    with Image.open(target) as final:
        report.append({'id': entry['id'], 'path': str(target.relative_to(ROOT)), 'bytes': target.stat().st_size,
                       'size': final.size, 'alphaBounds': final.getchannel('A').point(lambda a: 255 if a >= 24 else 0).getbbox() if 'A' in final.getbands() else None})
(ROOT / 'artwork/asset-bounds.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
metrics = {e['id']: {'width': e['alphaBounds'][2] - e['alphaBounds'][0], 'height': e['alphaBounds'][3] - e['alphaBounds'][1]}
           for e in report if e['alphaBounds']}
(ROOT / 'src/data/art-metrics.json').write_text(json.dumps(metrics, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'assets': len(report), 'bytes': sum(e['bytes'] for e in report)}, ensure_ascii=False))
