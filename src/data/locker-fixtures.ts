import { mapsById } from "./maps";
import { locker,lockerDestinations } from "./locker";
import { normalizePlacement } from "../domain/placement";
import { assetsById } from "./catalog";

export const lockerCombinations=Array.from({length:64},(_,bits)=>mapsById.locker.extras.filter((_,i)=>bits & (1<<i)).map(i=>i.id)).filter(ids=>ids.length<=3);
export function lockerFixture(extras:string[],organized:boolean){
  const map=mapsById.locker;
  const items=[...map.base,...map.extras.filter(i=>extras.includes(i.id))];
  const placements=Object.fromEntries(items.map((item,i)=>{
    const p=organized?lockerDestinations[item.id]:i<8?locker.initial[i]:locker.slots[i-8];
    return [item.id,normalizePlacement(assetsById[item.asset],p,locker.surfaces.find(s=>s.id===p.surface)!,p.angle,map.id)];
  }));
  return {mapId:map.id,items,placements,geometry:locker};
}
