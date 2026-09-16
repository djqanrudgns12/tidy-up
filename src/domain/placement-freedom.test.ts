import { expect, it } from "vitest";
import { assetsById } from "../data/catalog";
import { mapsById } from "../data/maps";
import { physicalMaps } from "../data/physical";
import { acceptsAsset, canPlaceOnSurface, fitsSurface } from "./placement";
import { activeItems, makeSession, placementIssues, reducer, tryPlacement, unfinished } from "./session";
import { validateSession } from "./storage";

function start(mapId = "locker") {
  let s = reducer(makeSession(), {type:"BEGIN"});
  s = reducer(s, {type:"PROFILE", name:"배치검수", character:"rabbit"});
  s = reducer(s, {type:"TUTORIAL_DONE"});
  return reducer(s, {type:"MAP", mapId});
}

it("교과서를 사물함 상판과 준비물 선반에 눕혀 두며 권장 책칸으로 빼앗지 않는다", () => {
  for (const [surface, x, y] of [["top",450,100], ["supplies-upper",450,241], ["supplies-lower",450,368]] as const) {
    const state = start();
    const result = tryPlacement(state, "b1", {x,y});
    expect(result.placement, result.message).toBeDefined();
    expect(result.placement!.surface).toBe(surface);
    expect(Math.hypot(result.placement!.x-x,result.placement!.y-y)).toBeLessThanOrEqual(48);
    const next = reducer(state,{type:"MOVE",id:"b1",placement:result.placement!});
    expect(next.placements.b1).toEqual(result.placement);
    expect(unfinished(next).map(i=>i.id)).not.toContain("b1");
    expect(validateSession(JSON.parse(JSON.stringify(next)))).toBe(true);
    for (const id of Object.keys(state.placements).filter(id=>id!=="b1"))
      expect(next.placements[id]).toEqual(state.placements[id]);
  }
});

it("좁은 선반에서는 실제 평면 회전으로 맞추며 사용자가 정한 회전은 임의로 되돌리지 않는다", () => {
  const state = start();
  const result = tryPlacement(state,"b1",{x:450,y:241},"supplies-upper");
  expect(Math.abs(result.placement!.angle)).toBe(90);
  const next = reducer(state,{type:"MOVE",id:"b1",placement:result.placement!});
  expect(tryPlacement(next,"b1",next.placements.b1,"supplies-upper",0).placement).toBeUndefined();
  expect(tryPlacement(state,"b1",{x:450,y:368},"supplies-lower",0).placement?.angle).toBe(0);
});

it("이미 차 있는 칸에서 먼 빈자리나 다른 선반으로 순간 이동하지 않는다", () => {
  let s = start();
  const lower = tryPlacement(s,"b3",{x:450,y:241},"supplies-upper").placement!;
  s = reducer(s,{type:"MOVE",id:"b3",placement:lower});
  const p = tryPlacement(s,"b1",{x:450,y:241}).placement;
  if (p) {
    expect(p.surface).toBe("supplies-upper");
    expect(Math.hypot(p.x-450,p.y-241)).toBeLessThanOrEqual(48);
    expect(placementIssues({...s,placements:{...s.placements,b1:p}}).size).toBe(0);
  }
  expect(tryPlacement(s,"b1",{x:940,y:90},"top").placement).toBeUndefined();
});

it("9개 공간에서 휴지통은 종이만 받으며 드래그·명시적 이동·저장 복원에 같은 제한을 적용한다", () => {
  for (const mapId of Object.keys(physicalMaps)) {
    const s = start(mapId), bin = physicalMaps[mapId].surfaces.find(v=>v.zone===5)!;
    const poly = bin.entryPolygon ?? bin.polygon;
    const point = {x:poly.filter((_,i)=>i%2===0).reduce((a,b)=>a+b)/(poly.length/2),y:poly.filter((_,i)=>i%2===1).reduce((a,b)=>a+b)/(poly.length/2)};
    for (const item of [...mapsById[mapId].base,...mapsById[mapId].extras]) {
      const asset = assetsById[item.asset];
      expect(acceptsAsset(asset,bin)).toBe(item.asset==="paper-scrap");
      if (item.asset==="paper-scrap" || !s.placements[item.id]) continue;
      expect(tryPlacement(s,item.id,point,"bin").placement).toBeUndefined();
      expect(tryPlacement(s,item.id,point).placement?.surface).not.toBe("bin");
      const invalid={surface:bin.id,x:point.x,y:bin.baseline??point.y,angle:0};
      expect(fitsSurface(asset,invalid,bin,mapId)).toBe(false);
      expect(validateSession({...s,placements:{...s.placements,[item.id]:invalid}})).toBe(false);
    }
    const paper=activeItems(mapId,[]).find(i=>i.asset==="paper-scrap");
    if(paper) expect(tryPlacement(s,paper.id,point,"bin").placement).toBeDefined();
  }
});

it("선반 선택 목록은 실제로 들어가는 일반 지지면을 열고 불가능한 걸이와 휴지통을 뺀다", () => {
  const surfaces=physicalMaps.locker.surfaces;
  const ids=surfaces.filter(s=>canPlaceOnSurface(assetsById.textbook,s,"locker")).map(s=>s.id);
  expect(ids).toEqual(expect.arrayContaining(["top","supplies-upper","supplies-lower","books","notebooks"]));
  expect(ids).not.toContain("hook");
  expect(ids).not.toContain("bin");
});
