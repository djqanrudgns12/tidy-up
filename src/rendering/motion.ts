import { assetsById } from "../data/catalog";
import { hasShelfView,hasHangingView,hangingContact } from "../data/scene-art";
import { placementSurface, poseOf, sizeOf } from "../domain/placement";
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
export type BookTurn = { upright: number; flatSurface: Surface; shelfSurface: Surface; centerY: number; angle: number };
export type HangingTurn = { hanging:number;flatSurface:Surface;hangingSurface:Surface;centerY:number;angle:number };
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => 1 - (1 - t) ** 3;
/** Lift out through the old opening, carry above furniture, then lower behind the new lip. */
export function motionFrame(
  motion: PlacementMotion,
  item: ItemDefinition,
  geometry: PhysicalMap,
  mapId: string,
) {
  const a = placementSurface(geometry.surfaces.find((s) => s.id === motion.from.surface)!, motion.from);
  const b = placementSurface(geometry.surfaces.find((s) => s.id === motion.to.surface)!, motion.to);
  const asset = assetsById[item.asset];
  const centerOffset = (s: Surface) => {
    const [,h] = sizeOf(asset,mapId,s);
    return (
    poseOf(asset, s, mapId) === "flat"
      ? 0
      : poseOf(asset, s, mapId) === "upright"
        ? -h / 2
        : h * (0.5-hangingContact(asset,mapId)));
  };
  const turning = hasShelfView(asset,mapId) && !!a.bookSpines !== !!b.bookSpines;
  const hangingTurnNeeded=hasHangingView(asset,mapId) && (a.pose==="hanging")!==(b.pose==="hanging");
  const fromCenter =
      motion.from.y - (motion.from.stackOn ? 4 : 0) + centerOffset(a),
    toCenter = motion.to.y - (motion.to.stackOn ? 4 : 0) + centerOffset(b);
  const different = motion.from.surface !== b.id || turning;
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
      bookTurn: undefined as BookTurn | undefined,
      hangingTurn: undefined as HangingTurn | undefined,
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
    !different && motion.kind !== "return";
  const elevation = insert
    ? mix(sourceLift, lift, t) * (1 - q)
    : sliding
      ? 0
      : sourceLift * (1 - t) + 12 * Math.sin(Math.PI * t);
  // Complete the posture change while clear of the opening. Extraction and insertion
  // keep the original/final drawing and size; only the free carry phase turns it.
  const turnProgress = Math.max(0,Math.min(1,(t-.12)/.68));
  const upright = a.bookSpines ? 1-turnProgress : turnProgress;
  const bookTurn: BookTurn | undefined = turning && !entry && motion.progress < boundary
    ? {upright,flatSurface:a.bookSpines?b:a,shelfSurface:a.bookSpines?a:b,
       centerY:mix(fromCenter,toCenter,t)-elevation,
       angle:mix(motion.from.angle,motion.to.angle,t)} : undefined;
  const hangingTurn:HangingTurn|undefined=hangingTurnNeeded && !entry && motion.progress<boundary
    ? {hanging:a.pose==="hanging"?1-turnProgress:turnProgress,flatSurface:a.pose==="hanging"?b:a,hangingSurface:a.pose==="hanging"?a:b,
       centerY:mix(fromCenter,toCenter,t)-elevation,angle:mix(motion.from.angle,motion.to.angle,t)}:undefined;
  return {
    placement,
    surface,
    elevation,
    inside: entry || (!bookTurn && !hangingTurn && motion.progress >= 0.9),
    bookTurn,
    hangingTurn,
    shadowStrength: sliding
      ? 1
      : entry
        ? 0.25 + 0.75 * q
        : Math.max(0, (motion.progress - 0.8) * 5),
  };
}
