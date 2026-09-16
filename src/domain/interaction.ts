import { assetsById } from "../data/catalog";
import { hasShelfView,hasHangingView } from "../data/scene-art";
import {
  distanceToPolygon,
  normalizePlacement,
  pointInPolygon,
  poseOf,
  sizeOf,
} from "./placement";
import type { ItemDefinition, PhysicalMap, Placement, Point } from "./types";

export type DragGesture = {
  id: string;
  origin: Placement;
  start: Point;
  pointerId: number;
  started: boolean;
};
export function advanceDrag(gesture: DragGesture, point: Point, scale: number) {
  gesture.started ||=
    Math.hypot(point.x - gesture.start.x, point.y - gesture.start.y) >=
    5 / scale;
  return {
    ...gesture.origin,
    x: gesture.origin.x + point.x - gesture.start.x,
    y: gesture.origin.y + point.y - gesture.start.y,
  };
}
/** Keep the grabbed point on the sprite when its support changes from sole to handle. */
export function dragPlacement(
  item: ItemDefinition,
  moved: Placement,
  geometry: PhysicalMap,
  mapId: string,
): Placement {
  const asset = assetsById[item.asset],
    oldSurface = geometry.surfaces.find((s) => s.id === moved.surface)!;
  // The carried book retains its grabbed view; settling animates the support change.
  if (hasShelfView(asset,mapId) || hasHangingView(asset,mapId)) return moved;
  const pose = poseOf(asset, oldSurface, mapId),
    [, h] = sizeOf(asset, mapId, oldSurface);
  if (pose === "flat") return moved;
  const bottom = {
    x: moved.x,
    y: moved.y + (pose === "hanging" ? h * 0.94 : 0),
  };
  const handle = { x: moved.x, y: bottom.y - h * 0.94 };
  const hook = geometry.surfaces.find(
    (s) => s.anchor && pointInPolygon(handle, s.polygon),
  );
  if (
    hook &&
    [
      "backpack",
      "tote-bag",
      "shoe-bag",
      "hanger",
      "jacket",
      "cardigan",
      "umbrella",
    ].includes(asset.id)
  )
    return normalizePlacement(asset, handle, hook, 0, mapId);
  const support = geometry.surfaces
    .filter((s) => !s.anchor && distanceToPolygon(bottom, s.polygon) <= 24)
    .sort(
      (a, b) =>
        distanceToPolygon(bottom, a.polygon) -
        distanceToPolygon(bottom, b.polygon),
    )[0];
  return support ? normalizePlacement(asset, bottom, support, 0, mapId) : moved;
}
