import { expect, it } from "vitest";
import { mapsById } from "../data/maps";
import { physicalMaps } from "../data/physical";
import { initialPlacements, makeSession, placementIssues, reducer, toggleExtra, tryPlacement, type Session } from "./session";
import { validateSession } from "./storage";

function start(mapId = "school-desk"): Session {
  let state = reducer(makeSession(), { type: "BEGIN" });
  state = reducer(state, { type: "PROFILE", name: "통합검수", character: "rabbit" });
  state = reducer(state, { type: "TUTORIAL_DONE" });
  return reducer(state, { type: "MAP", mapId });
}

it("9공간의 42조합을 정리 도중 역순으로 꺼내고 넣어도 기존 자리를 보존한다", () => {
  for (const mapId of Object.keys(physicalMaps)) {
    for (let bits = 0; bits < 64; bits++) {
      const extras = mapsById[mapId].extras.filter((_, i) => bits & (1 << i));
      if (extras.length > 3) continue;
      let state = start(mapId);
      expect(state.step).toBe("organize");
      for (const item of [...extras].reverse()) {
        const before = state.placements;
        state = reducer(state, { type: "EXTRA", id: item.id });
        expect(state.extras).toContain(item.id);
        for (const [id, p] of Object.entries(before)) expect(state.placements[id]).toEqual(p);
        expect(placementIssues(state).size, `${mapId}:${item.id}`).toBe(0);
        expect(validateSession(state)).toBe(true);
      }
      for (const item of extras) {
        const before = state.placements;
        state = reducer(state, { type: "EXTRA", id: item.id });
        expect(state.placements[item.id]).toBeUndefined();
        for (const [id, p] of Object.entries(before)) if (id !== item.id) expect(state.placements[id]).toEqual(p);
        expect(validateSession(state)).toBe(true);
      }
    }
  }
});

it("옮긴 물건을 유지하며 추가·제거하고 3개 제한과 청소 단계 잠금을 지킨다", () => {
  let state = start();
  const moved = tryPlacement(state, "b7", { x: 842, y: 299 }, "hook").placement!;
  expect(moved).toBeDefined();
  state = reducer(state, { type: "MOVE", id: "b7", placement: moved });
  for (const id of ["e6", "e2", "e3"]) state = reducer(state, { type: "EXTRA", id });
  expect(state.placements.b7).toEqual(moved);
  expect(reducer(state, { type: "EXTRA", id: "e1" })).toBe(state);
  state = reducer(state, { type: "EXTRA", id: "e2" });
  expect(state.placements.b7).toEqual(moved);
  expect(validateSession(state)).toBe(true);
  state = reducer(state, { type: "START_CLEAN" });
  expect(reducer(state, { type: "EXTRA", id: "e6" })).toBe(state);
  const reset = reducer(state, { type: "RESET" });
  expect(reset.placements).toEqual(initialPlacements(reset.mapId!, reset.extras));
});

it("추가 물건이 받치는 윗책을 먼저 옮기기 전에는 받침을 제거하지 않는다", () => {
  let state = reducer(start(), { type: "EXTRA", id: "e4" });
  for (const id of ["e4", "b2"]) {
    const p = tryPlacement(state, id, { x: 541, y: 329 }, "notebooks", 0).placement!;
    expect(p).toBeDefined();
    state = reducer(state, { type: "MOVE", id, placement: p });
  }
  expect(state.placements.b2.stackOn).toBe("e4");
  const blocked = toggleExtra(state, "e4");
  expect(blocked.state).toBe(state);
  expect(blocked.message).toContain("먼저 옮겨");
  expect(validateSession(state)).toBe(true);
});

it("꺼낼 자리를 다른 물건이 차지하면 겹치지 않는 빈자리를 찾는다", () => {
  let state = start();
  const slot = physicalMaps["school-desk"].slots[0];
  const p = tryPlacement(state, "b1", slot, slot.surface, 0).placement!;
  expect(p).toBeDefined();
  state = reducer(state, { type: "MOVE", id: "b1", placement: p });
  const before = state.placements;
  state = reducer(state, { type: "EXTRA", id: "e3" });
  expect(state.extras).toContain("e3");
  for (const [id, placement] of Object.entries(before)) expect(state.placements[id]).toEqual(placement);
  expect(placementIssues(state).size).toBe(0);
});
