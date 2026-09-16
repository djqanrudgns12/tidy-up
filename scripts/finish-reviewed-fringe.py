"""Alpha-only cleanup for explicitly inspected generated originals.

Requires per-asset receipts and preserved v1 source. Never accepts a source into
the delivery ledger automatically; inspect the resulting contact sheet first.
"""
import argparse,json
from pathlib import Path
import numpy as np
from PIL import Image,ImageFilter
p=argparse.ArgumentParser();p.add_argument('ids',nargs='+');args=p.parse_args()
root=Path(__file__).resolve().parent.parent
for id in args.ids:
 source=root/f'artwork/revisions/{id}-v1.png'
 im=Image.open(source).convert('RGBA');a=np.array(im);alpha=a[:,:,3].copy()
 rgb=a[:,:,:3].astype(int)
 edge=np.asarray(Image.fromarray(alpha).filter(ImageFilter.MinFilter(17)))<200
 fringe=edge&(rgb.max(2)>220)&((rgb.max(2)-rgb.min(2))>145)
 alpha[fringe]=0
 mask=Image.fromarray(alpha).filter(ImageFilter.MinFilter(7)).filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(.55))
 a[:,:,3]=np.minimum(np.asarray(mask),a[:,:,3])
 Image.fromarray(a).save(root/f'artwork/revisions/{id}-local.png')
 Image.fromarray(a).save(root/f'artwork/{id}.png')
 receipt=root/f'artwork/receipts/{id}.json';data=json.loads(receipt.read_text(encoding='utf-8'))
 data.update(revision=f'artwork/revisions/{id}-local.png',localFinishing={'rgbUnchanged':True,'changedAlphaPixels':int((a[:,:,3]!=np.asarray(im)[:,:,3]).sum()),'method':'remove tiny edge fringe and jagged alpha only','status':'awaiting-visual-review'})
 receipt.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(id)
