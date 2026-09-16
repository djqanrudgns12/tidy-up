import { expect, it, vi } from "vitest";
import { activeItems, makeSession, reducer, type Session } from "./session";
import { readSaved, saveSession, storageKey } from "./storage";

const href = "https://example.test/Cleaning/index.html";

it("앞면 시점으로 바뀐 물건은 이전 회전만 보정하고 좌표와 활동을 보존한다", () => {
  const storage = new MemoryStorage();
  for (const mapId of ["school-desk", "classroom-cabinet", "bedroom", "wardrobe", "living-room", "shoe-cabinet"]) {
    let s = reducer(makeSession(), { type: "BEGIN" });
    s = reducer(s, { type: "PROFILE", name: "복원검수", character: "cat" });
    s = reducer(s, { type: "TUTORIAL_DONE" });
    s = reducer(s, { type: "MAP", mapId });
    const changed = activeItems(mapId, s.extras).filter(i => ["cap", "sun-hat", "pillow", "cushion", "glue-stick"].includes(i.asset));
    const placements = { ...s.placements };
    for (const item of changed) placements[item.id] = { ...placements[item.id], angle: 15 };
    saveSession(storage, href, { ...s, placements });
    expect(readSaved(storage, href).saved).toEqual(s);
    if (changed.length) {
      placements[changed[0].id] = { ...placements[changed[0].id], x: -1000 };
      saveSession(storage, href, { ...s, placements });
      expect(readSaved(storage, href).saved).toBeUndefined();
    }
  }
});
class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() {
    return this.values.size;
  }
  clear() {
    this.values.clear();
  }
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}
function activity() {
  let state = reducer(makeSession(), { type: "BEGIN" });
  state = reducer(state, {
    type: "PROFILE",
    name: "저장검수",
    character: "cat",
  });
  state = reducer(state, { type: "TUTORIAL_DONE" });
  state = reducer(state, { type: "MAP", mapId: "school-desk" });
  state = reducer(state, { type: "EXTRA", id: "e3" });
  return reducer(state, { type: "CONFIRM_SET" });
}

it("잘못된 JSON은 자기 활동 키만 삭제하고 저장 접근 오류와 구분한다", () => {
  const storage = new MemoryStorage();
  const key = storageKey(href);
  storage.setItem(key, "{broken JSON");
  storage.setItem(key.replace(":v2:", ":v1:"), "old format");
  storage.setItem("another-app", "keep");
  expect(readSaved(storage, href)).toEqual({
    notice: "저장된 활동을 이어 갈 수 없어 새로 시작해요.",
  });
  expect(storage.getItem(key)).toBeNull();
  expect(storage.getItem(key.replace(":v2:", ":v1:"))).toBeNull();
  expect(storage.getItem("another-app")).toBe("keep");
  expect(readSaved(storage, href)).toEqual({});
});

it("만료·없는 ID·중복·유한하지 않은 좌표를 복원하지 않고 폐기한다", () => {
  const original = activity();
  const invalid: Session[] = [
    { ...original, updatedAt: Date.now() - 7200001 },
    { ...original, extras: ["unknown"] },
    { ...original, extras: ["e3", "e3"] },
    {
      ...original,
      placements: {
        ...original.placements,
        b1: { ...original.placements.b1, x: NaN },
      },
    },
  ];
  for (const state of invalid) {
    const storage = new MemoryStorage();
    saveSession(storage, href, state);
    expect(readSaved(storage, href).saved).toBeUndefined();
    expect(storage.getItem(storageKey(href))).toBeNull();
  }
});

it("활동 종료가 이전 저장을 지우며 새 학생은 빈 이름과 물건 세트로 시작한다", () => {
  const storage = new MemoryStorage();
  const previous = activity();
  saveSession(storage, href, previous);
  expect(readSaved(storage, href).saved?.name).toBe("저장검수");
  // Exercise the end/reset contract independently of cleaning validation.
  const ended = reducer({ ...previous, step: "result" }, { type: "END" });
  saveSession(storage, href, ended);
  expect(readSaved(storage, href)).toEqual({});
  expect(ended.sessionId).not.toBe(previous.sessionId);
  expect(ended.name).toBe("");
  expect(ended.extras).toEqual([]);
  expect(ended.placements).toEqual({});
  const next = reducer(ended, { type: "BEGIN" });
  saveSession(storage, href, next);
  expect(next.step).toBe("profile");
  expect(next.name).toBe("");
  expect(next.character).toBe("rabbit");
  expect(readSaved(storage, href)).toEqual({});
});

it("접근 거부와 용량 부족은 상태를 바꾸지 않고 호출자에게 실패를 알린다", () => {
  const storage = new MemoryStorage();
  vi.spyOn(storage, "getItem").mockImplementation(() => {
    throw new DOMException("denied", "SecurityError");
  });
  expect(readSaved(storage, href).notice).toContain("새로고침하지 말고");
  const state = activity();
  const before = structuredClone(state);
  vi.spyOn(storage, "setItem").mockImplementation(() => {
    throw new DOMException("full", "QuotaExceededError");
  });
  expect(() => saveSession(storage, href, state)).toThrow("full");
  expect(state).toEqual(before);
  vi.spyOn(storage, "removeItem").mockImplementation(() => {
    throw new DOMException("denied", "SecurityError");
  });
  expect(() => saveSession(storage, href, { ...state, step: "end" })).toThrow(
    "denied",
  );
});

it("이전 물건 선택 화면 저장도 선택을 보존한 채 정리 단계로 이어진다", () => {
  const storage = new MemoryStorage();
  const old = { ...activity(), step: "setup" as const, placements: {} };
  saveSession(storage, href, old);
  const restored = readSaved(storage, href).saved!;
  expect(restored.step).toBe("organize");
  expect(restored.extras).toEqual(old.extras);
  expect(Object.keys(restored.placements)).toHaveLength(9);
});
