# 프로젝트 작업 위키

처음에는 [handoff.md](../../handoff.md)를 읽는다. 이 폴더는 대화 기록을 대신하는 작은 작업 위키다.

| 알고 싶은 것 | 파일 | 갱신 방식 |
|---|---|---|
| 지금 어디까지 됐나 | [STATUS.md](STATUS.md) | `npm run handoff:sync` |
| 무엇부터 해야 하나 | [WORK.md](WORK.md) | 작업 완료 때 수정 |
| 의존 관계와 작업 ID | [work-tree.json](work-tree.json) | WORK와 함께 수정 |
| 이미지가 어디 있고 무엇을 다시 그리나 | [ASSETS.md](ASSETS.md), [asset-state.json](asset-state.json) | 절차 / 자동 목록 |
| 구현 위치와 주의점 | [ARCHITECTURE.md](ARCHITECTURE.md) | 구조 변경 때 수정 |
| 확인한 것과 확인 안 한 것 | [VERIFICATION.md](VERIFICATION.md) | 실행 증거가 생길 때 수정 |

## 문서 우선순위

새 사용자 지시 → 루트 AGENTS → handoff/위키의 최신 상태 → PRD와 배치 기준 → 과거 TASKS 기록. 실제 소스와 파일 검사 결과가 문서와 다르면 그 차이를 확인하고 문서를 고친다. 이미지를 다시 생성하는 것으로 불일치를 숨기지 않는다.

상세 기획 근거는 [PRD](../../PRD.md), [구현 계획](../IMPLEMENTATION_PLAN.md), [원본 PDF](../../sample), [완료 조건 전체](../COMPLETION_AUDIT.md)에 있다. 작업마다 전부 읽지 말고 필요한 절만 찾는다.

- [2026-09-16 최신 데스크톱 인계·구체적 중단점](DESKTOP_HANDOFF_2026-09-16.md)
