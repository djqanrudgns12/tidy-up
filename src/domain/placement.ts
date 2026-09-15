import type { AssetDefinition, Placement, Point, Pose, Surface } from "./types";
import artMetrics from "../data/art-metrics.json";

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
export function sizeOf(
  asset: AssetDefinition,
  mapId: string,
): [number, number] {
  const box = (mapId === "school-desk" ? schoolSizes[asset.id] : undefined) ?? [
    asset.width,
    asset.height,
  ];
  const metric = (
    artMetrics as Record<string, { width: number; height: number }>
  )[asset.id];
  if (!metric) return box as [number, number];
  const scale = Math.min(box[0] / metric.width, box[1] / metric.height);
  return [metric.width * scale, metric.height * scale];
}
export function poseOf(asset: AssetDefinition, surface: Surface): Pose {
  return surface.pose ?? (asset.standing ? "upright" : "flat");
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
  const [w, h] = sizeOf(asset, mapId),
    pose = poseOf(asset, surface);
  const angle = pose === "flat" ? (placement.angle * Math.PI) / 180 : 0;
  const depth = pose === "flat" ? h : w * 0.3;
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
  if (surface.anchor)
    return (
      Math.hypot(
        placement.x - surface.anchor.x,
        placement.y - surface.anchor.y,
      ) < 0.01
    );
  if (
    surface.maxHeight &&
    poseOf(asset, surface) === "upright" &&
    sizeOf(asset, mapId)[1] > surface.maxHeight
  )
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
  angle = 0,
): Placement {
  const pose = poseOf(asset, surface);
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
