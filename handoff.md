# 이어서 작업하기

**인계 시점: 2026-09-16, 한국 시간. 전체 프로젝트는 미완료다.**

이 프로젝트 폴더를 연 LLM에게 사용자가 **`이어서 해`**라고 하면 아래 순서로 구현을 계속한다. 이전 대화, 이전 컴퓨터, 브라우저 탭, Codex 생성 폴더에 접근할 필요가 없다. 먼저 긴 과거 기록을 전부 읽거나 같은 질문을 다시 하지 않는다.

## 1. 먼저 읽을 파일 — 약 5분

1. [AGENTS.md](AGENTS.md): 사용자 요구와 변경 금지 기준.
2. [최신 상태](docs/wiki/STATUS.md): 생성·미검수·반영 상태를 구분한 수량.
3. [다음 작업](docs/wiki/WORK.md): 우선순위, 의존 관계, 완료 기준.
4. 작업에 맞춰 [에셋](docs/wiki/ASSETS.md), [구조](docs/wiki/ARCHITECTURE.md), [검수](docs/wiki/VERIFICATION.md)만 선택해서 읽는다.

상세 요구를 바꿔야 할 때 [PRD](PRD.md), [배치 기준](docs/PLACEMENT_REVIEW.md)을 읽는다. [TASKS.md](TASKS.md)는 시간순 과거 기록이다. 그 안의 옛 에셋 수량과 한도 대기를 현재 상태로 받아들이지 않는다.

## 2. 사용자 의도와 승인

- 초등학교 5학년 실과 공개수업. 학생이 활동하고 학부모·교사가 지켜본다. 익숙한 학교·가정 물건과 구체적이고 자연스러운 한국어를 쓴다.
- 구현은 이미 승인되었다. 9개 공간·72종·추가 시점22개·배포 이미지121개 범위를 유지한다. 책상 한 공간을 전체 완성으로 표시하지 않는다.
- 최신 일정 요청은 **오늘 제작을 마쳐 내일 수업에 사용**하는 것이다. 인계 당시 날짜 기준으로 오늘은 9월16일이다. 새 세션에서는 실제 날짜와 남은 시간을 확인하되 임의로 범위를 줄이지 않는다.
- 배치의 자연스러움, 지지면, 크기, 원근, 그림자, 앞뒤 가림, 바구니에 들어가는 경로, 작은 밀림과 안정적인 포개기를 엄밀하게 구현한다.
- 마지막 지시: 이 데스크톱에서는 진행하던 이미지 결과를 보존하고 인계를 준비한다. 자동 생성 루프는 종료했다. 다음 데스크톱의 `이어서 해`는 기존 작업을 재개하라는 뜻이다.
- 유료 API 사용, 결제, Git 커밋·푸시, 배포, 원본 삭제는 별도로 승인받은 사실이 없다. 현재 내장 imagegen으로 정상 생성된 증거가 있다. 과거429의 재설정 시각으로 계속 기다리면 안 된다.

## 3. 새 컴퓨터에서 확인

Node **24.x** 권장. 실제 검증 버전은 24.14.1이다. 프로젝트 루트에서 Windows PowerShell:

```powershell
npm.cmd ci
npm.cmd run handoff:sync
npm.cmd run check:handoff
npm.cmd test
npm.cmd run build
npm.cmd run check:assets
npm.cmd run dev -- --port 5173
```

`check:assets`는 누락 이미지가 있어서 현재 실패하는 것이 맞다. **에셋 검사 실패를 전체 실행 실패로 오해하지 말고 목록을 확인한다.** 다른 검사 실패는 원인을 해결한다. macOS/Linux에서는 `npm.cmd` 대신 `npm`을 쓴다. Python은 원화 처리에만 필요하며 Python3+Pillow를 사용한다. 이 컴퓨터의 Python 절대 경로를 복사하지 않는다.

## 4. 다음 한 작업

**새 이미지를 무작정 다시 만들지 말고, 이미 저장된 미검수 원화부터 확인한다.**

1. [asset-state.json](docs/wiki/asset-state.json)의 `sourcePresent=true` 파일은 프로젝트 안에 있다. `needs-revision` 5건과 나머지 미검수 원화·배경을 구분한다.
2. 수납장 우선: 공·카드상자 수정 → 상자 낮은 정면3개 → 시점 선택 연결 → 실제 배경 좌표 측정 → 수납/꺼내기/42조합/PNG 검수.
3. 나머지 원화 제작과 다른 공간의 측정을 [작업 트리](docs/wiki/work-tree.json)의 의존 순서로 진행한다. 에셋이 존재한다는 이유만으로 맵을 켜지 않는다.

## 5. 옮길 파일

**프로젝트 폴더 전체를 복사**한다. 특히 `artwork`, `public`, `src`, `sample`, `scripts`, `docs`, 루트 Markdown, `package.json`, `package-lock.json`, 설정 파일을 포함한다. `node_modules`는 생략해도 되며 새 컴퓨터에서 `npm ci`로 복원한다. `dist`는 현재 한 공간의 시연 빌드일 뿐이며 구현 원본을 대신하지 않는다. `output/qa`는 검수 근거라 함께 옮긴다.

원화 원본57개는 `artwork/*.png`에 있고 출처/프롬프트는 `artwork/receipts/*.json`에 있다. `originPath`는 과거 생성 위치 기록일 뿐, 실행에 필요한 경로가 아니다. 새 컴퓨터에서는 경로를 현재 프로젝트 루트 기준으로 해석한다.

## 6. 다시 인계할 때

에셋을 변경했으면 `npm run handoff:sync`와 `node scripts/write-asset-queue.mjs`, `npm run check:handoff`를 실행한다. 작업 완료 상태는 `work-tree.json`과 `WORK.md`를 함께 갱신하고, 실제 수행한 검수는 `VERIFICATION.md`에 날짜와 범위를 남긴다. 미검수 결과를 완료로 바꾸지 않는다.
