import type { AssetDefinition, Surface } from "../domain/types";

export const shelfViewIds = ["textbook", "notebook", "homework-diary", "document-folder", "story-book", "science-book", "picture-book", "science-comic", "dictionary", "magazine", "reading-notebook"];
export function hasShelfView(asset: AssetDefinition, mapId: string) {
  return ["locker", "library", "home-desk", "bedroom"].includes(mapId) && shelfViewIds.includes(asset.id);
}
export function hasHangingView(asset: AssetDefinition,mapId:string) {
  return mapId==="wardrobe" && ["jacket","cardigan","hanger"].includes(asset.id);
}
/** Contact is the inner hook arc, measured as a fraction of the cropped drawing. */
export function hangingContact(asset:AssetDefinition,mapId:string) {
  return hasHangingView(asset,mapId) ? (asset.id==="hanger" ? .035 : .014) : .06;
}

/** One fixed camera per scene. Keep the same drawing while carrying an object. */
export function sceneArtwork(asset: AssetDefinition, mapId: string, surface?: Surface) {
  if(surface?.pose==="hanging" && hasHangingView(asset,mapId)) return {
    metricId:`${asset.id}--alternate-support`,path:`assets/items/views/${asset.id}--alternate-support.webp`,standing:false,footprintDepth:undefined,
  };
  if (surface?.bookSpines && hasShelfView(asset, mapId)) return {
    metricId: `${asset.id}--shelf`,
    path: `assets/items/views/${asset.id}--shelf.webp`,
    standing: true,
    footprintDepth: asset.width,
  };
  const lowFront = mapId === "classroom-cabinet" &&
    ["board-game", "puzzle-box", "card-game"].includes(asset.id);
  return {
    metricId: lowFront ? `${asset.id}--low-front` : asset.id,
    path: lowFront ? `assets/items/views/${asset.id}--low-front.webp` : asset.path,
    standing: lowFront || asset.standing,
    // Box floor depth comes from the primary top view, not the front sprite height.
    footprintDepth: lowFront ? asset.height : mapId==="library" && asset.id==="bookend" ? 38 : undefined,
  };
}
