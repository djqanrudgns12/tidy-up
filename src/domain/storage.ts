import { mapsById } from "../data/maps";
import { physicalMaps } from "../data/physical";
import { assetsById } from "../data/catalog";
import { poseOf } from "./placement";

import {
  activeItems,
  reducer,
  placementIssues,
  validName,
  type Session,
} from "./session";

const TTL = 2 * 60 * 60 * 1000;
export function storageKey(locationHref: string) {
  return `cleaning-lesson:v2:${new URL(".", locationHref).pathname}`;
}
export function validateSession(
  value: unknown,
  now = Date.now(),
): value is Session {
  if (!value || typeof value !== "object") return false;
  const s = value as Session;
  if (
    s.schemaVersion !== 2 ||
    s.contentVersion !== "2026-09-16.4" ||
    typeof s.sessionId !== "string" ||
    !/^[a-z0-9-]{20,50}$/i.test(s.sessionId)
  )
    return false;
  if (
    !Number.isInteger(s.revision) ||
    s.revision < 0 ||
    !Number.isFinite(s.updatedAt) ||
    s.updatedAt > now + 60000 ||
    now - s.updatedAt > TTL
  )
    return false;
  if (
    ![
      "tutorial",
      "maps",
      "setup",
      "organize",
      "clean",
      "quiz",
      "result",
    ].includes(s.step) ||
    typeof s.name !== "string" ||
    !validName(s.name) ||
    !["rabbit", "bear", "cat", "bird"].includes(s.character)
  )
    return false;
  if (
    typeof s.tutorialDone !== "boolean" ||
    typeof s.ventilated !== "boolean" ||
    typeof s.toolsStored !== "boolean" ||
    !(
      s.quizCorrectCount === undefined ||
      s.quizCorrectCount === null ||
      (Number.isInteger(s.quizCorrectCount) &&
        s.quizCorrectCount >= 0 &&
        s.quizCorrectCount <= 3)
    )
  )
    return false;
  if (
    !Array.isArray(s.extras) ||
    s.extras.length > 3 ||
    new Set(s.extras).size !== s.extras.length ||
    s.extras.some((id) => typeof id !== "string")
  )
    return false;
  if (
    !Array.isArray(s.cleaned) ||
    new Set(s.cleaned).size !== s.cleaned.length ||
    s.cleaned.some((n) => !Number.isInteger(n) || n < 0 || n > 3)
  )
    return false;
  if (
    !s.placements ||
    typeof s.placements !== "object" ||
    Array.isArray(s.placements)
  )
    return false;
  if (s.step !== "tutorial" && !s.tutorialDone) return false;
  if (["tutorial", "maps"].includes(s.step))
    return (
      s.mapId === null &&
      s.mapRevision === null &&
      s.extras.length === 0 &&
      Object.keys(s.placements).length === 0 &&
      !s.ventilated &&
      !s.toolsStored &&
      s.cleaned.length === 0
    );
  if (
    typeof s.mapId !== "string" ||
    !physicalMaps[s.mapId] ||
    mapsById[s.mapId]?.revision !== s.mapRevision
  )
    return false;
  const map = mapsById[s.mapId],
    geometry = physicalMaps[s.mapId];
  if (s.extras.some((id) => !map.extras.some((i) => i.id === id))) return false;
  if (s.step === "setup")
    return (
      Object.keys(s.placements).length === 0 &&
      !s.ventilated &&
      s.cleaned.length === 0 &&
      !s.toolsStored
    );
  const items = activeItems(s.mapId, s.extras);
  if (
    Object.keys(s.placements).length !== items.length ||
    Object.keys(s.placements).some((id) => !items.some((i) => i.id === id))
  )
    return false;
  if (placementIssues(s).size) return false;
  if (s.cleaned.length && !s.ventilated) return false;
  if (
    s.cleaned.includes(2) &&
    (!s.cleaned.includes(0) || !s.cleaned.includes(1))
  )
    return false;
  if (s.cleaned.includes(3) && !s.cleaned.includes(2)) return false;
  if (s.toolsStored && s.cleaned.length !== 4) return false;
  if (
    s.step === "organize" &&
    (s.ventilated || s.cleaned.length || s.toolsStored)
  )
    return false;
  if (["quiz", "result"].includes(s.step) && !s.toolsStored) return false;
  return true;
}
export function readSaved(
  storage: Storage,
  href: string,
): { saved?: Session; notice?: string } {
  try {
    const key = storageKey(href);
    storage.removeItem(key.replace(":v2:", ":v1:"));
    const raw = storage.getItem(key);
    if (!raw) return {};
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      storage.removeItem(key);
      return { notice: "저장된 활동을 이어 갈 수 없어 새로 시작해요." };
    }
    // The new front drawings rest on their bases. Preserve old positions/progress;
    // only migrate their old in-plane rotation, then run every normal validation.
    if (parsed && typeof parsed === "object") {
      const candidate = parsed as Session;
      if (typeof candidate.mapId === "string" && physicalMaps[candidate.mapId] &&
        Array.isArray(candidate.extras) && candidate.placements && typeof candidate.placements === "object") {
        const placements = { ...candidate.placements };
        for (const item of activeItems(candidate.mapId, candidate.extras)) {
          const p = placements[item.id];
          const surface = physicalMaps[candidate.mapId].surfaces.find(s => s.id === p?.surface);
          if (p && surface && ["cap", "sun-hat", "pillow", "cushion", "glue-stick"].includes(item.asset) &&
            Number.isFinite(p.angle) && p.angle >= -180 && p.angle <= 180 &&
            poseOf(assetsById[item.asset], surface, candidate.mapId, p) === "upright")
            placements[item.id] = { ...p, angle: 0 };
        }
        parsed = { ...candidate, placements };
      }
    }
    if (validateSession(parsed)) {
      const restored = {
        ...parsed,
        quizCorrectCount: parsed.quizCorrectCount ?? null,
      };
      return {
        saved:
          restored.step === "setup"
            ? reducer(restored, { type: "CONFIRM_SET" })
            : restored,
      };
    }
    storage.removeItem(key);
    return { notice: "저장된 활동을 이어 갈 수 없어 새로 시작해요." };
  } catch {
    return {
      notice:
        "이 기기에서는 이어하기를 저장할 수 없어요. 새로고침하지 말고 활동을 마쳐 주세요.",
    };
  }
}
export function saveSession(storage: Storage, href: string, state: Session) {
  const key = storageKey(href);
  if (state.step === "end") {
    storage.removeItem(key);
    return;
  }
  if (["landing", "profile"].includes(state.step)) return;
  storage.setItem(key, JSON.stringify(state));
}
