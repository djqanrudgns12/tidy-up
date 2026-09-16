import { describe, expect, it } from "vitest";
import { mapsById } from "../data/maps";
import { physicalMaps } from "../data/physical";
import { assetsById } from "../data/catalog";
import {
  activeItems,
  collisionWith,
  initialPlacements,
  makeSession,
  reducer,
  tryPlacement,
  unfinished,
  validName,
  type Session,
} from "./session";
import { fitsSurface, footprint, sizeOf } from "./placement";
import { storageKey, validateSession } from "./storage";
import { advanceDrag, dragPlacement } from "./interaction";
import { paintOrder } from "../rendering/paint";
import { motionFrame } from "../rendering/motion";

const combinations: string[][] = [[]];
it("한글 초성·모음 별명과 NFC 한글을 허용하고 공백·경로·제어 문자는 차단한다", () => {
  for (const name of [
    "ㄱㅅㅇ",
    "ㅎㅎ",
    "ㅏㅣ",
    "가나다",
    "가나",
    "  모둠 A2  ",
  ])
    expect(validName(name), name).toBe(true);
  for (const name of [
    "",
    "   ",
    "ㅤ",
    "가나다라마바사아자차카",
    "../이름",
    "이름/파일",
    "이름\\파일",
    "a\u0000b",
    "a\u200bb",
  ])
    expect(validName(name), name).toBe(false);
  const state = reducer(reducer(makeSession(), { type: "BEGIN" }), {
    type: "PROFILE",
    name: "  ㄱㅅㅇ  ",
    character: "cat",
  });
  expect(state.name).toBe("ㄱㅅㅇ");
  expect(state.step).toBe("tutorial");
  expect(validateSession(state)).toBe(true);
});
for (let bits = 1; bits < 64; bits++) {
  const ids = Array.from({ length: 6 }, (_, i) => `e${i + 1}`).filter(
    (_, i) => bits & (1 << i),
  );
  if (ids.length <= 3) combinations.push(ids);
}
function start(extras: string[] = []): Session {
  let s = reducer(makeSession(), { type: "BEGIN" });
  s = reducer(s, { type: "PROFILE", name: "검수", character: "rabbit" });
  s = reducer(s, { type: "TUTORIAL_DONE" });
  s = reducer(s, { type: "MAP", mapId: "school-desk" });
  for (const id of extras) s = reducer(s, { type: "EXTRA", id });
  return reducer(s, { type: "CONFIRM_SET" });
}
const destinations: Record<string, [string, number, number, number]> = {
  b1: ["books", 330, 328, 0],
  b2: ["notebooks", 541, 329, 0],
  b3: ["notebooks", 662, 329, 0],
  b4: ["ready", 280, 134, 0],
  b5: ["ready", 433, 135, 0],
  b6: ["ready", 539, 136, 0],
  b7: ["hook", 842, 299, 0],
  b8: ["bin", 876, 502, 0],
  e1: ["ready", 650, 134, 0],
  e2: ["ready-top", 515, 181, 0],
  e3: ["tray", 761, 211, 0],
  e4: ["notebooks", 541, 329, 0],
  e5: ["ready-top", 595, 179, 0],
  e6: ["ready-top", 378, 178, 0],
};
function finishOrganizing(s: Session) {
  const order = [
    ...(s.extras.includes("e4") ? ["e4"] : []),
    ...mapsById["school-desk"].base.map((i) => i.id),
    ...s.extras.filter((id) => id !== "e4"),
  ];
  for (const id of order) {
    const [surface, x, y, angle] = destinations[id];
    const attempt = tryPlacement(s, id, { x, y }, surface, angle);
    expect(
      attempt.placement,
      `${s.extras.join(",")} ${id}: ${attempt.message}`,
    ).toBeDefined();
    s = reducer(s, { type: "MOVE", id, placement: attempt.placement! });
  }
  expect(unfinished(s)).toEqual([]);
  return s;
}
describe("내 책상: 실제 면과 모든 추가 선택 조합", () => {
  it("42개 조합의 초기 물건이 면 안에 있고 서로 관통하지 않는다", () => {
    expect(combinations).toHaveLength(42);
    for (const extras of combinations) {
      const s = start(extras);
      for (const item of activeItems(s.mapId!, extras)) {
        const p = s.placements[item.id],
          surface = physicalMaps[s.mapId!].surfaces.find(
            (v) => v.id === p.surface,
          )!;
        expect(
          fitsSurface(assetsById[item.asset], p, surface, s.mapId!),
          `${extras}: ${item.asset}`,
        ).toBe(true);
        expect(
          collisionWith(s, item, p, surface),
          `${extras}: ${item.asset}`,
        ).toBeUndefined();
      }
      expect(validateSession(s)).toBe(true);
    }
  });
  it("42개 조합 모두 실제 크기로 수납을 완료할 수 있다", () => {
    for (const extras of combinations)
      expect(validateSession(finishOrganizing(start(extras)))).toBe(true);
  });
  it("추가 선택 순서가 초기 배치를 바꾸지 않는다", () => {
    expect(initialPlacements("school-desk", ["e6", "e2", "e4"])).toEqual(
      initialPlacements("school-desk", ["e2", "e4", "e6"]),
    );
  });
  it("가방은 걸이 접점에 고정하고 공중에 놓은 물건은 가까운 받침면에 내려놓는다", () => {
    const s = start();
    const atHook = tryPlacement(s, "b7", { x: 835, y: 316 }, "hook", 45);
    expect(atHook.placement).toEqual({
      x: 821,
      y: 318,
      angle: 0,
      surface: "hook",
    });
    const dropped = tryPlacement(s, "b1", { x: 300, y: 70 }).placement;
    expect(dropped).toBeDefined();
    expect(dropped!.surface).not.toBe("hook");
    expect(
      tryPlacement(s, "b1", { x: 842, y: 299 }, "hook").placement,
    ).toBeUndefined();
  });
  it("아래 책을 먼저 빼지 못하며 윗책을 옮긴 뒤에는 빼낼 수 있다", () => {
    let s = finishOrganizing(start(["e4"]));
    expect(s.placements.b2.stackOn).toBe("e4");
    expect(
      tryPlacement(s, "e4", { x: 430, y: 550 }, "floor").placement,
    ).toBeUndefined();
    const upper = tryPlacement(
      s,
      "b2",
      { x: 430, y: 550 },
      "floor",
      0,
    ).placement!;
    s = reducer(s, { type: "MOVE", id: "b2", placement: upper });
    expect(
      tryPlacement(s, "e4", { x: 260, y: 640 }, "floor", 0).placement,
    ).toBeDefined();
  });
});
describe("활동 전이와 저장", () => {
  it("작은 겹침은 놓던 물건만 가까운 빈자리로 밀고, 결과를 다시 검증한다", () => {
    const s = finishOrganizing(start());
    const attempted = tryPlacement(s, "b6", { x: 433, y: 135 }, "ready", 0);
    expect(attempted.placement).toBeDefined();
    expect(attempted.message).toContain("조금 옆으로");
    expect(
      Math.hypot(attempted.placement!.x - 433, attempted.placement!.y - 135),
    ).toBeLessThanOrEqual(36);
    const next = reducer(s, {
      type: "MOVE",
      id: "b6",
      placement: attempted.placement!,
    });
    for (const id of Object.keys(s.placements).filter((id) => id !== "b6"))
      expect(next.placements[id]).toEqual(s.placements[id]);
    expect(validateSession(next)).toBe(true);
    expect(unfinished(next)).toEqual([]);
  });
  it("수납은 입구 위에서 내려가고 밀림은 바닥에서 뜨지 않는다", () => {
    const s = start(),
      paper = activeItems(s.mapId!, []).find((i) => i.id === "b8")!,
      geometry = physicalMaps[s.mapId!];
    const to = tryPlacement(s, "b8", { x: 876, y: 502 }, "bin", 0).placement!;
    const middle = motionFrame(
      { id: "b8", from: s.placements.b8, to, progress: 0.66 },
      paper,
      geometry,
      s.mapId!,
    );
    const end = motionFrame(
      { id: "b8", from: s.placements.b8, to, progress: 1 },
      paper,
      geometry,
      s.mapId!,
    );
    expect(middle.inside).toBe(true);
    expect(middle.placement.y - middle.elevation).toBe(490);
    expect(end.elevation).toBe(0);
    expect(end.placement).toEqual(to);
    const sliding = motionFrame(
      {
        id: "b8",
        from: s.placements.b8,
        to: { ...s.placements.b8, x: 130 },
        progress: 0.5,
      },
      paper,
      geometry,
      s.mapId!,
    );
    expect(sliding.elevation).toBe(0);
    expect(sliding.shadowStrength).toBe(1);
  });
  it("휴지통 가림 레이어를 바꿀 때 종이 전체가 앞턱 위에 있고 위치가 연속이다", () => {
    const s = start(),
      geometry = physicalMaps[s.mapId!],
      paper = activeItems(s.mapId!, []).find((i) => i.id === "b8")!;
    const bin = geometry.surfaces.find((surface) => surface.id === "bin")!;
    const stored = tryPlacement(
      s,
      "b8",
      { x: 876, y: 502 },
      "bin",
      0,
    ).placement!;
    for (const [from, to, boundary] of [
      [s.placements.b8, stored, 0.66],
      [stored, s.placements.b8, 0.24],
    ] as const) {
      const frames = [boundary - 0.00001, boundary].map((progress) =>
        motionFrame(
          { id: "b8", from, to, progress },
          paper,
          geometry,
          s.mapId!,
        ),
      );
      const centers = frames.map((frame) => ({
        x: frame.placement.x,
        y: frame.placement.y - frame.elevation,
      }));
      expect(
        Math.hypot(centers[1].x - centers[0].x, centers[1].y - centers[0].y),
      ).toBeLessThan(0.1);
      const frame = frames[1];
      const edge = footprint(
        assetsById[paper.asset],
        { ...frame.placement, y: frame.placement.y - frame.elevation },
        frame.surface,
        s.mapId!,
      );
      const lipTop = Math.min(
        ...bin.occluders!.flatMap((polygon) =>
          polygon.filter((_, index) => index % 2 === 1),
        ),
      );
      expect(Math.max(...edge.map((point) => point.y))).toBeLessThan(lipTop);
    }
  });
  it("복원과 완료 판단에서 물건 관통과 이중 스택을 거부한다", () => {
    const s = finishOrganizing(start(["e4"]));
    for (const [upper, lower] of [
      ["b3", "b2"],
      ["b5", "b6"],
    ]) {
      const broken = {
        ...s,
        placements: { ...s.placements, [upper]: { ...s.placements[lower] } },
      };
      expect(validateSession(broken)).toBe(false);
      expect(unfinished(broken).length).toBeGreaterThan(0);
    }
  });
  it("윗책을 마지막에 그리고 원점으로 돌아온 드래그도 최종 좌표를 반영한다", () => {
    const s = finishOrganizing(start(["e4"]));
    const order = paintOrder({
      items: activeItems(s.mapId!, s.extras),
      placements: s.placements,
      geometry: physicalMaps[s.mapId!],
    }).map((i) => i.id);
    expect(order.indexOf("b2")).toBeGreaterThan(order.indexOf("e4"));
    const gesture = {
      id: "b2",
      origin: s.placements.b2,
      start: { x: 541, y: 329 },
      pointerId: 1,
      started: false,
    };
    advanceDrag(gesture, { x: 641, y: 329 }, 1);
    expect(advanceDrag(gesture, { x: 542, y: 329 }, 1).x).toBe(542);
    expect(gesture.started).toBe(true);
  });
  it("가방을 걸이에서 내릴 때 잡은 위치와 밑면이 튀지 않는다", () => {
    const s = finishOrganizing(start());
    const bag = activeItems(s.mapId!, []).find((i) => i.id === "b7")!;
    const moved = { ...s.placements.b7, x: 600, y: 410 };
    const result = dragPlacement(bag, moved, physicalMaps[s.mapId!], s.mapId!);
    expect(result.surface).toBe("floor");
    expect(result.y).toBeCloseTo(
      410 + sizeOf(assetsById.backpack, s.mapId!)[1] * 0.94,
    );
    expect(tryPlacement(s, "b7", result, result.surface).placement?.y).toBe(
      result.y,
    );
    expect(
      fitsSurface(
        assetsById["paper-scrap"],
        { x: 165, y: 620, angle: 0, surface: "floor" },
        physicalMaps[s.mapId!].surfaces[0],
        s.mapId!,
      ),
    ).toBe(false);
  });
  it("정리를 다 마치지 않아도 청소로 넘어갈 수 있다", () => {
    const s = start();
    expect(unfinished(s).length).toBeGreaterThan(0);
    expect(reducer(s, { type: "START_CLEAN" }).step).toBe("clean");
  });
  it("환기 → 가구 먼지 → 쓸기 → 닦기 → 도구 정리 순서를 지킨다", () => {
    let s = reducer(finishOrganizing(start()), { type: "START_CLEAN" });
    expect(reducer(s, { type: "CLEAN", spot: 0, tool: "duster" })).toBe(s);
    s = reducer(s, { type: "VENTILATE" });
    expect(reducer(s, { type: "CLEAN", spot: 2, tool: "broom" })).toBe(s);
    for (const spot of [1, 0])
      s = reducer(s, { type: "CLEAN", spot, tool: "duster" });
    const duplicate = reducer(s, { type: "CLEAN", spot: 0, tool: "duster" });
    expect(duplicate).toBe(s);
    expect(reducer(s, { type: "CLEAN", spot: 3, tool: "cloth" })).toBe(s);
    s = reducer(s, { type: "CLEAN", spot: 2, tool: "broom" });
    s = reducer(s, { type: "CLEAN", spot: 3, tool: "cloth" });
    s = reducer(s, { type: "STORE_TOOLS" });
    expect(s.step).toBe("quiz");
    expect(validateSession(s)).toBe(true);
    expect(reducer(s, { type: "CHANGE_ITEMS" })).toBe(s);
    s = reducer(s, { type: "QUIZ_DONE", correctCount: 2 });
    expect(s.step).toBe("result");
    expect(s.quizCorrectCount).toBe(2);
    expect(reducer(s, { type: "END" }).name).toBe("");
  });
  it("마무리 퀴즈 정답 수만 결과에 남기고 잘못된 수는 거부한다", () => {
    const quiz = {
      ...start(),
      step: "quiz" as const,
      ventilated: true,
      cleaned: [0, 1, 2, 3],
      toolsStored: true,
    };
    for (const correctCount of [-1, 4, 1.5])
      expect(reducer(quiz, { type: "QUIZ_DONE", correctCount })).toBe(quiz);
    const result = reducer(quiz, { type: "QUIZ_DONE", correctCount: 3 });
    expect(result.step).toBe("result");
    expect(result.quizCorrectCount).toBe(3);
    expect(reducer(result, { type: "RESET" }).quizCorrectCount).toBeNull();
  });
  it("초기화는 선택 세트를 유지하고, 다시 고르기는 진행을 지운다", () => {
    let s = finishOrganizing(start(["e1", "e3", "e4"]));
    s = reducer(s, { type: "RESET" });
    expect(s.extras).toEqual(["e1", "e3", "e4"]);
    expect(s.placements).toEqual(initialPlacements("school-desk", s.extras));
    s = reducer(s, { type: "CHANGE_ITEMS" });
    expect(s.step).toBe("setup");
    expect(s.placements).toEqual({});
    expect(validateSession(s)).toBe(true);
    s = reducer(s, { type: "CHANGE_MAP" });
    expect(s.name).toBe("검수");
    expect(s.extras).toEqual([]);
    expect(s.mapId).toBeNull();
  });
  it("만료, 잘못된 배치, 진행 순서와 과도한 선택을 거부한다", () => {
    const s = start();
    expect(validateSession({ ...s, updatedAt: Date.now() - 7200001 })).toBe(
      false,
    );
    expect(
      validateSession({ ...s, cleaned: [3], ventilated: true, step: "clean" }),
    ).toBe(false);
    expect(validateSession({ ...s, extras: ["e1", "e2", "e3", "e4"] })).toBe(
      false,
    );
    expect(validateSession({ ...s, name: {} })).toBe(false);
    expect(
      validateSession({
        ...s,
        placements: {
          ...s.placements,
          b1: { x: 200, y: 10, angle: 0, surface: "desk" },
        },
      }),
    ).toBe(false);
    expect(storageKey("https://example.test/Cleaning/")).toBe(
      storageKey("https://example.test/Cleaning/index.html"),
    );
    expect(storageKey("https://example.test/")).not.toBe(
      storageKey("https://example.test/Cleaning/"),
    );
  });
});
