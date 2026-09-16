import { mapsById } from "./maps";
import { bedroom,bedroomDestinations } from "./bedroom";
import { normalizePlacement } from "../domain/placement";
import { assetsById } from "./catalog";

export const bedroomCombinations=Array.from({length:64},(_,bits)=>mapsById["bedroom"].extras.filter((_,i)=>bits & (1<<i)).map(i=>i.id)).filter(ids=>ids.length<=3);
export function bedroomFixture(extras:string[],organized:boolean){
  const map=mapsById["bedroom"];
  const items=[...map.base,...map.extras.filter(i=>extras.includes(i.id))];
  const placements=Object.fromEntries(items.map((item,i)=>{
    const p=organized?bedroomDestinations[item.id]:i<8?bedroom.initial[i]:bedroom.slots[i-8];
    return [item.id,normalizePlacement(assetsById[item.asset],p,bedroom.surfaces.find(s=>s.id===p.surface)!,p.angle,map.id)];
  }));
  return {mapId:map.id,items,placements,geometry:bedroom};
}

