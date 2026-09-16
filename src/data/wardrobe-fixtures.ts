import { mapsById } from "./maps";
import { wardrobe, wardrobeDestinations } from "./wardrobe";
import { normalizePlacement } from "../domain/placement";
import { assetsById } from "./catalog";

export const wardrobeCombinations = Array.from({length:64},(_,bits)=>mapsById.wardrobe.extras
  .filter((_,i)=>bits & (1<<i)).map(i=>i.id)).filter(ids=>ids.length<=3);
export function wardrobeFixture(extras:string[],organized:boolean) {
  const map=mapsById.wardrobe;
  const items=[...map.base,...map.extras.filter(i=>extras.includes(i.id))];
  const placements=Object.fromEntries(items.map((item,i)=>{
    const p=organized?wardrobeDestinations[item.id]:i<8?wardrobe.initial[i]:wardrobe.slots[i-8];
    return [item.id,normalizePlacement(assetsById[item.asset],p,wardrobe.surfaces.find(s=>s.id===p.surface)!,p.angle,map.id)];
  }));
  return {mapId:map.id,items,placements,geometry:wardrobe};
}
