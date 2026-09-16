import { assetsById } from "../data/catalog";
import { mapsById } from "../data/maps";
import { physicalMaps } from "../data/physical";
import { findSurfacePlacement } from "../domain/placement";
import { hasShelfView } from "../data/scene-art";

export function auditMap(mapId:string) {
  const map=mapsById[mapId], geometry=physicalMaps[mapId];
  return [...map.base,...map.extras].map(item=>({
    item,
    places:geometry.surfaces.map(surface=>({
      surface,
      placement:findSurfacePlacement(assetsById[item.asset],surface,mapId),
      flat:surface.bookSpines && hasShelfView(assetsById[item.asset],mapId)
        ? findSurfacePlacement(assetsById[item.asset],surface,mapId,"flat") : undefined,
    })),
  }));
}

export function auditAllMaps() {
  return Object.keys(physicalMaps).map(mapId=>({mapId, rows:auditMap(mapId)}));
}
