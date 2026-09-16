"""Remove the inspected jacket checkerboard; preserve source RGB and original.

The coloured fabric mask is separate from the manually traced neutral metal
hook. Exterior flood fill preserves both open underarm gaps and the hook gap.
This is deliberately specific to jacket--alternate-support-v1.png.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

root = Path(__file__).resolve().parent.parent
source = root / 'artwork/revisions/jacket--alternate-support-v1.png'
im = Image.open(source).convert('RGB')
assert im.size == (1254, 1254), 'Trace coordinates belong to the reviewed original'
rgb = np.asarray(im).astype(np.int16)
colour = (rgb.max(2) - rgb.min(2) > 14)
colour[:173] = False
mask = Image.fromarray((colour * 255).astype('uint8')).filter(ImageFilter.MedianFilter(3))
# Trace both edges of the open hook, not a filled oval or a colour threshold.
hook = [(561,76),(572,65),(581,48),(593,36),(608,28),(624,25),(640,27),
        (654,34),(665,47),(672,62),(675,77),(672,93),(665,106),(652,118),
        (639,128),(635,139),(635,174),(624,174),(624,139),(627,126),
        (638,114),(652,103),(661,91),(665,77),(663,63),(657,51),(647,41),
        (635,36),(623,35),(610,37),(600,43),(590,54),(582,68),(574,78),(568,84)]
hi = Image.new('L', (im.width * 4, im.height * 4))
ImageDraw.Draw(hi).polygon([(x*4,y*4) for x,y in hook], fill=255)
hook_mask = hi.resize(im.size, Image.Resampling.LANCZOS)
mask = Image.fromarray(np.maximum(np.asarray(mask), np.asarray(hook_mask)))
exterior = mask.point(lambda p: 255 if p > 100 else 0)
ImageDraw.floodfill(exterior, (0,0), 128)
alpha = np.asarray(mask).copy()
alpha[np.asarray(exterior) == 0] = 255
result = im.convert('RGBA')
result.putalpha(Image.fromarray(alpha))
target = root / 'artwork/revisions/jacket--alternate-support-local.png'
result.save(target)
assert np.array_equal(np.asarray(result)[:,:,:3], np.asarray(im))
report = {'source':str(source.relative_to(root)), 'output':str(target.relative_to(root)),
          'rgbUnchanged':True, 'method':'fabric colour perimeter plus traced open metal hook; exterior gaps retained',
          'status':'awaiting-visual-review'}
(root/'output/qa/jacket-alpha.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report))
