# 2026-09-16 두 번째 데스크톱 인계

사용자가 중간 점검 뒤 다른 데스크톱에서 계속하겠다고 요청하여 제작을 중단했다. 다음 `이어서 해`는 기존 구현 승인을 이어받는다. 추가 질문이나 이전 대화 접근 없이 아래에서 재개한다. 날짜는 다음 환경의 실제 날짜로 확인한다.

## 보존 상태

- 필수 원화112개 중107개를 프로젝트에 보존했다. 반영 완료92개, 검수·수정·반영 대기15개, 미생성5개다. 배포 이미지는98/121, 누락23개(미반영 원화15 + 미생성5 + 썸네일3)다.
- 새 생성 결과6개까지 `artwork/*.png`, `artwork/revisions/*-v1.png`, `artwork/receipts/*.json`에 복사했다. 출처 절대 경로는 기록일 뿐 재개 의존성이 아니다. 묶음 기록은 `artwork/revisions/final-six-ingest.json`, 직전9개는 `shoe-and-hanging-ingest.json`이다.
- 사용 가능한 공간6개: 내 책상, 교실 수납장, 사물함, 도서관, 공부 책상, 침실. 옷장·거실·신발장은 아직 활성화하지 않았다.
- 생성 도구의 진행 중 작업은 남아 있지 않다. 새 원화를 요청하지 말고 보존된15개부터 검사한다. 생성 완료를 검수 완료로 간주하지 않는다.
- 커밋·푸시·배포는 하지 않았다. 새 파일도 많다. Git으로 이동할 때 현재 변경과 미추적 파일까지 보내야 한다. `.gitignore` 수정만으로 다른 컴퓨터에 전송되지는 않는다. ZIP은 필수가 아니다.

## 바로 할 일

1. 루트 `handoff.md` → STATUS → 이 문서 → WORK 순서로 읽는다. `npm ci`, `npm run check:handoff`로 전송 누락을 먼저 확인한다. 검사 전에 inventory를 재생성해 누락을 덮지 않는다.
2. 아래15개 원화를 검수하고 문제를 수정한다. 이전 원본을 보존한다. 사용자 승인으로 로컬 배경 제거/알파 후처리가 가능하다. 로컬 처리 승인을 다시 묻지 않는다.
3. 옷장 걸린 시점3개를 반영한 후, 이미 시작한 걸기 코드를 완성하고 옷장 실제 좌표·충돌·가림·42조합·브라우저 전체 흐름을 검수한다. 완료 전 공간을 켜지 않는다.
4. 새로 필요한 원화5개를 각각 승인된 주 원화를 참조해 생성한다. 거실·신발장도 실제 배경의 면을 측정하고 같은 기준으로 구현·검수한다.
5. 썸네일3개는 검증된 기본8개 정리 장면을 공통 렌더러로 합성한다. 전체 회귀·최종 PNG·복원·기기/교실 확인을 구분해 기록한다.

## 미반영15개와 미생성5개

| 구분 | ID | 현재 관찰 |
|---|---|---|
| 신발/용품6개 | sneakers, indoor-shoes, sandals, rain-boots, shoe-brush, shoehorn | `output/qa/shoes-primary.png`의 밝고 어두운 배경에서 검토했다. 실제 알파 있음. 아직 승인 ledger/public 반영 전. 장화는 높은 카메라에서 선 모습이므로 바닥/선반 시점 선택을 재확인한다. |
| 걸린 시점3개 | jacket--alternate-support, cardigan--alternate-support, hanger--alternate-support | `output/qa/wardrobe-hanging.png` 참고. jacket은 RGB에 격자가 구워져 있어 배경 제거 필요. cardigan/hanger는 실제 알파이며 육안으로 양호하나 접점·시점 최종 검수 전. |
| 새 물건4개 | umbrella-cover, remote, block-box, book-stand | 보존만 완료, 이미지 내용·알파 미검수. 독서대는 펼쳐 세운 정면 시점으로 생성했으므로 실제 렌더링 standing/접촉 깊이를 확인한다. |
| 배경2개 | living-room, shoe-cabinet | 보존만 완료, 가구·빈 공간·이동 물건 중복 포함 여부 및 실측 미검수. |
| 미생성5개 | block-box--low-front, sneakers--shelf-front, indoor-shoes--shelf-front, sandals--shelf-front, rain-boots--shelf-front | 주 원화의 색·형태를 유지한 추가 시점. `docs/ASSET_PROMPTS.json`의 pending과 일치해야 한다. |

재킷은 옷의 색/윤곽과 회색 금속 고리를 보존해야 한다. 단순 색 임계값으로 금속 고리를 지우거나 팔 아래 빈 공간을 채우지 않는다. 먼저 실제 원본을 확대 검사한다. 알파0 영역의 RGB가 도구 미리보기에서 번져 보일 수 있으므로 밝고 어두운 배경 합성으로 결함을 판단한다. 모든 이미지에 일괄 침식/배경 제거를 적용하지 않는다.

## 옷장 코드 — 진행 중이며 완료 아님

다음 공통 코드 변경을 보존했다. 이전 공간 구현을 통째로 되돌리지 않는다.

- `src/data/scene-art.ts`: `hasHangingView`, `hangingContact`, 걸린 시점 선택 추가. 고리 접촉 비율 jacket/cardigan=.014, hanger=.035는 임시값이다. 실제 원화의 고리 안쪽 최고점으로 다시 측정해야 한다.
- `src/domain/types.ts`: Surface의 `accepts`, `hangingBounds`, LoadedArt의 `hanging` 추가. `entryOffsetY`는 공부 책상에서 이미 검수한 서랍 기능이다.
- `src/domain/placement.ts`: 걸기 원화 비율을 반영하되 높이를 유지하고, 허용 물건/옷장 몸체 경계 검사를 추가했다. 옷장 전용 크기·실측 데이터는 아직 없다.
- `src/rendering/art.ts`: 걸린 시점 로드. `motion.ts`: `HangingTurn`, 회전 중심/자세 전환. `paint.ts`: 실제 두 원화를 혼합하는 걸기 전환, 고리 접점 기반 그리기/클릭 경계. `interaction.ts`, `Scene.tsx`: 끌기 중 시점 유지 및 약900ms 전환 연결.
- `src/data/wardrobe.ts`, 옷장 fixture/전용 테스트/검수 화면은 아직 만들지 않았다. 물리 맵 등록도 하지 않았다. 기존 테스트 통과가 새 걸기 동작의 시각 검수를 뜻하지 않는다.
- 고리와 봉의 앞뒤 가림, 꺼내기/걸기 전환의 중심 연속성, 옷의 겹침/문 관통 방지, 잘못된 물건 걸기 거부, 작은 충돌의 국소 보정을 구현·검수해야 한다.

옷장 배경에서 초벌로 관찰한 좌표(월드960×720, 미확정): 왼쪽 옷봉 x263~503/y92, 왼쪽 몸체 공간 x246~506/y54~380. 오른쪽 선반은 x521~766, 위 y155~163/중간 y253~271/아래 y350~383. 바닥 초기 배치는 대략 y435~710. 이를 그대로 승인 좌표로 복사하지 말고 실제 그림을 확인한다. 하나의 연속 봉 위에서 사용자가 고른 x를 유지하고 충돌만 국소 보정하는 방안을 검토 중이다. 고정 세 자리 자동 정렬은 요구와 맞지 않는다. 접힌 옷은 봉에 걸리지 않아야 한다.

## 재사용 도구와 검수 요령

- `scripts/review-alpha-contact.py 이름 ID...`: 밝고 어두운 배경 비교 PNG/JSON, 원본 수정 없음.
- `scripts/accept-reviewed-assets.py --review '실제 검수 내용' ID...`: 실제 승인한 원화의 receipt/ledger 갱신. public 생성은 별도다.
- `scripts/prepare-assets.py`: 이미지·크기/알파 경계 갱신. 기존 public이 올바른 크기면 건너뛴다. 원본을 수정한 경우 기존 public을 revisions에 보존한 뒤 새로 만든다.
- `scripts/finish-reviewed-fringe.py`: 실제 결함이 확인된 원화에만 적용할 알파 후처리. 만능 배경 제거기가 아니다.
- Python3+Pillow(+후처리 시 numpy) 필요. 이전 컴퓨터의 Python 절대 경로를 복사하지 않는다.
- 완료 공간의 fixture/test/proof를 구조 참고로 사용한다. 가구 좌표를 복사하지 않는다. 개발용 `?home-desk-layout` 등 실제 경로 이름은 `src/main.tsx`에서 확인한다.
- 브라우저 배치 시 물건 선택 → `여기에 놓기` → 캔버스 클릭 순서다. 서랍 입구 좌표와 안쪽 안착 좌표는 다르다. 화면 크기를 읽어960×720 월드 좌표를 변환한다.
- 42조합 검수 화면의 저장 링크는 각 PNG를 개별로 읽고 디코딩 검사한다. 긴 data URL 여러 개를 한 번에 출력하면 잘릴 수 있다.
- 침실/공부 책상은42조합·실제 전체 흐름·꺼내기/넣기·PNG·이어하기까지 검수했다. 사물함의 최근 버전 결과 화면 이어하기는 별도 확인이 필요하다. 실제 다운로드 파일 재열기, 실기기/프로젝터/교실 리허설은 확인한 범위만 기록한다.

## 전송과 재개 확인

`artwork`, `artwork/receipts`, `artwork/revisions`, `public`, `output/qa`, `src`, `scripts`, `docs`, 루트 문서·설정 및 기존 sample/PDF를 함께 보낸다. node_modules/dist/cache/전달 ZIP은 재생성 가능하다. Git으로 보내는 경우 사용자가 커밋·푸시한 뒤 다음 데스크톱에서 pull하고 `check:handoff`부터 실행한다. 새 LLM은 이전 탭·도구 cell ID·생성 폴더·대화 기록에 의존하지 않는다.

## 이동 직전 확인 — 2026-09-16 13:44 KST

원화107개 전체 디코딩·해시/문서 연결 검사 통과. 67테스트/13파일 및 typecheck 포함 빌드 통과. 에셋 검사는98/121로23개 누락 때문에 실패하며 invalid/unused는0이다. 옷장 진행 코드는 컴파일되지만 전용 동작/시각 검수 전이다. 기록: `output/qa/desktop-transfer-review.json`(프로젝트 루트 기준).
