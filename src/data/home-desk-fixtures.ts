import { mapsById } from "./maps";
import { homeDesk,homeDeskDestinations } from "./home-desk";
import { normalizePlacement } from "../domain/placement";
import { assetsById } from "./catalog";

export const homeDeskCombinations=Array.from({length:64},(_,bits)=>mapsById["home-desk"].extras.filter((_,i)=>bits & (1<<i)).map(i=>i.id)).filter(ids=>ids.length<=3);
export function homeDeskFixture(extras:string[],organized:boolean){
  const map=mapsById["home-desk"];
  const items=[...map.base,...map.extras.filter(i=>extras.includes(i.id))];
  const placements=Object.fromEntries(items.map((item,i)=>{
    const p=organized?homeDeskDestinations[item.id]:i<8?homeDesk.initial[i]:homeDesk.slots[i-8];
    return [item.id,normalizePlacement(assetsById[item.asset],p,homeDesk.surfaces.find(s=>s.id===p.surface)!,p.angle,map.id)];
  }));
  return {mapId:map.id,items,placements,geometry:homeDesk};
}

