import { assetsById } from "../data/catalog";
import { mapsById } from "../data/maps";
import { physicalMaps } from "../data/physical";
import {
  acceptsAsset,
  distanceToPolygon,
  fitsSurface,
  footprint,
  footprintsOverlap,
  normalizePlacement,
  placementAngles,
  pointInPolygon,
  poseOf,
  settleOnSurface,
  separationVectors,
  sizeOf,
} from "./placement";
import type { ItemDefinition, Placement, Point, Surface } from "./types";

export type Step =
  | "landing"
  | "profile"
  | "tutorial"
  | "maps"
  | "setup"
  | "organize"
  | "clean"
  | "quiz"
  | "result"
  | "end";
export type Tool = "duster" | "broom" | "cloth";
export type Session = {
  schemaVersion: 2;
  contentVersion: "2026-09-16.4";
  sessionId: string;
  revision: number;
  updatedAt: number;
  step: Step;
  name: string;
  character: string;
  tutorialDone: boolean;
  mapId: string | null;
  mapRevision: number | null;
  extras: string[];
  placements: Record<string, Placement>;
  ventilated: boolean;
  cleaned: number[];
  toolsStored: boolean;
  quizCorrectCount: number | null;
};
export const makeSession = (): Session => ({
  schemaVersion: 2,
  contentVersion: "2026-09-16.4",
  sessionId: crypto.randomUUID(),
  revision: 0,
  updatedAt: Date.now(),
  step: "landing",
  name: "",
  character: "rabbit",
  tutorialDone: false,
  mapId: null,
  mapRevision: null,
  extras: [],
  placements: {},
  ventilated: false,
  cleaned: [],
  toolsStored: false,
  quizCorrectCount: null,
});
export function activeItems(mapId: string, extras: string[]): ItemDefinition[] {
  const map = mapsById[mapId];
  return [
    ...map.base,
    ...map.extras.filter((item) => extras.includes(item.id)),
  ];
}
export function initialPlacements(
  mapId: string,
  extras: string[],
): Record<string, Placement> {
  const geometry = physicalMaps[mapId];
  return Object.fromEntries(
    activeItems(mapId, extras).map((item, i) => {
      const p = i < 8 ? geometry.initial[i] : geometry.slots[i - 8];
      const surface = geometry.surfaces.find((s) => s.id === p.surface)!;
      return [
        item.id,
        normalizePlacement(assetsById[item.asset], p, surface, p.angle, mapId),
      ];
    }),
  );
}
export function initialSignature(state: Session) {
  return JSON.stringify([
    state.contentVersion,
    state.mapId,
    state.mapRevision,
    activeItems(state.mapId!, state.extras).map((i) => [i.id, i.asset]),
  ]);
}
export function unfinished(state: Session) {
  if (!state.mapId) return [];
  const invalid = placementIssues(state);
  return activeItems(state.mapId, state.extras).filter((item) => {
    const p = state.placements[item.id],
      s = physicalMaps[state.mapId!].surfaces.find((s) => s.id === p?.surface);
    return (
      invalid.has(item.id) ||
      !s ||
      (item.asset === "paper-scrap" ? s.zone !== 5 : s.id === "floor") ||
      !fitsSurface(assetsById[item.asset], p, s, state.mapId!)
    );
  });
}
/** The same physical invariants apply to a move, restored activity, and completion. */
export function placementIssues(state: Session): Set<string> {
  const invalid = new Set<string>();
  if (!state.mapId) return invalid;
  const mapId = state.mapId,
    geometry = physicalMaps[mapId],
    items = activeItems(mapId, state.extras);
  const surfaces = new Map(geometry.surfaces.map((s) => [s.id, s]));
  for (const item of items) {
    const p = state.placements[item.id],
      surface = surfaces.get(p?.surface),
      asset = assetsById[item.asset];
    if (
      !p ||
      !surface ||
      ![p.x, p.y, p.angle].every(Number.isFinite) ||
      p.angle < -180 ||
      p.angle > 180 ||
      (poseOf(asset, surface, state.mapId!) !== "flat" && p.angle !== 0) ||
      !fitsSurface(asset, p, surface, mapId)
    ) {
      invalid.add(item.id);
      continue;
    }
    if (p.stackOn !== undefined) {
      const lowerItem = items.find((i) => i.id === p.stackOn),
        lower = state.placements[p.stackOn];
      if (
        !lowerItem ||
        !lower ||
        lowerItem.id === item.id ||
        lower.stackOn ||
        lower.surface !== p.surface ||
        poseOf(asset, surface, state.mapId!) !== "flat" ||
        !(asset.book || asset.id === "document-folder") ||
        !(
          assetsById[lowerItem.asset].book ||
          lowerItem.asset === "document-folder"
        ) ||
        items.filter((i) => state.placements[i.id]?.stackOn === p.stackOn)
          .length !== 1
      ) {
        invalid.add(item.id);
        continue;
      }
      const polygon = footprint(
        assetsById[lowerItem.asset],
        lower,
        surface,
        mapId,
      ).flatMap((v) => [v.x, v.y]);
      if (
        !footprint(asset, p, surface, mapId).every((v) =>
          pointInPolygon(v, polygon),
        )
      )
        invalid.add(item.id);
    }
  }
  for (let i = 0; i < items.length; i++)
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i],
        b = items[j],
        ap = state.placements[a.id],
        bp = state.placements[b.id];
      const as = surfaces.get(ap?.surface),
        bs = surfaces.get(bp?.surface);
      if (
        !as ||
        !bs ||
        !ap ||
        !bp ||
        (as.supportKey ?? as.id) !== (bs.supportKey ?? bs.id)
      )
        continue;
      if (
        (ap.stackOn === b.id && !invalid.has(a.id)) ||
        (bp.stackOn === a.id && !invalid.has(b.id))
      )
        continue;
      if (
        footprintsOverlap(
          footprint(assetsById[a.asset], ap, as, mapId),
          footprint(assetsById[b.asset], bp, bs, mapId),
        )
      ) {
        invalid.add(a.id);
        invalid.add(b.id);
      }
    }
  return invalid;
}
export function collisionWith(
  state: Session,
  item: ItemDefinition,
  p: Placement,
  surface: Surface,
) {
  const mapId = state.mapId!,
    shape = footprint(assetsById[item.asset], p, surface, mapId);
  return activeItems(mapId, state.extras).find((other) => {
    if (other.id === item.id || other.id === p.stackOn) return false;
    const op = state.placements[other.id],
      os = physicalMaps[mapId].surfaces.find((s) => s.id === op.surface)!;
    if ((os.supportKey ?? os.id) !== (surface.supportKey ?? surface.id))
      return false;
    return footprintsOverlap(
      shape,
      footprint(assetsById[other.asset], op, os, mapId),
    );
  });
}
export function tryPlacement(
  state: Session,
  id: string,
  point: Point,
  surfaceId?: string,
  angle?: number,
): { placement?: Placement; message: string } {
  if (state.step !== "organize" || !state.mapId)
    return { message: "지금은 물건을 옮길 수 없어요." };
  if (![point.x, point.y, angle ?? 0].every(Number.isFinite))
    return { message: "물건을 놓을 위치를 다시 골라 주세요." };
  const item = activeItems(state.mapId, state.extras).find((i) => i.id === id);
  if (!item) return { message: "먼저 옮길 물건을 골라 주세요." };
  const asset = assetsById[item.asset],
    geometry = physicalMaps[state.mapId],
    old = state.placements[id];
  if (Object.values(state.placements).some((v) => v.stackOn === id))
    return { message: "위에 놓인 책을 먼저 옮겨 주세요." };
  const oldSurface = geometry.surfaces.find((s) => s.id === old.surface)!;
  const handle = {
    x: point.x,
    y:
      poseOf(asset, oldSurface, state.mapId) === "upright"
        ? point.y - sizeOf(asset, state.mapId)[1] * 0.94
        : point.y,
  };
  const hook =
    item.asset === "backpack"
      ? geometry.surfaces.find(
          (s) => s.anchor && pointInPolygon(handle, s.polygon),
        )
      : undefined;
  const reach = (s: Surface) =>
    distanceToPolygon(point, s.entryPolygon ?? s.polygon);
  // A directly targeted support wins, even when it is not the item's suggested category.
  // Do not escape a full/unsuitable shelf by silently sending the item to another shelf.
  const direct = geometry.surfaces.filter((s) => reach(s) === 0);
  const matches = surfaceId
    ? geometry.surfaces.filter((s) => s.id === surfaceId)
    : hook
      ? [hook]
      : (direct.length ? direct : geometry.surfaces)
          .map((s, order) => ({
            s,
            order,
            rank: reach(s),
          }))
          .filter(({ s }) => reach(s) <= SNAP_RADIUS)
          .sort((a, b) => a.rank - b.rank || b.order - a.order)
          .map(({ s }) => s);
  // Rotating keeps the item where it is; only a small shift is allowed to make room.
  const rotating = surfaceId !== undefined && angle !== undefined;
  const done = (p: Placement, surface: Surface, note: string) => ({
    placement: p,
    message: `${note}놓은 곳: ${surface.label}`,
  });
  let blocked = "";
  for (const surface of matches) {
    if (!acceptsAsset(asset, surface)) {
      blocked ||= surface.zone === 5
        ? "휴지통에는 필요 없어진 종이만 넣어요. 이 물건은 선반이나 다른 자리에 놓아 주세요."
        : "이 물건은 이곳에 놓기 어려워요. 다른 받침면을 골라 주세요.";
      continue;
    }
    const angles = rotating ? [angle] : placementAngles(asset, surface, state.mapId, angle ?? old.angle);
    const origin = normalizePlacement(asset, supportPointFor(point, surface), surface, angles[0], state.mapId);
    const maxShift = rotating ? 40 : 48;
    for (const a of angles) {
      const exact = placeAt(state, item, point, surface, a);
      if (exact.placement && Math.hypot(exact.placement.x-origin.x, exact.placement.y-origin.y) <= maxShift)
        return done(exact.placement, surface,
          a !== angles[0] ? "선반에 맞게 방향을 돌려 놓았어요. " :
          exact.nudged ? "다른 물건과 닿아서 조금 옆으로 놓았어요. " : "");
      blocked ||= exact.message;
    }
    if (surface.anchor) continue;
    for (const a of angles) {
      const p = freeSpot(state, item, origin, surface, a, maxShift);
      if (p) return done(p, surface, "가까운 빈자리에 맞춰 놓았어요. ");
    }
  }
  return {
    message:
      blocked ||
      "이 자리에는 물건을 받칠 공간이 부족해요. 같은 선반의 넓은 곳이나 다른 자리를 골라 주세요.",
  };
}

/** World pixels (960 × 720). Students drop roughly; the lesson is choosing the place, not aiming. */
const SNAP_RADIUS = 120;

function supportPointFor(point: Point, surface: Surface): Point {
  return surface.entryOffsetY && surface.entryPolygon &&
    pointInPolygon(point, surface.entryPolygon) && !pointInPolygon(point, surface.polygon)
    ? { ...point, y: point.y + surface.entryOffsetY } : point;
}

/** The drop exactly where it was released, with the small edge settle, book stack, and nudge. */
function placeAt(
  state: Session,
  item: ItemDefinition,
  point: Point,
  surface: Surface,
  angle: number,
): { placement?: Placement; nudged?: boolean; message: string } {
  const mapId = state.mapId!,
    asset = assetsById[item.asset],
    id = item.id;
  const supportPoint = supportPointFor(point, surface);
  let p = settleOnSurface(
    asset,
    normalizePlacement(asset, supportPoint, surface, angle, mapId),
    surface,
    mapId,
  );
  if (!p) return { message: "" };
  const collision = collisionWith(state, item, p, surface);
  let nudged = false;
  if (collision) {
    // Only flat books may form one supported two-book stack. The top book must fit on the lower cover.
    const lowerAsset = assetsById[collision.asset],
      lower = state.placements[collision.id];
    if (
      (asset.book || asset.id === "document-folder") &&
      (lowerAsset.book || lowerAsset.id === "document-folder") &&
      poseOf(asset, surface, mapId) === "flat" &&
      !lower.stackOn &&
      !Object.values(state.placements).some(
        (v) => v.stackOn === collision.id && v !== state.placements[id],
      )
    ) {
      const lowerPoly = footprint(lowerAsset, lower, surface, mapId).flatMap(
        (v) => [v.x, v.y],
      );
      if (
        footprint(asset, p, surface, mapId).every((v) =>
          pointInPolygon(v, lowerPoly),
        )
      )
        p.stackOn = collision.id;
    }
    if (!p.stackOn) {
      const separated = nudgeApart(state, item, p, surface);
      if (!separated)
        return {
          message:
            "이 자리는 다른 물건이 차지하고 있어요. 조금 더 떨어진 곳에 놓아 주세요.",
        };
      p = separated;
      nudged = true;
    }
  }
  if (
    placementIssues({
      ...state,
      placements: { ...state.placements, [id]: p },
    }).has(id)
  )
    return { message: "다른 물건과 겹치지 않게 조금 옆에 놓아 주세요." };
  return { placement: p, nudged, message: "" };
}

/** The empty spot on this support closest to a rough drop; other objects never move. */
function freeSpot(
  state: Session,
  item: ItemDefinition,
  point: Point,
  surface: Surface,
  angle: number,
  maxShift: number,
): Placement | undefined {
  const mapId = state.mapId!,
    asset = assetsById[item.asset],
    xs = surface.polygon.filter((_, i) => i % 2 === 0),
    ys = surface.polygon.filter((_, i) => i % 2 === 1);
  const [left, right, top, bottom] = [
    Math.min(...xs),
    Math.max(...xs),
    Math.min(...ys),
    Math.max(...ys),
  ];
  const step = Math.min(
    12,
    Math.max(3, Math.sqrt(((right - left) * (bottom - top)) / 2500)),
  );
  const spots: Point[] = [];
  for (let x = left; x <= right; x += step)
    if (surface.baseline !== undefined) spots.push({ x, y: surface.baseline });
    else
      for (let y = top; y <= bottom; y += step)
        if (pointInPolygon({ x, y }, surface.polygon)) spots.push({ x, y });
  const distance = (s: Point) => Math.hypot(s.x - point.x, s.y - point.y);
  for (const spot of spots.sort((a, b) => distance(a) - distance(b))) {
    const p = normalizePlacement(asset, spot, surface, angle, mapId);
    if (Math.hypot(p.x - point.x, p.y - point.y) > maxShift) break;
    if (
      !fitsSurface(asset, p, surface, mapId) ||
      collisionWith(state, item, p, surface)
    )
      continue;
    if (
      !placementIssues({
        ...state,
        placements: { ...state.placements, [item.id]: p },
      }).has(item.id)
    )
      return p;
  }
}

function nudgeApart(
  state: Session,
  item: ItemDefinition,
  start: Placement,
  surface: Surface,
): Placement | undefined {
  if (surface.anchor) return;
  const mapId = state.mapId!,
    asset = assetsById[item.asset],
    queue = [start],
    seen = new Set<string>();
  for (let index = 0; index < queue.length && index < 64; index++) {
    const p = queue[index];
    const collision = collisionWith(state, item, p, surface);
    if (!collision) return p;
    const other = state.placements[collision.id],
      otherSurface = physicalMaps[mapId].surfaces.find(
        (s) => s.id === other.surface,
      )!;
    const vectors = separationVectors(
      footprint(asset, p, surface, mapId),
      footprint(assetsById[collision.asset], other, otherSurface, mapId),
    );
    for (const vector of vectors) {
      const next = {
        ...p,
        x: p.x + vector.x,
        y: surface.baseline ?? p.y + vector.y,
      };
      const key = `${next.x.toFixed(1)},${next.y.toFixed(1)}`;
      if (
        seen.has(key) ||
        Math.hypot(next.x - start.x, next.y - start.y) > 36 ||
        !fitsSurface(asset, next, surface, mapId)
      )
        continue;
      seen.add(key);
      queue.push(next);
    }
  }
}
/** Add/remove one optional object without resetting any existing placement. */
export function toggleExtra(state: Session, id: string): { state: Session; message: string } {
  if (!state.mapId || !["setup", "organize"].includes(state.step))
    return { state, message: "" };
  const item = mapsById[state.mapId].extras.find((candidate) => candidate.id === id);
  if (!item) return { state, message: "" };
  const objectName = `${item.label}${(item.label.charCodeAt(item.label.length - 1) - 0xac00) % 28 === 0 ? "를" : "을"}`;
  const removing = state.extras.includes(id);
  if (!removing && state.extras.length >= 3)
    return { state, message: "3개까지 꺼낼 수 있어요. 다른 물건을 꺼내려면 하나를 먼저 넣어 주세요." };
  if (removing && Object.values(state.placements).some((p) => p.stackOn === id))
    return { state, message: "이 물건 위에 다른 물건이 있어요. 위의 물건을 먼저 옮겨 주세요." };
  const extras = removing ? state.extras.filter((value) => value !== id) : [...state.extras, id].sort();
  if (state.step === "setup") return { state: { ...state, extras }, message: "" };
  const placements = { ...state.placements };
  if (removing) {
    delete placements[id];
    return { state: { ...state, extras, placements }, message: `${objectName} 다시 넣었어요.` };
  }
  const geometry = physicalMaps[state.mapId];
  const candidate = { ...state, extras, placements };
  for (const slot of geometry.slots) {
    const surface = geometry.surfaces.find((s) => s.id === slot.surface)!;
    const placement = normalizePlacement(assetsById[item.asset], slot, surface, slot.angle, state.mapId);
    if (fitsSurface(assetsById[item.asset], placement, surface, state.mapId) &&
        !collisionWith(candidate, item, placement, surface)) {
      placements[id] = placement;
      return { state: candidate, message: `${objectName} 꺼냈어요. 놓을 자리를 정해 주세요.` };
    }
  }
  // Search only the existing arrival surface. Never move another object to make room.
  for (const slot of geometry.slots) {
    const surface = geometry.surfaces.find((s) => s.id === slot.surface)!;
    const placement = freeSpot(candidate, item, slot, surface, slot.angle, 960);
    if (placement) {
      placements[id] = placement;
      return { state: candidate, message: `${objectName} 빈자리에 꺼냈어요. 놓을 자리를 정해 주세요.` };
    }
  }
  return { state, message: "물건을 꺼낼 빈자리가 부족해요. 바닥의 물건을 먼저 정리해 주세요." };
}

export function availableTool(state: Session): Tool | null {
  if (!state.ventilated) return null;
  if (!state.cleaned.includes(0) || !state.cleaned.includes(1)) return "duster";
  if (!state.cleaned.includes(2)) return "broom";
  if (!state.cleaned.includes(3)) return "cloth";
  return null;
}
export type Action =
  | { type: "BEGIN" }
  | { type: "PROFILE"; name: string; character: string }
  | { type: "TUTORIAL_DONE" }
  | { type: "MAP"; mapId: string }
  | { type: "EXTRA"; id: string }
  | { type: "CONFIRM_SET" }
  | { type: "MOVE"; id: string; placement: Placement }
  | { type: "START_CLEAN" }
  | { type: "VENTILATE" }
  | { type: "CLEAN"; spot: number; tool: Tool }
  | { type: "STORE_TOOLS" }
  | { type: "QUIZ_DONE"; correctCount: number }
  | { type: "RESET" }
  | { type: "CHANGE_ITEMS" }
  | { type: "CHANGE_MAP" }
  | { type: "END" }
  | { type: "NEW" };
export function validName(input: string) {
  const name = input.normalize("NFC").trim();
  return (
    [...name].length >= 1 &&
    [...name].length <= 10 &&
    /^[ㄱ-ㅎㅏ-ㅣ가-힣a-zA-Z0-9 ]+$/u.test(name)
  );
}
export function reducer(state: Session, action: Action): Session {
  let next = state;
  switch (action.type) {
    case "NEW":
      return makeSession();
    case "BEGIN":
      if (state.step === "landing" || state.step === "end")
        next = { ...makeSession(), step: "profile" };
      break;
    case "PROFILE":
      if (
        state.step === "profile" &&
        validName(action.name) &&
        ["rabbit", "bear", "cat", "bird"].includes(action.character)
      )
        next = {
          ...state,
          name: action.name.normalize("NFC").trim(),
          character: action.character,
          step: "tutorial",
        };
      break;
    case "TUTORIAL_DONE":
      if (state.step === "tutorial")
        next = { ...state, tutorialDone: true, step: "maps" };
      break;
    case "MAP":
      if (state.step === "maps" && physicalMaps[action.mapId])
        next = {
          ...state,
          mapId: action.mapId,
          mapRevision: mapsById[action.mapId].revision,
          extras: [],
          placements: initialPlacements(action.mapId, []),
          cleaned: [],
          ventilated: false,
          toolsStored: false,
          quizCorrectCount: null,
          step: "organize",
        };
      break;
    case "EXTRA":
      next = toggleExtra(state, action.id).state;
      break;
    case "CONFIRM_SET":
      if (state.step === "setup" && state.mapId)
        next = {
          ...state,
          step: "organize",
          placements: initialPlacements(state.mapId, state.extras),
        };
      break;
    case "MOVE": {
      const checked = tryPlacement(
        state,
        action.id,
        action.placement,
        action.placement.surface,
        action.placement.angle,
      );
      if (checked.placement)
        next = {
          ...state,
          placements: { ...state.placements, [action.id]: checked.placement },
        };
      break;
    }
    case "START_CLEAN":
      // Students may move on with items left over; the lesson does not block on placement.
      if (state.step === "organize") next = { ...state, step: "clean" };
      break;
    case "VENTILATE":
      if (state.step === "clean") next = { ...state, ventilated: true };
      break;
    case "CLEAN":
      if (
        state.step === "clean" &&
        state.mapId &&
        !state.cleaned.includes(action.spot) &&
        physicalMaps[state.mapId].dirt[action.spot]?.tool === action.tool &&
        availableTool(state) === action.tool
      )
        next = { ...state, cleaned: [...state.cleaned, action.spot].sort() };
      break;
    case "STORE_TOOLS":
      if (
        state.step === "clean" &&
        state.cleaned.length === 4 &&
        state.ventilated
      )
        next = { ...state, toolsStored: true, step: "quiz" };
      break;
    case "QUIZ_DONE":
      if (
        state.step === "quiz" &&
        state.toolsStored &&
        Number.isInteger(action.correctCount) &&
        action.correctCount >= 0 &&
        action.correctCount <= 3
      )
        next = {
          ...state,
          quizCorrectCount: action.correctCount,
          step: "result",
        };
      break;
    case "RESET":
      if (
        state.mapId &&
        ["organize", "clean", "quiz", "result"].includes(state.step)
      )
        next = {
          ...state,
          step: "organize",
          placements: initialPlacements(state.mapId, state.extras),
          ventilated: false,
          cleaned: [],
          toolsStored: false,
          quizCorrectCount: null,
        };
      break;
    case "CHANGE_ITEMS":
      if (state.step === "organize")
        next = {
          ...state,
          step: "setup",
          placements: {},
          ventilated: false,
          cleaned: [],
          toolsStored: false,
          quizCorrectCount: null,
        };
      break;
    case "CHANGE_MAP":
      if (["setup", "organize", "clean"].includes(state.step))
        next = {
          ...state,
          step: "maps",
          mapId: null,
          mapRevision: null,
          extras: [],
          placements: {},
          ventilated: false,
          cleaned: [],
          toolsStored: false,
          quizCorrectCount: null,
        };
      break;
    case "END":
      if (state.step === "result") next = { ...makeSession(), step: "end" };
      break;
  }
  return next === state
    ? state
    : { ...next, revision: state.revision + 1, updatedAt: Date.now() };
}
