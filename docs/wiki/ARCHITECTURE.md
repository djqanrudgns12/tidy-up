# 구현 구조와 변경 위치

## 2026-09-16 오후 추가

physical.ts에 wardrobe.ts/living-room.ts/shoe-cabinet.ts를 연결하여9공간을 활성화했다. 신규 fixture와 wardrobe.test.ts/final-maps.test.ts가42조합씩 검증한다. scene-art.ts는 접힌 옷·이불/신발 밑창/우산 커버 걸이를 구분한다. 걸이는 전체 몸체의 가구 내부 경계를 검사한 후 실제 고리 접점을 봉에 맞춘다. 개발용 ?wardrobe-layout 및 ?final-layout=living-room 또는 shoe-cabinet에서 조합·모션·PNG를 검수한다. [최신 검수](FINAL_REVIEW_2026-09-16.md).

React19 / TypeScript7 / Vite8 / Konva10. 고정 카메라 **2.5D** 장면이다. 회전 가능한3D 공간이 아니다. 소스는 [src](../../src)에 있다.

## 어디를 고칠까

| 기능 | 파일 |
|---|---|
| 전체 활동 흐름, 선택·실패 재시도·복원 | [App.tsx](../../src/App.tsx) |
| 문항, 답 설명과 키보드 포커스 | [QuestionCards.tsx](../../src/components/QuestionCards.tsx), [lesson.ts](../../src/data/lesson.ts) |
| 물건72종,9개 공간의 계획 | [catalog.ts](../../src/data/catalog.ts), [maps.ts](../../src/data/maps.ts) |
| 실제 사용 가능한 공간과 실측 면 | [physical.ts](../../src/data/physical.ts) |
| 추가 시점22개 정의 | [asset-views.ts](../../src/data/asset-views.ts) |
| 지지면 투영, 충돌 경계 | [placement.ts](../../src/domain/placement.ts) |
| 완료·이동·작은 밀림·포개기·복원 검증 | [session.ts](../../src/domain/session.ts) |
| 포인터·잡은 위치·입력 취소 | [Scene.tsx](../../src/components/Scene.tsx), [interaction.ts](../../src/domain/interaction.ts) |
| 그림 순서·그림자·가림·PNG 공통 합성 | [paint.ts](../../src/rendering/paint.ts) |
| 꺼내기/이동/넣기 애니메이션 | [motion.ts](../../src/rendering/motion.ts) |
| 이미지 decode·URL 캐시·현재 공간 유지 | [art.ts](../../src/rendering/art.ts) |
| PNG와 실패/취소 처리 | [export.ts](../../src/rendering/export.ts), [png.ts](../../src/rendering/png.ts) |
| 브라우저 로컬 저장 | [storage.ts](../../src/domain/storage.ts) |
| 수납장 바구니 앞면32구멍 | [cabinet-occlusion.ts](../../src/data/cabinet-occlusion.ts), [occlusion.ts](../../src/domain/occlusion.ts) |

## 현재 흐름

시작 → 이름/캐릭터 → 분류4문항 → 공간 → 추가 물건0~3개 → 정리8~11개 → 청소 → 퀴즈3문항 → 전후 PNG → 끝내기. 서버/로그인/외부 분석 없음. 저장은 브라우저·경로별, 마지막 갱신2시간 TTL, schema2/contentVersion2026-09-16.4. 이름은 한글 자모를 포함한1~10자. IME 조합 중 제출 방지.

## 배치의 공통 원칙

- 도형·이미지·hit test·충돌 경계는 같은 변환을 써야 한다. 실제 알파 크기 비율을 유지한다.
- 물건 밑면 전체가 지지면 안에 있어야 한다. 작은 가장자리 오차 보정24px, 충돌 시 현재 들고 있는 물건만 가까운 빈자리로 최대36px 이동,64탐색노드 제한. 다른 물건을 연쇄 정렬하지 않는다.
- 책/파일의 안정적인2개 포개기를 지원하고, 아래 물건은 위 물건이 있으면 잠근다. 포개기와 관통을 혼동하지 않는다.
- floor처럼 올바르지 않은 분류 자리도 놓을 수 있지만 완료는 아니다. 금지 위치는 이전 자리로 되돌린다.
- 모션은 대략 꺼내기0~24%, 공중 이동,66%부터 삽입. 실제 입구/앞턱/천장에 맞게 공간별 조정한다. reduced-motion과 취소 처리 유지.
- 책상 소실점(518,-312), 휴지통 lift70, 가방걸이(821,318)는 책상 실측값이다. 다른 배경으로 복사하지 않는다.
- 화면과 최종 PNG는 같은 painter 사용. 이동 중 임시 프레임, 선택선, 먼지 가이드가 PNG에 들어가지 않는다.

## 시점 선택 연결 V1

src/data/scene-art.ts가 공간별 카메라에 맞는 원화·metrics·기본 자세를 결정한다. 수납장 상자3개는 low-front를 바닥/이동/선반에서 유지한다. loadSceneItem을 최초/추가 물건 로딩이 공유하여 top-view로 덮어쓰지 않는다. sizeOf·poseOf·footprint와 화면/hit/PNG/모션이 같은 선택을 쓴다. 상자 밑면 깊이는 정면 실루엣 높이와 분리했다. 사물함은 Surface.bookSpines로 별도 책/파일3종 원화와 metrics를 선택한다. LoadedArt.shelf를 함께 캐시하며 화면·알파 클릭·충돌·PNG가 같은 원화를 쓴다. bookTurn은 공중에서 일정한 실제 높이를 투영하고 별도 두 원화를 premultiplied alpha로 섞는다. 들어가기 전에 회전을 끝내며 끌 때는 잡은 시점을 유지한다. 이후 의류 등의 전환과 나머지 공간 연결은 남았다.

## 교과·문장

원본은 [교과서](../../sample/textbook.pdf), [지도서](../../sample/teachingbook.pdf). 기존 검토는 교과서90쪽과 지도서248~249쪽을 근거로 하며91쪽은 지도서의 축소 그림만 확인했다. 출판사·판본은 확정하지 않았다. 2022개정 [6실02-10]의 실제 실천을 웹 활동이 대신했다고 말하지 않는다. 문장은 학생이 무엇을 어디에 왜 놓는지 알 수 있게 쓴다. 전체 기획을 새로 뒤집지 말고 [PRD](../../PRD.md)의 근거를 필요한 부분만 읽는다.

도서관도 같은 시점 선택을 사용한다. tiltedPanel은 실제 경사진 표지 진열대이며 세운 물건은 배치 검사에서 거절한다. 정보책 선반은 bookSpines, 반납 선반과 독서 탁자는 기본 표지를 유지한다.
