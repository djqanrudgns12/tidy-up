import { expect,it } from "vitest";
import { wardrobe,wardrobeDestinations } from "../data/wardrobe";
import { wardrobeCombinations,wardrobeFixture } from "../data/wardrobe-fixtures";
import { physicalMaps } from "../data/physical";
import { assetsById } from "../data/catalog";
import { fitsSurface,sizeOf } from "./placement";
import { activeItems,makeSession,reducer,tryPlacement,unfinished,placementIssues } from "./session";
import { validateSession } from "./storage";
import { motionFrame } from "../rendering/motion";
import { visualBounds } from "../rendering/paint";

function withWardrobe(run:()=>void) {
  const previous=physicalMaps.wardrobe;physicalMaps.wardrobe=wardrobe;
  try {run();} finally {if(previous)physicalMaps.wardrobe=previous;else delete physicalMaps.wardrobe;}
}
function start(extras:string[]) {
  let state=reducer(makeSession(),{type:"BEGIN"});
  state=reducer(state,{type:"PROFILE",name:"검수",character:"rabbit"});
  state=reducer(state,{type:"TUTORIAL_DONE"});state=reducer(state,{type:"MAP",mapId:"wardrobe"});
  for(const id of extras)state=reducer(state,{type:"EXTRA",id});
  return reducer(state,{type:"CONFIRM_SET"});
}
it("옷장 42조합의 실제 지지면, 충돌, 이동, 복원 및 전체 활동",()=>withWardrobe(()=>{
  expect(wardrobeCombinations).toHaveLength(42);
  for(const extras of wardrobeCombinations){
    let state=start(extras);
    expect([...placementIssues(state)],`initial ${extras}`).toEqual([]);
    for(const item of activeItems("wardrobe",extras)){
      const p=wardrobeDestinations[item.id];
      const result=tryPlacement(state,item.id,p,p.surface,p.angle);
      expect(result.placement,`${extras}/${item.id}: ${result.message}`).toEqual(p);
      state=reducer(state,{type:"MOVE",id:item.id,placement:result.placement!});
      expect(validateSession(state)).toBe(true);
    }
    expect(unfinished(state)).toEqual([]);
    state=reducer(state,{type:"START_CLEAN"});state=reducer(state,{type:"VENTILATE"});
    for(const [spot,dirt] of wardrobe.dirt.entries())state=reducer(state,{type:"CLEAN",spot,tool:dirt.tool});
    state=reducer(state,{type:"STORE_TOOLS"});expect(state.step).toBe("quiz");
    state=reducer(state,{type:"QUIZ_DONE",correctCount:2});expect(state.step).toBe("result");
    expect(validateSession(JSON.parse(JSON.stringify(state)))).toBe(true);
  }
}));
it("초기 각도로 봉/선반/휴지통 입구를 눌러도 모든 조합을 정리한다",()=>withWardrobe(()=>{
  for(const extras of wardrobeCombinations){
    let state=start(extras);
    for(const item of activeItems("wardrobe",extras)){
      const p=wardrobeDestinations[item.id],s=wardrobe.surfaces.find(s=>s.id===p.surface)!;
      const result=tryPlacement(state,item.id,{x:p.x,y:p.y-(s.baseline&&s.entryPolygon?s.insertion?.lift??0:0)});
      expect(result.placement,`${extras}/${item.id}: ${result.message}`).toBeDefined();
      expect(result.placement!.surface).toBe(p.surface);
      state=reducer(state,{type:"MOVE",id:item.id,placement:result.placement!});
    }
    expect(unfinished(state)).toEqual([]);
  }
}));
it("봉의 자유 가로 위치, 접힌 옷 거부, 문과 옆옷 침범 거부 및 작은 국소 보정",()=>withWardrobe(()=>{
  let state=start(["e1"]);
  const rail=wardrobe.surfaces.find(s=>s.id==="rail")!;
  expect(tryPlacement(state,"b1",{x:380,y:89},"rail").placement).toBeUndefined();
  expect(fitsSurface(assetsById.jacket,{surface:"rail",x:252,y:89,angle:0},rail,"wardrobe")).toBe(false);
  const free=tryPlacement(state,"b5",{x:302,y:89},"rail");
  expect(free.placement?.x).toBe(302);
  state=reducer(state,{type:"MOVE",id:"b5",placement:free.placement!});
  // An occupied spot moves the new item to the nearest free spot on the rail; the old one stays.
  const beside=tryPlacement(state,"e1",{x:302,y:89},"rail").placement;
  expect(beside).toBeDefined();expect(beside!.x).not.toBe(302);expect(beside!.y).toBe(89);
  const nudged=tryPlacement(state,"e1",{x:382,y:89},"rail").placement;
  expect(nudged).toBeDefined();expect(Math.abs(nudged!.x-382)).toBeLessThanOrEqual(36);
  expect(nudged!.y).toBe(89);expect(state.placements.b5.x).toBe(302);
}));
it("걸기 원화는 높이를 유지하며 봉 밖에서 전환하고 꺼내기 접점이 연속이다",()=>{
  const before=wardrobeFixture(["e1"],false),after=wardrobeFixture(["e1"],true);
  for(const id of ["b5","b7","e1"]){
    const item=after.items.find(i=>i.id===id)!,asset=assetsById[item.asset];
    const stored=after.placements[id],floor=before.placements[id];
    expect(sizeOf(asset,"wardrobe",wardrobe.surfaces[1])[1]).toBe(sizeOf(asset,"wardrobe")[1]);
    for(const reverse of [false,true]){
      let previous:{x:number;y:number}|undefined;
      for(let i=0;i<=1000;i++){
        const frame=motionFrame({id,from:reverse?stored:floor,to:reverse?floor:stored,progress:i/1000},item,wardrobe,"wardrobe");
        if(frame.hangingTurn)expect(frame.inside).toBe(false);
        const b=visualBounds(item,frame.placement,frame.surface,"wardrobe");
        const center={x:frame.placement.x,y:frame.hangingTurn?.centerY??(b.top+b.bottom)/2-frame.elevation};
        if(previous)expect(Math.hypot(center.x-previous.x,center.y-previous.y)).toBeLessThan(9);
        previous=center;
        if(frame.inside&&frame.surface.id==="rail")expect(frame.hangingTurn).toBeUndefined();
      }
    }
  }
});
