"""Reviewed v2 silhouette extraction; preserve original RGB and all revisions."""
from pathlib import Path
import json
import numpy as np
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parent.parent
source=root/'artwork/revisions/block-box--low-front-v2.png'
im=Image.open(source).convert('RGB')
# Trace the actual outer rim, clips and rounded bottom, not the inner lid motif.
boundary=[(48,366),(51,343),(61,321),(81,302),(101,288),(127,279),(176,279),(183,286),(1346,286),(1352,279),(1403,279),(1429,288),(1451,304),(1471,327),(1484,351),(1488,375),(1485,388),(1461,396),(1465,418),(1461,432),(1437,438),(1427,723),(1423,748),(1411,771),(1392,787),(1367,797),(1342,800),(194,800),(165,796),(143,786),(127,772),(116,754),(111,734),(98,438),(74,430),(70,416),(73,395),(55,390),(48,381)]
mask=Image.new('L',(im.width*4,im.height*4))
ImageDraw.Draw(mask).polygon([(x*4,y*4) for x,y in boundary],fill=255)
mask=mask.resize(im.size,Image.Resampling.LANCZOS)
out=im.convert('RGBA');out.putalpha(mask)
out.save(root/'artwork/revisions/block-box--low-front-local.png')
out.save(root/'artwork/block-box--low-front.png')
assert np.array_equal(np.asarray(out)[:,:,:3],np.asarray(im))
(root/'output/qa/block-front-extraction.json').write_text(json.dumps({'source':str(source.relative_to(root)),'method':'reviewed 4x antialiased exterior trace','rgbUnchanged':True,'boundary':boundary},indent=2)+'\n',encoding='utf-8')
