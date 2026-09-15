# 검수 근거와 미완료 범위

## 이번 인계에서 다시 확인 — 2026-09-16 오전8시21분 이후 KST

- 테스트42개/7파일 통과. `npm run build`의 typecheck와 Vite 빌드 통과.
- portable source 경로로 `prepare-assets.py` 재실행: 반영 원본30개 처리 통과.
- 원본57개 SHA-256, 위키 링크8문서, 작업 의존 관계10개 검사 통과.
- 원화57/112, public32/121, public누락89개를 구분해 기록. 추가 이미지 때문에 달라진 metrics도 빌드에 포함.
- 이번 인계 작업에서는 브라우저 장면을 다시 조작하지 않았다. 이전 책상 검수 범위는 아래와 같다.
- 전달 ZIP은 `scripts/package-handoff.py`로 만들고 CRC 및 전체 파일 SHA-256을 대조한다. 결과는 `output/transfer/package-report.json`에 기록한다.

## 이미 확인한 범위

- 내 책상42개 추가 선택 조합, 초기 배치·완료 예시·저장 복원, 잘못된 관통/포개기 거부.
- 브라우저: 추가3개/네 번째 제한, 드래그와 목록→놓기, 회전, 가방 걸기/꺼내기, 책 포개기, 잘못된 청소 순서, 퀴즈, 초기화/취소, PNG 저장/끝내기.
- 키보드: Tab/Enter 시작부터 정리 진입, 문항/설명 포커스, Escape 확인창 취소. 캔버스 모든 좌표의 키보드 이동을 검증했다는 뜻은 아니다.
- 추가 이미지 실제 로드 실패/재시도: 자와 물병 파일을 잠시 이동해 확인한 뒤 전부 복구. 선택 유지·복구 후 포커스 확인.
- CSS 화면 크기5개와390×844 흐름 확인. 브라우저 viewport 설정이 적용되지 않아 개발용 iframe으로 검사했으며 실제 기기 검수는 아니다.
- `/`, `/Cleaning/`, `/Cleaning/index.html` 로컬 빌드 경로 확인. 실제 배포는 하지 않았다.
- 바구니32구멍 가림은 수납장 시험 화면에서 확인. 수납장 학생 활동 완료를 뜻하지 않는다.
- PNG 실패(null,빈 파일,MIME,SecurityError,타임아웃,취소)와 캐시/자원 정리는 자동 검사. 모든 브라우저의 실제 실패 화면을 확인한 것은 아니다.

## 보존한 증거

- [책상 결과 PNG](../../output/qa/school-desk-result.png):1984×848. SHA256 `74BD05E2400FDF18F7F5963BAF5F482280026973F4615575E242E19FD4300266`.
- [수납장 가림 PNG](../../output/qa/cabinet-basket-occlusion.png):960×720, 실제 물건 배치 완료 예시 아님.
- [에셋 파일 검사](../../output/qa/assets.json): 검사 실행 때 갱신. 현재 누락이 있으므로 exit1이 맞다.
- 인계 시 재실행 로그는 `output/qa/handoff-*.txt`로 보존한다. 통과 여부는 로그의 exit code와 내용을 확인한다.

## 재실행 명령

```powershell
npm.cmd run handoff:sync
node scripts/write-asset-queue.mjs
npm.cmd run check:handoff
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run check:assets
```

개발 서버 `npm.cmd run dev -- --port 5173`. `?review`는 배치/수납 프레임, `?responsive`는 CSS화면, `?cabinet-review`는 바구니 구멍 검수다. 검수용 코드는 배포 빌드에서 제외한다. `node scripts/serve-dist.mjs`는4173의 로컬 빌드를 제공한다.

## 아직 해야 하는 것

1. 새 원화27개 검수/수정/통합 및 아직 없는 원화55개 제작. 상태는 자동 목록을 우선한다.
2. 추가 시점22개 연결과 나머지8개 실제 공간의 전체 활동.
3. 새 공간336조합, 입구/선반 천장 충돌, 옷걸이 접점, 신발 밑창, 실제 그림자와 가림.
4. 전체 맵을 오가며 장시간 드래그·캐시·메모리 확인. 모의 캐시5회 검사는 실제5개 공간 성능 검수가 아니다.
5. iOS/Android 등 실제 기기의 터치,가상 키보드,safe-area,회전,다운로드. 교실 PC·프로젝터·교사 리허설.
6. 전체121파일과 최종 썸네일, 필요하다면 별도 승인 범위에서 실제 게시 확인.

수업 준비 완료라는 표현은 이 미완료 범위를 감추지 않을 때만 사용한다. 테스트42개 통과와 전체 수업 완성은 다르다.
