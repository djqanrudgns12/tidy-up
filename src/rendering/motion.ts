import { assetsById } from "../data/catalog";
import { poseOf, sizeOf } from "../domain/placement";
import type {
  ItemDefinition,
  PhysicalMap,
  Placement,
  Surface,
} from "../domain/types";

export type PlacementMotion = {
  id: string;
  from: Placement;
  to: Placement;
  progress: number;
  kind?: "return";
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => 1 - (1 - t) ** 3;
/** Lift out through the old opening, carry above furniture, then lower behind the new lip. */
export function motionFrame(
  motion: PlacementMotion,
  item: ItemDefinition,
  geometry: PhysicalMap,
  mapId: string,
) {
  const a = geometry.surfaces.find((s) => s.id === motion.from.surface)!;
  const b = geometry.surfaces.find((s) => s.id === motion.to.surface)!;
  const asset = assetsById[item.asset],
    [, h] = sizeOf(asset, mapId);
  const centerOffset = (s: Surface) =>
    poseOf(asset, s) === "flat"
      ? 0
      : poseOf(asset, s) === "upright"
        ? -h / 2
        : h * 0.44;
  const fromCenter =
      motion.from.y - (motion.from.stackOn ? 4 : 0) + centerOffset(a),
    toCenter = motion.to.y - (motion.to.stackOn ? 4 : 0) + centerOffset(b);
  const different = motion.from.surface !== b.id;
  const sourceLift = different ? (a.insertion?.lift ?? (a.anchor ? 24 : 0)) : 0;
  const extractionEnd = sourceLift ? 0.24 : 0;
  if (sourceLift && motion.progress < extractionEnd) {
    const q = ease(motion.progress / extractionEnd);
    return {
      placement: motion.from,
      surface: a,
      elevation: sourceLift * q,
      inside: true,
      shadowStrength: 1 - 0.75 * q,
    };
  }
  const insert = b.insertion && different;
  const boundary = insert ? 0.66 : 1;
  const t = ease(
    Math.min(
      1,
      Math.max(
        0,
        (motion.progress - extractionEnd) / (boundary - extractionEnd),
      ),
    ),
  );
  const q = insert
    ? ease(Math.max(0, (motion.progress - boundary) / (1 - boundary)))
    : 1;
  const lift = insert ? b.insertion!.lift : 0;
  const entry = !!insert && motion.progress >= boundary;
  const surface = { ...b, depth: mix(a.depth, b.depth, t) };
  const angle = ((motion.to.angle - motion.from.angle + 540) % 360) - 180;
  const placement = {
    ...motion.to,
    x: mix(motion.from.x, motion.to.x, t),
    y:
      mix(fromCenter, toCenter, t) -
      centerOffset(b) +
      (motion.to.stackOn ? 4 : 0),
    angle: motion.from.angle + angle * t,
  };
  const sliding =
    motion.from.surface === motion.to.surface && motion.kind !== "return";
  const elevation = insert
    ? mix(sourceLift, lift, t) * (1 - q)
    : sliding
      ? 0
      : sourceLift * (1 - t) + 12 * Math.sin(Math.PI * t);
  return {
    placement,
    surface,
    elevation,
    inside: entry || motion.progress >= 0.9,
    shadowStrength: sliding
      ? 1
      : entry
        ? 0.25 + 0.75 * q
        : Math.max(0, (motion.progress - 0.8) * 5),
  };
}
