"""User-authorized local finishing; original sources are not overwritten."""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
ROOT=Path(__file__).resolve().parent.parent

# Only the three alphabetic memory labels change. Keep the original RGBA edge,
# keypad geometry, numbers and arithmetic marks. Diffuse adjacent key colour
# into the bright lettering mask; no whole-key repainting.
source=Image.open(ROOT/'artwork/revisions/calculator-v1.png').convert('RGBA')
arr=np.array(source)
rgb=arr[:,:,:3].astype(float)
mask=np.zeros(arr.shape[:2],bool)
for x0,y0,x1,y1 in [(269,511,353,558),(422,511,518,558),(573,511,676,558)]:
    region=arr[y0:y1,x0:x1,:3]
    mask[y0:y1,x0:x1]=region.min(2)>150
mask=np.asarray(Image.fromarray((mask*255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9)))>0
for x0,y0,x1,y1 in [(265,507,357,562),(418,507,522,562),(569,507,680,562)]:
    local=mask[y0:y1,x0:x1]
    patch=rgb[y0:y1,x0:x1]
    patch[local]=np.median(patch[~local],axis=0)
for _ in range(60):
    avg=(np.roll(rgb,1,0)+np.roll(rgb,-1,0)+np.roll(rgb,1,1)+np.roll(rgb,-1,1))/4
    rgb[mask]=avg[mask]
arr[:,:,:3]=np.rint(rgb).clip(0,255).astype(np.uint8)
Image.fromarray(arr).save(ROOT/'artwork/revisions/calculator-local.png')

# Trace the reviewed closed paint case, including all three protruding latches.
im=Image.open(ROOT/'artwork/revisions/paint-set-v2.png').convert('RGBA')
assert im.size==(1254,1254)
maskim=Image.new('L',(im.width*4,im.height*4))
draw=ImageDraw.Draw(maskim)
def rounded(box,r): draw.rounded_rectangle(tuple(v*4 for v in box),radius=r*4,fill=255)
rounded((44,383,1208,865),55)
rounded((154,371,273,426),10)
rounded((986,371,1109,426),10)
rounded((545,829,711,879),14)
maskim=maskim.resize(im.size,Image.Resampling.LANCZOS)
im.putalpha(maskim)
im.save(ROOT/'artwork/revisions/paint-set-local.png')
(ROOT/'output/qa/primary-local-finishing.json').write_text(json.dumps({
  'calculator':{'source':'artwork/revisions/calculator-v1.png','output':'artwork/revisions/calculator-local.png','changedPixels':int(mask.sum()),'alphaPreserved':True,'method':'local memory-label inpainting'},
  'paint-set':{'source':'artwork/revisions/paint-set-v2.png','output':'artwork/revisions/paint-set-local.png','method':'traced outer closed-case silhouette; RGB unchanged'},
  'authorization':'User explicitly approved local background removal and efficient judgment on 2026-09-16',
  'status':'awaiting-visual-review'
},indent=2)+'\n',encoding='utf-8')
