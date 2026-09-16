"""User-authorized finishing for reviewed convex books on neutral checkerboards.

Not suitable for neutral covers, holes, or concave objects. Preserve RGB, trace
the continuous coloured perimeter, then review both light and dark composites.
Usage: python scripts/extract-book-alpha.py textbook--shelf
"""
from pathlib import Path
import argparse
import json
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument('asset', choices=['textbook--shelf', 'notebook--shelf', 'homework-diary--shelf', 'document-folder--shelf'])
args = parser.parse_args()
source = ROOT / f'artwork/revisions/{args.asset}-v1.png'
output = ROOT / f'artwork/revisions/{args.asset}-local.png'
im = Image.open(source).convert('RGB')
rgb = np.asarray(im).astype(np.int16)
colour = rgb.max(2) - rgb.min(2) > 16
points = []
for y, row in enumerate(colour):
    xs = np.flatnonzero(row)
    if len(xs):
        points.extend([(int(xs[0]), y), (int(xs[-1]), y)])
points = sorted(set(points))
def cross(a, b, c):
    return (b[0]-a[0])*(c[1]-a[1]) - (b[1]-a[1])*(c[0]-a[0])
def half(seq):
    out = []
    for p in seq:
        while len(out)>1 and cross(out[-2],out[-1],p)<=0:
            out.pop()
        out.append(p)
    return out
boundary = half(points)[:-1]+half(reversed(points))[:-1]
if args.asset == 'document-folder--shelf':
    # The open edge has a shallow thumb notch: preserve it instead of filling its checkerboard.
    left, right = [], []
    for y, row in enumerate(colour):
        xs = np.flatnonzero(row)
        if len(xs) >= 3:
            left.append((int(xs[0]), y))
            right.append((int(xs[-1]), y))
    boundary = left + list(reversed(right))
mask = Image.new('L',(im.width*4,im.height*4))
ImageDraw.Draw(mask).polygon([(x*4,y*4) for x,y in boundary],fill=255)
mask = mask.resize(im.size,Image.Resampling.LANCZOS)
result = im.convert('RGBA')
result.putalpha(mask)
result.save(output)
assert np.array_equal(np.asarray(result)[:,:,:3],np.asarray(im))
contact = Image.new('RGB',(640,620))
draw = ImageDraw.Draw(contact)
preview = result.crop(mask.getbbox())
preview.thumbnail((300,590))
for i, bg in enumerate(['#efe9de','#303846']):
    draw.rectangle((i*320,0,(i+1)*320,620),fill=bg)
    contact.paste(preview,(i*320+(320-preview.width)//2,(620-preview.height)//2),preview)
contact.save(ROOT/f'output/qa/{args.asset}-alpha.png')
report = {'source':str(source.relative_to(ROOT)),'output':str(output.relative_to(ROOT)),
          'rgbUnchanged':True,'alphaBounds':mask.getbbox(),'boundary':boundary,
          'method':('row-traced coloured perimeter including thumb notch' if args.asset == 'document-folder--shelf' else 'convex coloured perimeter') + ', supersampled alpha; RGB unchanged',
          'status':'awaiting-visual-review'}
(ROOT/f'output/qa/{args.asset}-alpha.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k!='boundary'}))
