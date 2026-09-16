import { assetsById } from "../data/catalog";
import { hasShelfView,hasHangingView,hangingContact } from "../data/scene-art";
import { coveredByPanel } from "../domain/occlusion";
import {
  footprint,
  planeSkew,
  pointInPolygon,
  poseOf,
  sizeOf,
} from "../domain/placement";
import type {
  ArtCollection,
  ItemDefinition,
  PhysicalMap,
  Placement,
  Point,
  Surface,
} from "../domain/types";
import { motionFrame, type BookTurn, type HangingTurn, type PlacementMotion } from "./motion";

type Context = CanvasRenderingContext2D;
export type SceneModel = {
  mapId: string;
  geometry: PhysicalMap;
  items: ItemDefinition[];
  placements: Record<string, Placement>;
  art: ArtCollection;
  selected?: string;
  highlight?: string;
  clean?: string[];
  showDirt?: boolean;
  motion?: PlacementMotion;
  carried?: { id: string; placement: Placement };
};
const itemDepth = (model: Pick<SceneModel, "placements">, id: string) => {
  const p = model.placements[id];
  return p.stackOn ? model.placements[p.stackOn].y + 0.1 : p.y;
};
export function surfaceItems(
  model: Pick<SceneModel, "items" | "placements">,
  surface: Surface,
) {
  return model.items
    .filter((item) => model.placements[item.id]?.surface === surface.id)
    .sort((a, b) => itemDepth(model, a.id) - itemDepth(model, b.id));
}
export function paintOrder(
  model: Pick<SceneModel, "items" | "placements" | "geometry">,
) {
  return model.geometry.surfaces.flatMap((surface) =>
    surfaceItems(model, surface),
  );
}
function tracePolygon(ctx: Context, points: number[]) {
  ctx.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2)
    ctx.lineTo(points[i], points[i + 1]);
  ctx.closePath();
}
export function polygonPath(ctx: Context, points: number[]) {
  ctx.beginPath();
  tracePolygon(ctx, points);
}
export function drawObject(
  ctx: Context,
  model: SceneModel,
  item: ItemDefinition,
  p: Placement,
  surface: Surface,
  elevation = 0,
  shadowStrength = 1,
) {
  const asset = assetsById[item.asset],
    primary = model.art.items[item.asset],
    art = surface.bookSpines && hasShelfView(asset, model.mapId) ? primary?.shelf : surface.pose==="hanging" && hasHangingView(asset,model.mapId) ? primary?.hanging : primary;
  if (!art) return;
  const [w, h] = sizeOf(asset, model.mapId, surface),
    pose = poseOf(asset, surface, model.mapId);
  const stackLift = p.stackOn ? 4 : 0;
  const y = p.y - stackLift;
  // Cast shadows fall down and right from the common upper-left window light.
  // The sole remains fixed while height is projected onto the receiving plane.
  ctx.save();
  if (pose !== "hanging") {
    polygonPath(ctx, surface.polygon);
    ctx.clip();
  }
  if (pose === "upright") {
    ctx.save();
    ctx.translate(p.x, y);
    ctx.transform(1, 0, -0.29, -0.16, 0, 0);
    ctx.globalAlpha = surface.shadow * 0.6 * shadowStrength;
    ctx.filter = `blur(${5 + elevation * 0.1}px)`;
    ctx.drawImage(art.silhouette, -w / 2, -h, w, h);
    ctx.restore();
    ctx.save();
    ctx.translate(p.x, y - 1);
    ctx.transform(1, 0, planeSkew(surface, p), surface.depth, 0, 0);
    ctx.globalAlpha = 0.46 * shadowStrength;
    ctx.filter = "blur(.8px)";
    ctx.fillStyle = "#51412c";
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.36, w * 0.034, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else if (pose === "flat") {
    ctx.save();
    ctx.translate(p.x + 2.5, y + 2.5);
    ctx.transform(1, 0, planeSkew(surface, p), surface.depth, 0, 0);
    ctx.rotate((p.angle * Math.PI) / 180);
    ctx.globalAlpha = surface.shadow * shadowStrength;
    ctx.filter = `blur(${3 + elevation * 0.1}px)`;
    ctx.drawImage(art.silhouette, -w / 2, -h / 2, w, h);
    ctx.restore();
    ctx.save();
    ctx.translate(p.x, y + 1.3);
    ctx.transform(1, 0, planeSkew(surface, p), surface.depth, 0, 0);
    ctx.rotate((p.angle * Math.PI) / 180);
    ctx.globalAlpha = 0.24 * shadowStrength;
    ctx.filter = "blur(.7px)";
    ctx.drawImage(art.silhouette, -w / 2, -h / 2, w, h);
    ctx.restore();
  } else if (surface.shadowReceiver) {
    // A hanging bag casts on the frame only. A floating outline in the air is not a shadow.
    ctx.save();
    polygonPath(ctx, surface.shadowReceiver);
    ctx.clip();
    ctx.globalAlpha = 0.16 * shadowStrength;
    ctx.filter = "blur(4px)";
    ctx.drawImage(art.silhouette, p.x - w / 2 + 6, y - h * hangingContact(asset,model.mapId) + 5, w, h);
    ctx.restore();
  }
  ctx.restore();

  ctx.save();
  ctx.translate(p.x, y - elevation);
  if (pose === "flat") {
    ctx.transform(1, 0, planeSkew(surface, p), surface.depth, 0, 0);
    ctx.rotate((p.angle * Math.PI) / 180);
    ctx.drawImage(art.image, -w / 2, -h / 2, w, h);
  } else
    ctx.drawImage(art.image, -w / 2, pose === "upright" ? -h : -h * hangingContact(asset,model.mapId), w, h);
  ctx.restore();
}
export function paintScene(ctx: Context, model: SceneModel, overlays = true) {
  ctx.clearRect(0, 0, 960, 720);
  ctx.drawImage(model.art.background, 0, 0, 960, 720);
  const movingItem = model.motion
    ? model.items.find((i) => i.id === model.motion!.id)
    : undefined;
  const movingFrame =
    model.motion && movingItem
      ? motionFrame(model.motion, movingItem, model.geometry, model.mapId)
      : undefined;
  const drawMoving = () => {
    if (movingItem && movingFrame?.bookTurn) {
      drawBookTurn(ctx,model,movingItem,movingFrame.placement,movingFrame.bookTurn);
    } else if(movingItem && movingFrame?.hangingTurn) {
      drawHangingTurn(ctx,model,movingItem,movingFrame.placement,movingFrame.hangingTurn);
    } else if (movingItem && movingFrame)
      drawObject(
        ctx,
        model,
        movingItem,
        movingFrame.placement,
        movingFrame.surface,
        movingFrame.elevation,
        movingFrame.shadowStrength,
      );
  };
  for (const surface of model.geometry.surfaces) {
    if (overlays && model.highlight === surface.id) {
      ctx.save();
      polygonPath(ctx, surface.entryPolygon ?? surface.polygon);
      ctx.fillStyle = "#36735825";
      ctx.fill();
      ctx.strokeStyle = "#2b7056";
      ctx.lineWidth = 2;
      ctx.setLineDash([7, 5]);
      ctx.stroke();
      ctx.restore();
    }
    if (model.showDirt)
      model.geometry.dirt.forEach((spot, i) => {
        if (spot.surface !== surface.id || model.clean?.includes(String(i)))
          return;
        ctx.save();
        ctx.translate(spot.x, spot.y);
        const art = model.art.effects[i === 3 ? "stain" : "dust"];
        const width = i === 3 ? 65 : 55,
          height = ((width * art.height) / art.width) * 0.5;
        ctx.globalAlpha = i === 3 ? 0.48 : 0.58;
        // Multiply blends the residue with the existing wood/floor colour; it must not look like a paper disk.
        ctx.globalCompositeOperation = "multiply";
        ctx.drawImage(art.image, -width / 2, -height / 2, width, height);
        ctx.globalCompositeOperation = "source-over";
        if (overlays) {
          ctx.globalAlpha = 1;
          ctx.strokeStyle = "#826842";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 4]);
          ctx.beginPath();
          ctx.ellipse(0, 0, 25, 17, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      });
    const restore = (polygon: number[]) => {
      ctx.save();
      polygonPath(ctx, polygon);
      ctx.clip();
      ctx.drawImage(model.art.background, 0, 0, 960, 720);
      ctx.restore();
    };
    const layers = [
      ...surfaceItems(model, surface)
        .filter(
          (item) => item.id !== movingItem?.id && item.id !== model.carried?.id,
        )
        .map((item) => ({
          depth: itemDepth(model, item.id),
          item,
          polygon: undefined as number[] | undefined,
        })),
      ...(movingItem &&
      movingFrame?.inside &&
      movingFrame.surface.id === surface.id
        ? [
            {
              depth: movingFrame.placement.stackOn
                ? model.placements[movingFrame.placement.stackOn].y + 0.1
                : movingFrame.placement.y,
              item: movingItem,
              polygon: undefined as number[] | undefined,
            },
          ]
        : []),
      ...(surface.depthOccluders ?? []).map((o) => ({
        ...o,
        item: undefined as ItemDefinition | undefined,
      })),
    ].sort((a, b) => a.depth - b.depth);
    for (const layer of layers) {
      if (layer.item && movingItem && layer.item.id === movingItem.id) {
        if (movingFrame?.inside) drawMoving();
      } else if (layer.item)
        drawObject(
          ctx,
          model,
          layer.item,
          model.placements[layer.item.id],
          surface,
        );
      else if (layer.polygon) restore(layer.polygon);
    }
    // Restore only the furniture front edge: objects sit behind the lip, not over it.
    for (const polygon of surface.occluders ?? []) {
      restore(polygon);
    }
    for (const panel of surface.perforatedOccluders ?? []) {
      ctx.save();
      ctx.beginPath();
      tracePolygon(ctx, panel.polygon);
      for (const opening of panel.openings) tracePolygon(ctx, opening);
      ctx.clip("evenodd");
      ctx.drawImage(model.art.background, 0, 0, 960, 720);
      ctx.restore();
    }
  }
  if (movingFrame && !movingFrame.inside) drawMoving();
  if (model.carried) {
    const item = model.items.find((i) => i.id === model.carried!.id)!,
      p = model.carried.placement;
    const surface = model.geometry.surfaces.find((s) => s.id === p.surface)!;
    drawObject(ctx, model, item, p, surface, 0, 0);
  }
  if (overlays && model.selected && !model.motion && !model.carried) {
    const item = model.items.find((item) => item.id === model.selected),
      p = model.placements[model.selected];
    const surface = model.geometry.surfaces.find(
      (surface) => surface.id === p?.surface,
    );
    if (item && p && surface) {
      const points = footprint(assetsById[item.asset], p, surface, model.mapId);
      ctx.save();
      polygonPath(
        ctx,
        points.flatMap((point) => [point.x, point.y]),
      );
      ctx.strokeStyle = "#286b53";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.stroke();
      ctx.restore();
    }
  }
}

/** Project a constant-size book through its carry rotation; both endpoint drawings are real art. */
let bookBlend: HTMLCanvasElement | undefined;
function drawBookTurn(ctx: Context, model: SceneModel, item: ItemDefinition, p: Placement, turn: BookTurn) {
  const art=model.art.items[item.asset];
  if (!art?.shelf) return;
  const asset=assetsById[item.asset], [flatW,height]=sizeOf(asset,model.mapId),
    [spineW]=sizeOf(asset,model.mapId,turn.shelfSurface);
  const u=turn.upright;
  // Tilt raises the cover from the horizontal plane; yaw exposes the separately drawn spine.
  const tilt=u*Math.PI/2;
  const yaw=u*Math.acos(Math.min(1,spineW/flatW));
  const width=flatW*Math.cos(yaw);
  const vertical=Math.sin(tilt)+turn.flatSurface.depth*Math.cos(tilt);
  const blend=u*u*(3-2*u);
  ctx.save();ctx.translate(p.x,turn.centerY);
  ctx.transform(1,0,planeSkew(turn.flatSurface,p)*(1-u),vertical,0,0);
  ctx.rotate(turn.angle*Math.PI/180*(1-u));
  if(u===0 || u===1) ctx.drawImage(u===0?art.image:art.shelf.image,-width/2,-height/2,width,height);
  else {
    bookBlend ??= document.createElement("canvas");
    bookBlend.width=512;bookBlend.height=512;
    const mix=bookBlend.getContext("2d")!;
    mix.globalAlpha=1-blend;mix.drawImage(art.image,0,0,512,512);
    // Add premultiplied contributions so opaque overlap remains opaque throughout the turn.
    mix.globalCompositeOperation="lighter";
    mix.globalAlpha=blend;mix.drawImage(art.shelf.image,0,0,512,512);
    ctx.drawImage(bookBlend,-width/2,-height/2,width,height);
  }
  ctx.restore();
}

/** Lift by tilting the garment plane, then let the separately drawn sleeves drape.
 * Height remains fixed; width changes only to the real hanging silhouette. */
function drawHangingTurn(ctx:Context,model:SceneModel,item:ItemDefinition,p:Placement,turn:HangingTurn){
 const art=model.art.items[item.asset];if(!art?.hanging)return;
 const asset=assetsById[item.asset],[flatW,height]=sizeOf(asset,model.mapId),[hungW]=sizeOf(asset,model.mapId,turn.hangingSurface);
 const u=turn.hanging,blend=u*u*(3-2*u),width=flatW+(hungW-flatW)*blend;
 const tilt=u*Math.PI/2,vertical=Math.sin(tilt)+turn.flatSurface.depth*Math.cos(tilt);
 ctx.save();ctx.translate(p.x,turn.centerY);
 ctx.transform(1,0,planeSkew(turn.flatSurface,p)*(1-u),vertical,0,0);
 ctx.rotate(turn.angle*Math.PI/180*(1-u));
 if(u===0||u===1)ctx.drawImage(u===0?art.image:art.hanging.image,-width/2,-height/2,width,height);
 else {
  bookBlend??=document.createElement("canvas");bookBlend.width=512;bookBlend.height=512;
  const mix=bookBlend.getContext("2d")!;
  mix.globalAlpha=1-blend;mix.drawImage(art.image,0,0,512,512);
  mix.globalCompositeOperation="lighter";mix.globalAlpha=blend;mix.drawImage(art.hanging.image,0,0,512,512);
  ctx.drawImage(bookBlend,-width/2,-height/2,width,height);
 }
 ctx.restore();
}

export function hitObject(
  model: SceneModel,
  item: ItemDefinition,
  point: Point,
) {
  const p = model.placements[item.id],
    surface = model.geometry.surfaces.find((s) => s.id === p.surface)!;
  if (
    (surface.occluders ?? []).some((poly) => pointInPolygon(point, poly)) ||
    (surface.perforatedOccluders ?? []).some((panel) =>
      coveredByPanel(point, panel),
    ) ||
    (surface.depthOccluders ?? []).some(
      (o) => p.y < o.depth && pointInPolygon(point, o.polygon),
    )
  )
    return false;
  const asset = assetsById[item.asset],
    primary = model.art.items[item.asset],
    art = surface.bookSpines && hasShelfView(asset, model.mapId) ? primary?.shelf : surface.pose==="hanging" && hasHangingView(asset,model.mapId) ? primary?.hanging : primary,
    [w, h] = sizeOf(asset, model.mapId, surface);
  if (!art) return false;
  const pose = poseOf(asset, surface, model.mapId),
    x = point.x - p.x,
    y = point.y - p.y + (p.stackOn ? 4 : 0);
  const localX = x - (planeSkew(surface, p) * y) / surface.depth;
  const angle = (p.angle * Math.PI) / 180;
  const u =
    pose === "flat"
      ? (localX * Math.cos(angle) + (y / surface.depth) * Math.sin(angle)) / w +
        0.5
      : x / w + 0.5;
  const v =
    pose === "flat"
      ? (-localX * Math.sin(angle) + (y / surface.depth) * Math.cos(angle)) /
          h +
        0.5
      : y / h + (pose === "upright" ? 1 : hangingContact(asset,model.mapId));
  if (u < 0 || u >= 1 || v < 0 || v >= 1) return false;
  return (
    (art.image
      .getContext("2d")
      ?.getImageData(
        Math.floor(u * art.image.width),
        Math.floor(v * art.image.height),
        1,
        1,
      ).data[3] ?? 0) >= 24
  );
}

export function visualBounds(
  item: ItemDefinition,
  p: Placement,
  surface: Surface,
  mapId: string,
) {
  const asset = assetsById[item.asset],
    [w, h] = sizeOf(asset, mapId, surface),
    pose = poseOf(asset, surface, mapId);
  if (pose === "flat") {
    const pts = footprint(
      asset,
      { ...p, y: p.y - (p.stackOn ? 4 : 0) },
      surface,
      mapId,
    );
    return {
      left: Math.min(...pts.map((p) => p.x)),
      right: Math.max(...pts.map((p) => p.x)),
      top: Math.min(...pts.map((p) => p.y)),
      bottom: Math.max(...pts.map((p) => p.y)),
    };
  }
  const top = p.y - h * (pose === "upright" ? 1 : hangingContact(asset,mapId));
  return { left: p.x - w / 2, right: p.x + w / 2, top, bottom: top + h };
}
