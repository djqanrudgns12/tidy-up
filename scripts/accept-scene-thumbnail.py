"""Encode an explicitly reviewed common-renderer base-eight export, not empty furniture."""
import argparse,json
from pathlib import Path
from datetime import date
from PIL import Image
p=argparse.ArgumentParser();p.add_argument('map',choices=['wardrobe','living-room','shoe-cabinet']);p.add_argument('--review',required=True);args=p.parse_args()
root=Path(__file__).resolve().parent.parent
source=f'output/qa/{args.map}-base-thumbnail-source.png'
with Image.open(root/source) as im:
    assert im.size==(960,720),im.size
    im.resize((480,360),Image.Resampling.LANCZOS).save(root/f'public/assets/maps/{args.map}/thumbnail.webp','WEBP',quality=84,method=6)
receipt={'id':args.map+'--thumbnail','source':source,'target':f'maps/{args.map}/thumbnail.webp','status':'reviewed-composition','date':str(date.today()),'review':args.review}
(root/f'artwork/receipts/{args.map}--thumbnail.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(receipt))
