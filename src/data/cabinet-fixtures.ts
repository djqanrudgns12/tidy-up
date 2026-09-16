import { mapsById } from "./maps";
import { cabinetDestinations, classroomCabinet } from "./cabinet";
import { normalizePlacement } from "../domain/placement";
import { assetsById } from "./catalog";

export const cabinetCombinations = Array.from({length:64},(_,bits)=>
  mapsById["classroom-cabinet"].extras.filter((_,i)=>bits & (1<<i)).map(item=>item.id)
).filter(ids=>ids.length<=3);
export function cabinetFixture(extras: string[], organized: boolean) {
  const map = mapsById["classroom-cabinet"];
  const items = [...map.base,...map.extras.filter(item=>extras.includes(item.id))];
  const placements = Object.fromEntries(items.map((item,i)=> {
    const p = organized ? cabinetDestinations[item.id] : i<8 ? classroomCabinet.initial[i] : classroomCabinet.slots[i-8];
    const surface = classroomCabinet.surfaces.find(s=>s.id===p.surface)!;
    return [item.id,normalizePlacement(assetsById[item.asset],p,surface,p.angle,map.id)];
  }));
  return {mapId:map.id,items,placements,geometry:classroomCabinet};
}
