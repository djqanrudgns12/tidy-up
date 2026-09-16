"""Record explicitly selected, visually reviewed local assets in the delivery ledger.

Does not decide visual approval. Run only after inspecting each original and its
light/dark alpha composite, and record the actual review in --review.
"""
import argparse,json
from pathlib import Path
from PIL import Image
parser=argparse.ArgumentParser()
parser.add_argument('--review',required=True)
parser.add_argument('ids',nargs='+')
args=parser.parse_args()
root=Path(__file__).resolve().parent.parent
ledgerPath=root/'artwork/generation-log.json'
ledger=json.loads(ledgerPath.read_text(encoding='utf-8-sig'))
for id in args.ids:
    receiptPath=root/f'artwork/receipts/{id}.json'
    receipt=json.loads(receiptPath.read_text(encoding='utf-8-sig'))
    source=root/f'artwork/{id}.png'
    with Image.open(source) as im:
        im.load()
        if receipt['target'].startswith(('items/','characters/','effects/','tools/')):
            assert 'A' in im.getbands() and im.getchannel('A').getextrema()[0]==0, id
    receipt.update(source=f'artwork/{id}.png',status='integrated-source',review=args.review)
    receiptPath.write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    ledger=[entry for entry in ledger if entry['id']!=id]+[receipt]
ledgerPath.write_text(json.dumps(ledger,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'accepted':args.ids,'review':args.review},ensure_ascii=False))
