import type { AssetDefinition, Placement, Point, Pose, Surface } from "./types";
import artMetrics from "../data/art-metrics.json";
import { hasShelfView, hasHangingView, hangingContact, sceneArtwork } from "../data/scene-art";

export const WORLD = { width: 960, height: 720 };
export const schoolSizes: Record<string, [number, number]> = {
  textbook: [146, 184],
  notebook: [130, 164],
  "homework-diary": [92, 116],
  "document-folder": [136, 176],
  backpack: [156, 210],
  "water-bottle": [54, 148],
  "pencil-case": [143, 55],
  pencil: [126, 12],
  eraser: [37, 22],
  ruler: [159, 18],
  "pencil-sharpener": [40, 37],
  "glue-stick": [24, 62],
  scissors: [64, 118],
  "paper-scrap": [70, 76],
};
// Fixed physical sizes across floor, carrying and storage; never shrink on entry.
const cabinetSizes: Record<string, [number, number]> = {
  "board-game": [110,88], "puzzle-box": [110,88], "card-game": [76,76],
  "colored-pencils": [49,85], "felt-pens": [49,85], "origami-paper": [55,55],
  palette: [62,62], "brush-case": [37,88], scissors: [64,100],
  "glue-stick": [26,62], tape: [54,54], "paper-scrap": [48,48],
};
const lockerSizes: Record<string, [number, number]> = {
  textbook:[88,114], notebook:[79,102], "document-folder":[92,120],
  "homework-diary":[65,84], "colored-pencils":[46,82], "felt-pens":[46,82],
  "shoe-bag":[84,125], "water-bottle":[40,103], "paper-scrap":[43,48],
  towel:[75,62], "jump-rope":[78,85], "origami-paper":[56,56],
  "paint-set":[97,64], "brush-case":[30,82], "small-pouch":[70,54],
};
const librarySizes: Record<string,[number,number]> = {
  "story-book":[59,66],"science-book":[44,54],"picture-book":[61,61],
  "science-comic":[44,54],dictionary:[48,54],magazine:[46,54],
  "reading-notebook":[47,60],bookmark:[14,55],clipboard:[48,65],
  bookend:[36,46],"pencil-case":[52,25],"paper-scrap":[38,40],
};
const homeDeskSizes: Record<string,[number,number]> = {
 textbook:[78,101],notebook:[71,76],"homework-diary":[55,69],"document-folder":[74,77],
 "pencil-case":[46,23],"colored-pencils":[31,58],headphones:[72,75],"paper-scrap":[43,44],
 calculator:[33,47],scissors:[25,52],tape:[20,20],eraser:[20,12],clipboard:[62,76],"small-pouch":[40,30],
};
const bedroomSizes:Record<string,[number,number]>={
 pajamas:[35,45],"t-shirt":[35,41],trousers:[33,48],socks:[24,28],
 pillow:[128,58],blanket:[112,88],"story-book":[43,53],"paper-scrap":[31,33],
 "bed-sheet":[68,65],cushion:[66,66],backpack:[58,72],comb:[48,16],"small-pouch":[45,32],"pocket-tissue":[46,30],
};
export function sizeOf(
  asset: AssetDefinition,
  mapId: string,
  surface?: Surface,
): [number, number] {
  const box = (mapId === "school-desk" ? schoolSizes[asset.id] : mapId === "classroom-cabinet" ? cabinetSizes[asset.id] : mapId === "locker" ? lockerSizes[asset.id] : mapId === "library" ? librarySizes[asset.id] : mapId === "home-desk" ? homeDeskSizes[asset.id] : mapId === "bedroom" ? bedroomSizes[asset.id] : undefined) ?? [
    asset.width,
    asset.height,
  ];
  const metric = (
    artMetrics as Record<string, { width: number; height: number }>
  )[sceneArtwork(asset, mapId, surface).metricId];
  if (!metric) return box as [number, number];
  // A book keeps its real height while turning; the new width is the drawn spine perspective.
  if ((surface?.bookSpines && hasShelfView(asset, mapId)) || (surface?.pose==="hanging" && hasHangingView(asset,mapId))) {
    const height = sizeOf(asset, mapId)[1];
    return [height * metric.width / metric.height, height];
  }
  const scale = Math.min(box[0] / metric.width, box[1] / metric.height);
  return [metric.width * scale, metric.height * scale];
}
export function poseOf(asset: AssetDefinition, surface: Surface, mapId: string): Pose {
  return surface.pose ?? (sceneArtwork(asset, mapId, surface).standing ? "upright" : "flat");
}
export function planeSkew(surface: Surface, point: Point) {
  const vanishing = surface.vanishingPoint;
  return vanishing
    ? ((point.x - vanishing.x) / Math.max(1, point.y - vanishing.y)) *
        surface.depth
    : 0;
}
export function pointInPolygon(p: Point, polygon: number[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 2; i < polygon.length; j = i, i += 2) {
    const ax = polygon[i],
      ay = polygon[i + 1],
      bx = polygon[j],
      by = polygon[j + 1];
    const cross = (p.x - ax) * (by - ay) - (p.y - ay) * (bx - ax);
    if (
      Math.abs(cross) < 0.01 &&
      p.x >= Math.min(ax, bx) &&
      p.x <= Math.max(ax, bx) &&
      p.y >= Math.min(ay, by) &&
      p.y <= Math.max(ay, by)
    )
      return true;
    if (
      ay > p.y !== by > p.y &&
      p.x < ((bx - ax) * (p.y - ay)) / (by - ay) + ax
    )
      inside = !inside;
  }
  return inside;
}
export function distanceToPolygon(p: Point, polygon: number[]) {
  if (pointInPolygon(p, polygon)) return 0;
  let distance = Infinity;
  for (let i = 0; i < polygon.length; i += 2) {
    const j = (i + 2) % polygon.length;
    const ax = polygon[i],
      ay = polygon[i + 1],
      dx = polygon[j] - ax,
      dy = polygon[j + 1] - ay;
    const t = Math.max(
      0,
      Math.min(1, ((p.x - ax) * dx + (p.y - ay) * dy) / (dx * dx + dy * dy)),
    );
    distance = Math.min(
      distance,
      Math.hypot(p.x - ax - t * dx, p.y - ay - t * dy),
    );
  }
  return distance;
}
/** Settle a near-edge drop onto its support, without changing the angle or arranging other objects. */
export function settleOnSurface(
  asset: AssetDefinition,
  p: Placement,
  surface: Surface,
  mapId: string,
): Placement | undefined {
  if (fitsSurface(asset, p, surface, mapId)) return p;
  for (let radius = 2; radius <= 24; radius += 2)
    for (let i = 0; i < 24; i++) {
      const angle = (i * Math.PI) / 12;
      const next = {
        ...p,
        x: p.x + Math.cos(angle) * radius,
        y: surface.baseline ?? p.y + Math.sin(angle) * radius,
      };
      if (fitsSurface(asset, next, surface, mapId)) return next;
    }
}
export function footprint(
  asset: AssetDefinition,
  placement: Placement,
  surface: Surface,
  mapId: string,
): Point[] {
  const [w, h] = sizeOf(asset, mapId, surface),
    pose = poseOf(asset, surface, mapId);
  const angle = pose === "flat" ? (placement.angle * Math.PI) / 180 : 0;
  const depth = pose === "flat" ? h : surface.bookSpines && hasShelfView(asset, mapId)
    ? sizeOf(asset, mapId)[0] : (sceneArtwork(asset, mapId, surface).footprintDepth ?? w * 0.3);
  const skew = planeSkew(surface, placement);
  return [
    [-w / 2, -depth / 2],
    [w / 2, -depth / 2],
    [w / 2, depth / 2],
    [-w / 2, depth / 2],
  ].map(([x, y]) => ({
    x:
      placement.x +
      x * Math.cos(angle) -
      y * Math.sin(angle) +
      skew * (x * Math.sin(angle) + y * Math.cos(angle)),
    y:
      placement.y + (x * Math.sin(angle) + y * Math.cos(angle)) * surface.depth,
  }));
}
export function fitsSurface(
  asset: AssetDefinition,
  placement: Placement,
  surface: Surface,
  mapId: string,
) {
  if (surface.accepts && !surface.accepts.includes(asset.id)) return false;
  if (surface.hangingBounds && poseOf(asset,surface,mapId)==="hanging") {
    const [w,h]=sizeOf(asset,mapId,surface),top=placement.y-h*hangingContact(asset,mapId);
    if(![{x:placement.x-w/2,y:top},{x:placement.x+w/2,y:top},{x:placement.x+w/2,y:top+h},{x:placement.x-w/2,y:top+h}].every(p=>pointInPolygon(p,surface.hangingBounds!)))return false;
  }
  if (surface.tiltedPanel && poseOf(asset,surface,mapId)!=="flat") return false;
  if (surface.anchor)
    return (
      Math.hypot(
        placement.x - surface.anchor.x,
        placement.y - surface.anchor.y,
      ) < 0.01
    );
  if (
    surface.maxHeight &&
    poseOf(asset, surface, mapId) === "upright" &&
    sizeOf(asset, mapId, surface)[1] > surface.maxHeight
  )
    return false;
  const [width, height] = sizeOf(asset, mapId, surface);
  const pose = poseOf(asset, surface, mapId);
  const angle = placement.angle * Math.PI / 180;
  const halfSpan = pose === "flat"
    ? (Math.abs(width * Math.cos(angle)) + Math.abs(height * Math.sin(angle))) / 2
    : width / 2;
  if (surface.entryWidth &&
    (placement.x - halfSpan < surface.entryWidth[0] || placement.x + halfSpan > surface.entryWidth[1]))
    return false;
  const aboveSupport = pose === "flat"
    ? (Math.abs(width * Math.sin(angle)) + Math.abs(height * Math.cos(angle))) * surface.depth / 2
    : height;
  if (surface.ceilingY !== undefined &&
    placement.y - aboveSupport - (surface.insertion?.lift ?? 0) < surface.ceilingY)
    return false;
  const points = footprint(asset, placement, surface, mapId);
  return (
    points.every((p) => pointInPolygon(p, surface.polygon)) &&
    !(surface.obstacles ?? []).some((polygon) =>
      footprintsOverlap(
        points,
        Array.from({ length: polygon.length / 2 }, (_, i) => ({
          x: polygon[i * 2],
          y: polygon[i * 2 + 1],
        })),
        0,
      ),
    )
  );
}
export function normalizePlacement(
  asset: AssetDefinition,
  point: Point,
  surface: Surface,
  angle: number,
  mapId: string,
): Placement {
  const pose = poseOf(asset, surface, mapId);
  return {
    surface: surface.id,
    x: surface.anchor?.x ?? point.x,
    y: surface.anchor?.y ?? surface.baseline ?? point.y,
    angle: pose === "flat" ? angle : 0,
  };
}

/** Convex footprints may touch, but cannot pass through each other. */
export function footprintsOverlap(a: Point[], b: Point[], clearance = 1) {
  for (const poly of [a, b])
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i],
        q = poly[(i + 1) % poly.length],
        axis = { x: -(q.y - p.y), y: q.x - p.x };
      const length = Math.hypot(axis.x, axis.y);
      const project = (points: Point[]) =>
        points.map((v) => (v.x * axis.x + v.y * axis.y) / length);
      const ap = project(a),
        bp = project(b);
      if (
        Math.max(...ap) <= Math.min(...bp) + clearance ||
        Math.max(...bp) <= Math.min(...ap) + clearance
      )
        return false;
    }
  return true;
}

/** Candidate translations that separate two convex footprints by a small visible gap. */
export function separationVectors(a: Point[], b: Point[], gap = 2): Point[] {
  const result: Point[] = [];
  for (const poly of [a, b])
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i],
        q = poly[(i + 1) % poly.length],
        length = Math.hypot(q.x - p.x, q.y - p.y);
      if (length < 0.01) continue;
      const axis = { x: -(q.y - p.y) / length, y: (q.x - p.x) / length };
      const ap = a.map((v) => v.x * axis.x + v.y * axis.y),
        bp = b.map((v) => v.x * axis.x + v.y * axis.y);
      for (const distance of [
        Math.min(...bp) - Math.max(...ap) - gap,
        Math.max(...bp) - Math.min(...ap) + gap,
      ])
        result.push({ x: axis.x * distance, y: axis.y * distance });
    }
  return result.sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y));
}
