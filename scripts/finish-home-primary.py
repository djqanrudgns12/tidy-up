"""Remove reviewed generation fringe from five muted household sprites.

Explicitly authorized local finishing. Preserve source v1 and all RGB pixels;
only alpha at small external specks and jagged edges changes.
"""
import json,shutil
from pathlib import Path
import numpy as np
from PIL import Image,ImageFilter
root=Path(__file__).resolve().parent.parent
records=json.loads((root/'artwork/revisions/home-primary-ingest.json').read_text(encoding='utf-8'))
report=[]
for record in records:
    id=record['id']
    source=Path(record['originPath'])
    original=root/f'artwork/revisions/{id}-v1.png'
    if not original.exists(): shutil.copy2(source,original)
    im=Image.open(original).convert('RGBA')
    a=np.array(im)
    alpha=a[:,:,3].copy()
    # All five inspected subjects have muted fabric/plastic; neon RGB is fringe.
    rgb=a[:,:,:3].astype(int)
    neon=(rgb.max(2)>220)&((rgb.max(2)-rgb.min(2))>145)
    alpha[neon]=0
    mask=Image.fromarray(alpha).filter(ImageFilter.MinFilter(7)).filter(ImageFilter.MaxFilter(7))
    mask=mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(.55))
    newalpha=np.minimum(np.array(mask),a[:,:,3])
    a[:,:,3]=newalpha
    output=root/f'artwork/revisions/{id}-local.png'
    Image.fromarray(a).save(output)
    shutil.copy2(output,root/f'artwork/{id}.png')
    record['revision']='artwork/revisions/'+id+'-local.png'
    (root/f'artwork/receipts/{id}.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    report.append({'id':id,'rgbUnchanged':True,'changedAlphaPixels':int((newalpha!=np.array(im)[:,:,3]).sum()),'status':'awaiting-visual-review'})
(root/'output/qa/home-primary-finishing.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(report)

