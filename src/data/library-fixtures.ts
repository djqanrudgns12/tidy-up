import { mapsById } from "./maps";
import { library,libraryDestinations } from "./library";
import { normalizePlacement } from "../domain/placement";
import { assetsById } from "./catalog";

export const libraryCombinations=Array.from({length:64},(_,bits)=>mapsById.library.extras.filter((_,i)=>bits & (1<<i)).map(i=>i.id)).filter(ids=>ids.length<=3);
export function libraryFixture(extras:string[],organized:boolean){
  const map=mapsById.library;
  const items=[...map.base,...map.extras.filter(i=>extras.includes(i.id))];
  const placements=Object.fromEntries(items.map((item,i)=>{
    const p=organized?libraryDestinations[item.id]:i<8?library.initial[i]:library.slots[i-8];
    return [item.id,normalizePlacement(assetsById[item.asset],p,library.surfaces.find(s=>s.id===p.surface)!,p.angle,map.id)];
  }));
  return {mapId:map.id,items,placements,geometry:library};
}

