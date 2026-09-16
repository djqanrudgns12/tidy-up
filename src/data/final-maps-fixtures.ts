import {mapsById} from "./maps";
import {livingRoom,livingRoomDestinations} from "./living-room";
import {shoeCabinet,shoeCabinetDestinations} from "./shoe-cabinet";
import {normalizePlacement} from "../domain/placement";
import {assetsById} from "./catalog";
export const finalMaps={"living-room":{geometry:livingRoom,destinations:livingRoomDestinations},"shoe-cabinet":{geometry:shoeCabinet,destinations:shoeCabinetDestinations}};
export type FinalMapId=keyof typeof finalMaps;
export function finalCombinations(id:FinalMapId){return Array.from({length:64},(_,bits)=>mapsById[id].extras.filter((_,i)=>bits&(1<<i)).map(i=>i.id)).filter(ids=>ids.length<=3);}
export function finalFixture(id:FinalMapId,extras:string[],organized:boolean){
 const {geometry,destinations}=finalMaps[id],map=mapsById[id];
 const items=[...map.base,...map.extras.filter(i=>extras.includes(i.id))];
 const placements=Object.fromEntries(items.map((item,i)=>{
  const p=organized?destinations[item.id]:i<8?geometry.initial[i]:geometry.slots[i-8];
  return [item.id,normalizePlacement(assetsById[item.asset],p,geometry.surfaces.find(s=>s.id===p.surface)!,p.angle,id)];
 }));
 return {mapId:id,items,placements,geometry};
}
