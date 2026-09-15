# 에셋 제작과 인계

## 상태를 읽는 법

정확한 전체 목록과 SHA-256은 [asset-state.json](asset-state.json), 생성 프롬프트는 [ASSET_PROMPTS.json](../ASSET_PROMPTS.json)이다.

| 상태 | 뜻 | 다음 행동 |
|---|---|---|
| not-generated | 로컬 원본이 없음 | 프롬프트 검토 후 생성 |
| generated-awaiting-review | 생성 원본만 보존 | 이미지 직접 확인, 알파/자세 검사 |
| visual-reviewed-awaiting-integration | 접촉 시트의 첫 시각 검수 통과 | 실제 크기·배치 확인 후 반영 |
| needs-revision | 알려진 결함 있음 | 원본 보존 후 별도 버전으로 수정 |
| integrated-source | ledger와 public에 반영 | 실제 공간의 접촉 검수와는 별개 |
| needs-composition | 썸네일 미제작 | 검증한 기본8개 장면 합성 |
| draft-replace | 수납장 임시 썸네일 | 빈 배경 대신 검증 장면으로 교체 |

**현재 파일 수와 새로 생성할 수량은 다르다.** public 누락에는 이미 생성되어 검수 대기 중인 PNG도 포함된다. public만 검사하고 중복 생성하지 않는다.

## 원화·기록 위치

- `artwork/<id>.png`: 프로젝트 안에 보존한 실제 원본. 다른 컴퓨터에서도 사용한다.
- `artwork/receipts/<id>.json`: 실제 프롬프트, 원본의 상대 경로, 최초 생성 경로, 배포 목표.
- `artwork/generation-log.json`: **반영된 원화만** 기록한 ledger. source는 프로젝트 상대 경로. originPath는 출처일 뿐이다.
- `artwork/resumed-review.json`: 이번 재개분의 첫 시각 검수와 수정5건.
- `artwork/resumed-generation-receipts.json`, `resumed-generation-batch2.json`: 초기 묶음의 과거 기록. canonical 상태는 개별 receipts와 asset-state다.
- `output/qa/resumed-batch2.png`, `resumed-current.png`: 초기 검수용 접촉 시트. 이후 생성분을 모두 포함하지 않는다.

## 알려진 수정5건

1. **picture-book**: 펼쳐진 그림책 → 닫힌 한 권. 곰과 강아지 그림을 표지 특징으로 유지.
2. **magazine**: 여러 권이 겹친 모습 → 닫힌 한 권. 한 번에 움직이는 물건 수와 맞춤.
3. **science-book**: ‘과학’ 글자가 생성됨 → 문자 없는 표지 원칙에 맞게 수정. 잎/우주 무늬 유지.
4. **ball**: 비치볼처럼 밸브와 부풀린 패널이 있음 → 학교에서 쓰는 무광 고무공.
5. **card-game**: 덮개가 비스듬히 분리된 형태 → 닫힌 상자로 수정 후 같은 디자인의 low-front 제작.

기존 파일을 삭제하지 않는다. `artwork/revisions/<id>-v2.png`처럼 버전을 보존하고 승인한 경로를 ledger에 반영한다. 소스 파일을 바꿨는데 배포 파일이 그대로일 수 있으므로 아래 스크립트의 주의점을 따른다.

## 생성 시 지킬 규칙

- 현재 환경에서 사용할 수 있는 imagegen 스킬을 읽고 내장 도구를 기본으로 사용한다. API/CLI 과금 경로는 사용자가 따로 선택하지 않았다.
- 한 물건/시점당 한 요청. 임의 스프라이트 시트를 만들거나 임시 SVG로 대체하지 않는다.
- 시점 변경은 실제 승인 원화를 먼저 보고 참조 이미지로 전달한다. 상자 디자인, 책 표지·책등 색, 신발 좌우 한 쌍을 유지한다.
- 참조 이미지가 없으면 새로 생성하기 전에 로컬 `artwork`를 확인한다. 생성 원본이 외부 폴더에만 남지 않도록 즉시 복사한다.
- 진짜 RGBA 알파, 전체 실루엣, 배경/바닥/바깥 그림자 없음. 접촉·투영 그림자는 런타임이 담당하고 자체 명암은 원화에 남긴다.
- 학교와 가정의 흔한 물건을 쓴다. 책은 한 권, 세트 물건은 실제로 같이 움직일 수 있는 닫힌 세트. 뜬 덮개·분리 부품·장식 소품은 피한다.
- 배경은 현재 5개(locker/library/home-desk/bedroom/wardrobe)가 생성만 된 상태다. 직접 확인해야 하며 측정/승인되지 않았다. living-room/shoe-cabinet은 미생성이다.
- 본 세션의429는 이후 정상 생성으로 해소되었다. 무제한 사용을 보장하는 것으로 해석하지도, 과거 재설정일까지 대기하는 근거로 쓰지도 않는다.

## 반영 순서

1. 이미지 직접 확인, 카메라/부품/실루엣/알파 검사. 측정 전 자세를 확인한다.
2. 원본과 실제 프롬프트를 receipt에 기록한다. 수정 원본은 보존한다.
3. 승인한 원화만 `generation-log.json`에 넣는다. 검수 대기 원화를 한꺼번에 승인하지 않는다.
4. Python3+Pillow로 `python scripts/prepare-assets.py`를 실행한다. Pillow가 없다면 새 컴퓨터의 로컬 Python 환경에 설치한다.
5. **주의:** 기존 스크립트는 배포 이미지가 같은 크기로 존재하면 다시 인코딩하지 않는다. 교체할 때는 해당 public WebP를 버전 백업한 뒤 그 파일만 재생성한다. 전체 public을 지우지 않는다. `artwork/<id>.png` 로컬 원본을 우선하므로 새 버전 승인 시 이 파일의 교체/백업도 명시적으로 수행한다.
6. `src/data/art-metrics.json`과 `artwork/asset-bounds.json` 갱신을 확인한다. 시점별 metrics 사용은 V1에서 연결해야 한다.
7. `npm run handoff:sync`, `node scripts/write-asset-queue.mjs`, `npm run check:handoff`, `npm run check:assets`로 상태를 갱신한다.
8. 실제 브라우저·공통 PNG 렌더러로 배치 검수한다. 원본 입고만으로 공간을 활성화하지 않는다.

## 제작 수량

원화112 = 물건72 + 추가 시점22 + 배경9 + 캐릭터4 + 도구3 + 효과2. 여기에 썸네일9가 더해져 배포121파일이다. 추가 시점은 책등11, 상자4, 의류/옷걸이3, 신발4다. 현재 원본과 남은 수는 STATUS의 자동 계산을 따른다.
