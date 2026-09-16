import { describe, expect, it } from "vitest";
import { advanceTapGesture, type TapGesture } from "./interaction";

describe("장면 탭과 세로 스크롤 구분", () => {
  const gesture = (): TapGesture => ({
    start: { x: 100, y: 100 },
    pointerId: 1,
    moved: false,
  });

  it("작은 손떨림은 탭으로 유지한다", () => {
    const current = gesture();
    expect(advanceTapGesture(current, { x: 104, y: 100 }, 1)).toBe(true);
    expect(current.moved).toBe(false);
  });

  it("세로로 움직인 뒤 시작점에서 손을 떼도 탭으로 되돌리지 않는다", () => {
    const current = gesture();
    expect(advanceTapGesture(current, { x: 100, y: 118 }, 1)).toBe(false);
    expect(advanceTapGesture(current, { x: 100, y: 100 }, 1)).toBe(false);
    expect(current.moved).toBe(true);
  });

  it("화면 축소 배율에서도 물리 화면 기준 임계값을 유지한다", () => {
    const current = gesture();
    expect(advanceTapGesture(current, { x: 109, y: 100 }, 0.5)).toBe(true);
    expect(advanceTapGesture(current, { x: 110, y: 100 }, 0.5)).toBe(false);
  });
});
