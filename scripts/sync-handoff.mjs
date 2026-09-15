import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { catalog } from '../src/data/catalog.ts';
import { maps } from '../src/data/maps.ts';
import { assetViews } from '../src/data/asset-views.ts';
import { physicalMaps } from '../src/data/physical.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8').replace(/^\uFEFF/, ''));
const exists = p => fs.existsSync(path.join(root, p));
const log = read('artwork/generation-log.json');
const integrated = new Set(log.map(e => e.id));
const review = read('artwork/resumed-review.json');
const receipts = fs.readdirSync(path.join(root, 'artwork/receipts')).filter(p => p.endsWith('.json')).map(p => read(`artwork/receipts/${p}`));
const byId = new Map(receipts.map(e => [e.id, e]));
const required = [
  ...catalog.map(a => ({id:a.id, kind:'primary-object', target:a.path})),
  ...assetViews.map(a => ({id:`${a.asset}--${a.view}`, kind:'support-view', target:a.path})),
  ...maps.flatMap(m => [{id:m.id,kind:'background',target:`assets/maps/${m.id}/background.webp`},{id:`${m.id}--thumbnail`,kind:'thumbnail',target:`assets/maps/${m.id}/thumbnail.webp`}]),
  ...['rabbit','bear','cat','bird'].map(id=>({id,kind:'character',target:`assets/characters/${id}.webp`})),
  ...['duster','broom','cloth'].map(id=>({id,kind:'tool',target:`assets/tools/${id}.webp`})),
  ...['dust','stain'].map(id=>({id,kind:'effect',target:`assets/effects/${id}.webp`})),
];
// Older common sprites may use a different receipt id. Match their exact target.
const byTarget = new Map(receipts.map(e => [`assets/${e.target}`, e]));
const assets = required.map(a => {
  const r = byId.get(a.id) ?? byTarget.get(a.target);
  const source = r ? `artwork/${r.id}.png` : null;
  const sourcePresent = Boolean(source && exists(source));
  const delivered = exists(`public/${a.target}`);
  const revision = review.needsRevision[a.id] ?? null;
  const preliminaryVisualReview = review.acceptedPrimaryVisuals.includes(a.id);
  const status = a.kind === 'thumbnail'
    ? (a.id === 'classroom-cabinet--thumbnail' && delivered ? 'draft-replace' : delivered ? 'delivered' : 'needs-composition')
    : revision && sourcePresent ? 'needs-revision'
    : sourcePresent && integrated.has(r.id) && delivered ? 'integrated-source'
    : sourcePresent ? preliminaryVisualReview ? 'visual-reviewed-awaiting-integration' : 'generated-awaiting-review'
    : 'not-generated';
  return {...a, source, sourcePresent, delivered, status, revision,
    receipt:r ? `artwork/receipts/${r.id}.json` : null,
    sha256:sourcePresent ? crypto.createHash('sha256').update(fs.readFileSync(path.join(root,source))).digest('hex') : null};
});
const summary = {
  implementedMapIds: Object.keys(physicalMaps),
  requiredDeliveryFiles:assets.length,
  deliveredFiles:assets.filter(a=>a.delivered).length,
  missingDeliveryFiles:assets.filter(a=>!a.delivered).length,
  requiredOriginals:assets.filter(a=>a.kind!=='thumbnail').length,
  localOriginals:assets.filter(a=>a.sourcePresent).length,
  notGeneratedOriginals:assets.filter(a=>a.kind!=='thumbnail'&&!a.sourcePresent).length,
  generatedAwaitingReviewOrIntegration:assets.filter(a=>['generated-awaiting-review','visual-reviewed-awaiting-integration','needs-revision'].includes(a.status)).length,
  knownRevisions:assets.filter(a=>a.status==='needs-revision').length,
  missingThumbnails:assets.filter(a=>a.status==='needs-composition').length,
  draftThumbnailsToReplace:assets.filter(a=>a.status==='draft-replace').length,
};
fs.mkdirSync(path.join(root,'docs/wiki'),{recursive:true});
fs.writeFileSync(path.join(root,'docs/wiki/asset-state.json'),JSON.stringify({schemaVersion:1,generatedAt:new Date().toISOString(),summary,assets},null,2)+'\n');
fs.writeFileSync(path.join(root,'docs/wiki/STATUS.md'),`# 현재 구현 상태\n\n이 파일은 \`npm run handoff:sync\`로 생성한다. 에셋 수량은 파일 검사 결과이며 시각 품질 승인을 뜻하지 않는다.\n\n## 구현\n\n- 전체 프로젝트 미완료. 목표: 9개 공간, 물건 72종, 추가 시점 22개, 배포 이미지 121개.\n- 실측 데이터가 연결된 공간: ${summary.implementedMapIds.length}개 (${summary.implementedMapIds.join(", ")}). 실제 활동 승인 범위는 검수 기록과 대조한다.\n- 수납장은 배경과 바구니 구멍 가림 시험만 준비됨. 실제 지지면·시점 연결·수납 경로·42조합 검수가 필요하다.\n- 책상: 분류 → 추가 물건 0~3개 → 정리 → 청소 → 퀴즈 → PNG 흐름 구현. 작은 밀림, 두 겹 포개기, 가림, 접촉 그림자, 복원 구현.\n\n## 실제 파일 수\n\n| 항목 | 수 |\n|---|---:|\n| 원본 PNG | ${summary.localOriginals} / ${summary.requiredOriginals} |\n| 아직 생성하지 않은 원화 | ${summary.notGeneratedOriginals} |\n| 생성 후 검수·수정·통합 대기 | ${summary.generatedAwaitingReviewOrIntegration} |\n| 알려진 원화 수정 건 | ${summary.knownRevisions} |\n| public 배포 이미지 존재 | ${summary.deliveredFiles} / ${summary.requiredDeliveryFiles} |\n| public 누락 | ${summary.missingDeliveryFiles} |\n| 새로 합성할 썸네일 | ${summary.missingThumbnails} |\n| 교체할 임시 썸네일 | ${summary.draftThumbnailsToReplace} |\n\n## 읽을 곳\n\n- [재개 절차](../../handoff.md)\n- [다음 작업과 완료 조건](WORK.md)\n- [에셋 작업 절차](ASSETS.md)\n- [기계 판독용 파일 목록](asset-state.json)\n- [검수 근거와 한계](VERIFICATION.md)\n\n이전 이미지 생성 429 오류 뒤 정상 생성이 재개되었다. 9월 21일까지 기다려야 한다는 과거 안내는 폐기한다. 사용자 요청으로 인계를 위해 제작을 멈췄으며 한도 때문에 멈춘 상태가 아니다. 다음 생성 요청이 실제로 실패하면 그 응답을 새로 기록한다.\n`);
console.log(JSON.stringify(summary,null,2));

