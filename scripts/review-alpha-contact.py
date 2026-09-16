"""Inspect real alpha of selected project originals without altering them."""
import argparse,json
from pathlib import Path
from PIL import Image,ImageDraw
parser=argparse.ArgumentParser()
parser.add_argument('name')
parser.add_argument('ids',nargs='+')
args=parser.parse_args()
root=Path(__file__).resolve().parent.parent
sheet=Image.new('RGB',(1000,len(args.ids)*360))
draw=ImageDraw.Draw(sheet)
report=[]
for i,id in enumerate(args.ids):
    source=root/f'artwork/{id}.png'
    im=Image.open(source)
    alpha=im.getchannel('A') if 'A' in im.getbands() else None
    extrema=alpha.getextrema() if alpha else None
    bounds=alpha.point(lambda a:255 if a>=24 else 0).getbbox() if alpha else None
    report.append({'id':id,'mode':im.mode,'size':im.size,'alphaRange':extrema,'alphaBounds':bounds,'status':'awaiting-visual-review'})
    preview=im.convert('RGBA').crop(bounds) if bounds else im.convert('RGBA')
    preview.thumbnail((440,315))
    for j,bg in enumerate(['#efe9de','#303846']):
        x=j*500;y=i*360
        draw.rectangle((x,y,x+500,y+360),fill=bg)
        draw.text((x+10,y+8),id,fill='#15252b' if j==0 else '#ffffff')
        sheet.paste(preview,(x+(500-preview.width)//2,y+30+(315-preview.height)//2),preview)
sheet.save(root/f'output/qa/{args.name}.png')
(root/f'output/qa/{args.name}.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report))
