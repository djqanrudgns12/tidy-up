"""Recover alpha for the three reviewed convex coloured boxes, preserving RGB.

Explicit user authorization: 2026-09-16, local background removal.
Not a general background remover: these inputs have neutral checkerboards and
continuous coloured outer borders. The closed convex hull preserves neutral
cream/white printed areas inside the object. Review every output visually.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent

def hull(points):
    points = sorted(set(points))
    def cross(a, b, c):
        return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
    def half(seq):
        out=[]
        for p in seq:
            while len(out)>1 and cross(out[-2],out[-1],p)<=0: out.pop()
            out.append(p)
        return out
    return half(points)[:-1]+half(reversed(points))[:-1]

report=[]
for name in ['board-game','puzzle-box','card-game']:
    source=ROOT/f'artwork/revisions/{name}--low-front-v2.png'
    output=ROOT/f'artwork/revisions/{name}--low-front-local.png'
    im=Image.open(source).convert('RGB')
    rgb=np.asarray(im).astype(np.int16)
    # Neutral checkerboard compression noise reaches 8; 16 isolates the border.
    colour=(rgb.max(2)-rgb.min(2))>16
    points=[]
    for y,row in enumerate(colour):
        xs=np.flatnonzero(row)
        if len(xs): points.extend([(int(xs[0]),y),(int(xs[-1]),y)])
    boundary=hull(points)
    mask=Image.new('L',(im.width*4,im.height*4))
    ImageDraw.Draw(mask).polygon([(x*4,y*4) for x,y in boundary],fill=255)
    mask=mask.resize(im.size,Image.Resampling.LANCZOS)
    result=im.convert('RGBA')
    result.putalpha(mask)
    result.save(output)
    assert np.array_equal(np.asarray(result)[:,:,:3],np.asarray(im))
    report.append({'id':name+'--low-front','source':str(source.relative_to(ROOT)),
        'output':str(output.relative_to(ROOT)),'rgbUnchanged':True,
        'alphaBounds':mask.getbbox(),'boundary':boundary,
        'method':'convex hull of continuous coloured exterior; 4x antialias; RGB unchanged',
        'status':'awaiting-visual-review'})
(ROOT/'output/qa/box-alpha-extraction.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps([{k:v for k,v in r.items() if k!='boundary'} for r in report],indent=2))
