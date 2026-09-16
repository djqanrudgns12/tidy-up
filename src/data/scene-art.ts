import type { AssetDefinition, Surface } from "../domain/types";

export const shelfViewIds = ["textbook", "notebook", "homework-diary", "document-folder", "story-book", "science-book", "picture-book", "science-comic", "dictionary", "magazine", "reading-notebook"];
export function hasShelfView(asset: AssetDefinition, mapId: string) {
  return ["locker", "library", "home-desk", "bedroom", "living-room"].includes(mapId) && shelfViewIds.includes(asset.id);
}
export function hasHangingView(asset: AssetDefinition,mapId:string) {
  return (mapId==="wardrobe" && ["jacket","cardigan","hanger"].includes(asset.id)) || (mapId==="shoe-cabinet" && asset.id==="umbrella-cover");
}
/** Contact is the inner hook arc, measured as a fraction of the cropped drawing. */
export function hangingContact(asset:AssetDefinition,mapId:string) {
  return hasHangingView(asset,mapId) ? (asset.id==="hanger" ? .022 : .01) : .06;
}

/** One fixed camera per scene. Keep the same drawing while carrying an object. */
export function sceneArtwork(asset: AssetDefinition, mapId: string, surface?: Surface) {
  if(mapId==="living-room" && asset.id==="blanket") return {
    metricId:"blanket--folded-front",path:"assets/items/views/blanket--folded-front.webp",standing:true,footprintDepth:65,
  };
  if(mapId==="shoe-cabinet" && ["sneakers","indoor-shoes","sandals","rain-boots"].includes(asset.id)) return {
    metricId:`${asset.id}--shelf-front`,path:`assets/items/views/${asset.id}--shelf-front.webp`,standing:true,footprintDepth:45,
  };
  // This camera needs real fabric thickness even when carrying the folded garment.
  if(mapId==="wardrobe" && ["t-shirt","long-sleeve","trousers","shorts"].includes(asset.id)) return {
    metricId:`${asset.id}--folded-front`,path:`assets/items/views/${asset.id}--folded-front.webp`,standing:true,footprintDepth:55,
  };
  if(surface?.pose==="hanging" && hasHangingView(asset,mapId)) return {
    metricId:`${asset.id}--alternate-support`,path:`assets/items/views/${asset.id}--alternate-support.webp`,standing:false,footprintDepth:undefined,
  };
  if (surface?.bookSpines && hasShelfView(asset, mapId)) return {
    metricId: `${asset.id}--shelf`,
    path: `assets/items/views/${asset.id}--shelf.webp`,
    standing: true,
    footprintDepth: asset.width,
  };
  const lowFront = ["classroom-cabinet","living-room"].includes(mapId) &&
    ["board-game", "puzzle-box", "card-game","block-box"].includes(asset.id);
  return {
    metricId: lowFront ? `${asset.id}--low-front` : asset.id,
    path: lowFront ? `assets/items/views/${asset.id}--low-front.webp` : asset.path,
    standing: lowFront || asset.standing || (mapId==="living-room" && ["book-stand","cushion"].includes(asset.id)),
    // Box floor depth comes from the primary top view, not the front sprite height.
    footprintDepth: lowFront ? (mapId==="living-room"?38:asset.height) : mapId==="living-room" && ["book-stand","cushion"].includes(asset.id) ? 35 : mapId==="library" && asset.id==="bookend" ? 38 : undefined,
  };
}
