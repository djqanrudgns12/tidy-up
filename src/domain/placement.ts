import type { AssetDefinition, Placement, Point, Pose, Surface } from "./types";
import artMetrics from "../data/art-metrics.json";
import { hasShelfView, hasHangingView, hangingContact, sceneArtwork } from "../data/scene-art";

export const WORLD = { width: 960, height: 720 };
const HANGABLE = new Set(["backpack", "tote-bag", "shoe-bag", "hanger", "jacket", "cardigan", "umbrella", "umbrella-cover"]);

/** Purpose restrictions are reserved for disposal and special physical supports. */
export function acceptsAsset(asset: AssetDefinition, surface: Surface) {
  if (surface.zone === 5 && asset.id !== "paper-scrap") return false;
  if (surface.accepts && !surface.accepts.includes(asset.id)) return false;
  if ((surface.anchor || surface.pose === "hanging") && !HANGABLE.has(asset.id)) return false;
  return true;
}

export function placementSurface(surface: Surface, placement?: Pick<Placement, "bookPose">): Surface {
  return placement?.bookPose === "flat" && surface.bookSpines ? { ...surface, bookSpines: false } : surface;
}

export function placementAngles(asset: AssetDefinition, surface: Surface, mapId: string, angle: number, placement?: Placement) {
  return poseOf(asset, surface, mapId, placement) === "flat"
    ? [...new Set([angle, 0, 90, -90])]
    : [angle];
}

/** Static geometry only: an occupied place stays discoverable in the place picker. */
const supportCache = new WeakMap<Surface, Map<string, Placement | undefined>>();
export function findSurfacePlacement(asset: AssetDefinition, surface: Surface, mapId: string, requestedPose?: Placement["bookPose"]) {
  if (!acceptsAsset(asset, surface)) return undefined;
  const key = `${mapId}:${asset.id}:${requestedPose ?? "auto"}`;
  const cache = supportCache.get(surface) ?? new Map<string, Placement | undefined>();
  supportCache.set(surface, cache);
  if (cache.has(key)) { const p=cache.get(key); return p ? {...p} : undefined; }
  const xs = surface.polygon.filter((_, i) => i % 2 === 0);
  const ys = surface.polygon.filter((_, i) => i % 2 === 1);
  const left = Math.min(...xs), right = Math.max(...xs), top = Math.min(...ys), bottom = Math.max(...ys);
  for (const bookPose of requestedPose ? [requestedPose] : surface.bookSpines && hasShelfView(asset, mapId) ? [undefined, "flat" as const] : [undefined])
  for (const angle of placementAngles(asset, placementSurface(surface, {bookPose}), mapId, 0)) {
    const center=normalizePlacement(asset,{x:(left+right)/2,y:(top+bottom)/2},surface,angle,mapId,bookPose);
    if(fitsSurface(asset,center,surface,mapId)){cache.set(key,center);return {...center};}
    for (let x = left; x <= right; x += 3)
      for (let y = top; y <= bottom; y += 2) {
        const p = normalizePlacement(asset, {x, y}, surface, angle, mapId, bookPose);
        if (fitsSurface(asset, p, surface, mapId)) {
          cache.set(key, p);
          return {...p};
        }
      }
  }
  cache.set(key, undefined);
  return undefined;
}
export function canPlaceOnSurface(asset: AssetDefinition, surface: Surface, mapId: string) {
  return findSurfacePlacement(asset, surface, mapId) !== undefined;
}
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
const wardrobeSizes: Record<string,[number,number]> = {
  "t-shirt":[70,57],"long-sleeve":[70,57],trousers:[67,65],shorts:[64,54],
  jacket:[124,106],cardigan:[124,106],hanger:[57,39],socks:[30,35],
  cap:[44,38],"sun-hat":[53,42],scarf:[50,38],gloves:[33,35],"tote-bag":[44,52],"paper-scrap":[37,38],
};
const livingRoomSizes:Record<string,[number,number]>={
 "story-book":[32,35],magazine:[29,35],"board-game":[43,35],"puzzle-box":[43,35],"block-box":[43,35],"card-game":[40,35],
 remote:[18,43],cushion:[74,68],blanket:[99,77],headphones:[49,53],"pocket-tissue":[35,25],"water-bottle":[22,57],"book-stand":[38,31],"paper-scrap":[29,30],
};
const shoeCabinetSizes:Record<string,[number,number]>={
 sneakers:[76,55],"indoor-shoes":[72,51],"rain-boots":[73,77],sandals:[72,45],"shoe-brush":[35,40],shoehorn:[65,40],
 umbrella:[44,175],"shoe-bag":[58,90],"umbrella-cover":[104,112],"tote-bag":[53,73],towel:[37,26],cap:[36,30],gloves:[31,30],"paper-scrap":[33,34],
};
export function sizeOf(
  asset: AssetDefinition,
  mapId: string,
  surface?: Surface,
  placement?: Pick<Placement, "bookPose">,
): [number, number] {
  if (surface) surface = placementSurface(surface, placement);
  const box = (mapId === "living-room" ? livingRoomSizes[asset.id] : mapId === "shoe-cabinet" ? shoeCabinetSizes[asset.id] : mapId === "wardrobe" ? wardrobeSizes[asset.id] : mapId === "school-desk" ? schoolSizes[asset.id] : mapId === "classroom-cabinet" ? cabinetSizes[asset.id] : mapId === "locker" ? lockerSizes[asset.id] : mapId === "library" ? librarySizes[asset.id] : mapId === "home-desk" ? homeDeskSizes[asset.id] : mapId === "bedroom" ? bedroomSizes[asset.id] : undefined) ?? [
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
export function poseOf(asset: AssetDefinition, surface: Surface, mapId: string, placement?: Pick<Placement, "bookPose">): Pose {
  surface = placementSurface(surface, placement);
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

/** Corners alone are insufficient on an L-shaped floor: inspect every edge interval. */
export function supportedPolygon(points: Point[], polygon: number[]) {
  if (!points.every(p => pointInPolygon(p, polygon))) return false;
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    const dx = b.x-a.x, dy = b.y-a.y, cuts = [0,1];
    for (let j=0; j<polygon.length; j+=2) {
      const k=(j+2)%polygon.length, ex=polygon[k]-polygon[j], ey=polygon[k+1]-polygon[j+1];
      const px=polygon[j]-a.x, py=polygon[j+1]-a.y, cross=dx*ey-dy*ex;
      if (Math.abs(cross)>1e-8) {
        const t=(px*ey-py*ex)/cross, u=(px*dy-py*dx)/cross;
        if(t>0&&t<1&&u>=0&&u<=1) cuts.push(t);
      } else if(Math.abs(px*dy-py*dx)<1e-8) {
        const t=(px*dx+py*dy)/(dx*dx+dy*dy);
        if(t>0&&t<1)cuts.push(t);
      }
    }
    cuts.sort((a,b)=>a-b);
    for(let j=1;j<cuts.length;j++) {
      const t=(cuts[j-1]+cuts[j])/2;
      if(!pointInPolygon({x:a.x+dx*t,y:a.y+dy*t},polygon))return false;
    }
  }
  return true;
}

/** Allow a small real overhang, while at least 90% of the upper cover remains supported. */
export function stableBookSupport(upper: Point[], lower: Point[]) {
  const origin=lower[0], x={x:lower[1].x-origin.x,y:lower[1].y-origin.y}, y={x:lower[3].x-origin.x,y:lower[3].y-origin.y};
  const determinant=x.x*y.y-x.y*y.x;
  if(Math.abs(determinant)<1e-8)return false;
  const local=upper.map(p=>({x:((p.x-origin.x)*y.y-(p.y-origin.y)*y.x)/determinant,y:(x.x*(p.y-origin.y)-x.y*(p.x-origin.x))/determinant}));
  if(local.some(p=>p.x<-.06||p.x>1.06||p.y<-.06||p.y>1.06))return false;
  const area=(points:Point[])=>Math.abs(points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p.x*q.y-q.x*p.y;},0))/2;
  let clipped=local;
  for(const [axis,bound,sign] of [["x",0,1],["x",1,-1],["y",0,1],["y",1,-1]] as const) {
    const output:Point[]=[];
    for(let i=0;i<clipped.length;i++) {
      const a=clipped[i],b=clipped[(i+1)%clipped.length],ain=(a[axis]-bound)*sign>=0,bin=(b[axis]-bound)*sign>=0;
      if(ain)output.push(a);
      if(ain!==bin){const t=(bound-a[axis])/(b[axis]-a[axis]);output.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});}
    }
    clipped=output;
  }
  return area(local)>0 && area(clipped)/area(local)>=.9;
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
  surface = placementSurface(surface, placement);
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
  if (!acceptsAsset(asset, surface)) return false;
  if (placement.bookPose !== undefined &&
    (!["flat", "shelf"].includes(placement.bookPose) || !surface.bookSpines || !hasShelfView(asset, mapId))) return false;
  surface = placementSurface(surface, placement);
  if (surface.hangingBounds && poseOf(asset,surface,mapId)==="hanging") {
    const [w,h]=sizeOf(asset,mapId,surface),top=placement.y-h*hangingContact(asset,mapId);
    if(![{x:placement.x-w/2,y:top},{x:placement.x+w/2,y:top},{x:placement.x+w/2,y:top+h},{x:placement.x-w/2,y:top+h}].every(p=>pointInPolygon(p,surface.hangingBounds!)))return false;
    // Only the hook rests on the rail; shoulders are constrained by the cabinet interior.
    return pointInPolygon(placement,surface.polygon) &&
      (surface.baseline === undefined || Math.abs(placement.y-surface.baseline)<.01);
  }
  if (surface.tiltedPanel && (poseOf(asset,surface,mapId)!=="flat" ||
    !(asset.book || ["document-folder", "clipboard"].includes(asset.id)))) return false;
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
  // Tall objects on a newly available top must still remain in the visible room.
  if (pose === "upright" && placement.y - height < 0) return false;
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
    placement.y - aboveSupport - (placement.stackOn ? 4 : 0) - (surface.insertion?.lift ?? 0) < surface.ceilingY)
    return false;
  const points = footprint(asset, placement, surface, mapId);
  return (
    supportedPolygon(points, surface.polygon) &&
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
  bookPose?: Placement["bookPose"],
): Placement {
  const pose = poseOf(asset, surface, mapId, {bookPose});
  return {
    ...(bookPose !== undefined ? {bookPose} : {}),
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
