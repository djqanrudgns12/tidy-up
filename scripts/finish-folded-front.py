"""Extract the four inspected coloured folded garments from neutral backgrounds.

These silhouettes have no through holes. Trace each column, retaining the
concave collar outline; preserve RGB and the generated v1 source.
"""
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
root=Path(__file__).resolve().parent.parent
report=[]
for id in ['t-shirt','long-sleeve','trousers','shorts']:
    name=id+'--folded-front'
    source=root/f'artwork/revisions/{name}-v1.png'
    im=Image.open(source).convert('RGB')
    rgb=np.asarray(im).astype(np.int16)
    colour=Image.fromarray(((rgb.max(2)-rgb.min(2)>18)*255).astype('uint8')).filter(ImageFilter.MedianFilter(3))
    top,bottom=[],[]
    for x,column in enumerate(np.asarray(colour).T):
        ys=np.flatnonzero(column)
        if len(ys)>=3:
            top.append((x,int(ys[0])));bottom.append((x,int(ys[-1])))
    boundary=top+bottom[::-1]
    mask=Image.new('L',(im.width*2,im.height*2))
    ImageDraw.Draw(mask).polygon([(x*2,y*2) for x,y in boundary],fill=255)
    mask=mask.resize(im.size,Image.Resampling.LANCZOS)
    result=im.convert('RGBA');result.putalpha(mask)
    result.save(root/f'artwork/revisions/{name}-local.png')
    result.save(root/f'artwork/{name}.png')
    assert np.array_equal(np.asarray(result)[:,:,:3],np.asarray(im))
    report.append({'id':name,'original':str(source.relative_to(root)), 'rgbUnchanged':True,'alphaBounds':mask.getbbox(),
      'method':'column-traced coloured cloth silhouette, including concave collar; RGB unchanged','status':'awaiting-visual-review'})
(root/'output/qa/folded-front-extraction.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report))
