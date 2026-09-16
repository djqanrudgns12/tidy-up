import { expect,it } from "vitest";
import { cabinetCombinations,cabinetFixture } from "../data/cabinet-fixtures";
import { assetsById } from "../data/catalog";
import { fitsSurface,footprint,footprintsOverlap } from "./placement";
import { motionFrame } from "../rendering/motion";
import { visualBounds } from "../rendering/paint";
import { classroomCabinet,cabinetDestinations } from "../data/cabinet";
import { activeItems,makeSession,reducer,tryPlacement,unfinished } from "./session";
import { validateSession } from "./storage";

it("수납장 42조합의 초기/정리 후 밑면은 면 안에 있고 서로 겹치지 않는다",()=>{
  expect(cabinetCombinations).toHaveLength(42);
  const failures = new Set<string>();
  for(const extras of cabinetCombinations) for(const organized of [false,true]) {
    const m=cabinetFixture(extras,organized);
    for(const item of m.items) {
      const p=m.placements[item.id], s=m.geometry.surfaces.find(s=>s.id===p.surface)!;
      if(!fitsSurface(assetsById[item.asset],p,s,m.mapId)) failures.add(`${organized}/${item.id}: outside`);
      for(const other of m.items.filter(other=>other.id>item.id)) {
        const q=m.placements[other.id];
        if(q.surface!==p.surface) continue;
        if(footprintsOverlap(footprint(assetsById[item.asset],p,s,m.mapId),footprint(assetsById[other.asset],q,s,m.mapId))) failures.add(`${organized}/${item.id}+${other.id}: overlap`);
      }
    }
  }
  expect([...failures]).toEqual([]);
});

it("수납장 42조합 모두 실제 이동 검증·복원·정리·청소·퀴즈 전이를 통과한다",()=>{
  {
    for(const extras of cabinetCombinations) {
      let state=reducer(makeSession(),{type:"BEGIN"});
      state=reducer(state,{type:"PROFILE",name:"검수",character:"rabbit"});
      state=reducer(state,{type:"TUTORIAL_DONE"});
      state=reducer(state,{type:"MAP",mapId:"classroom-cabinet"});
      for(const id of extras) state=reducer(state,{type:"EXTRA",id});
      state=reducer(state,{type:"CONFIRM_SET"});
      expect(validateSession(state)).toBe(true);
      for(const item of activeItems(state.mapId!,extras)) {
        const p=cabinetDestinations[item.id];
        const result=tryPlacement(state,item.id,p,p.surface,p.angle);
        expect(result.placement,`${extras}/${item.id}: ${result.message}`).toEqual(p);
        state=reducer(state,{type:"MOVE",id:item.id,placement:result.placement!});
        expect(validateSession(state)).toBe(true);
      }
      expect(unfinished(state)).toEqual([]);
      state=reducer(state,{type:"START_CLEAN"});
      state=reducer(state,{type:"VENTILATE"});
      for(const [spot,dirt] of classroomCabinet.dirt.entries())state=reducer(state,{type:"CLEAN",spot,tool:dirt.tool});
      state=reducer(state,{type:"STORE_TOOLS"});
      expect(state.step).toBe("quiz");
      state=reducer(state,{type:"QUIZ_DONE",correctCount:2});
      expect(state.step).toBe("result");
      expect(validateSession(JSON.parse(JSON.stringify(state)))).toBe(true);
    }
  }
});

it("공은 중앙 입구를 통과하고 선반 천장에 닿는 뒤쪽 배치는 거절한다",()=>{
  const before=cabinetFixture([],false), after=cabinetFixture([],true);
  const item=after.items.find(i=>i.asset==="ball")!, asset=assetsById[item.asset];
  const to=after.placements[item.id], basket=after.geometry.surfaces.find(s=>s.id==="basket")!;
  expect(fitsSurface(asset,{...to,y:431},basket,after.mapId)).toBe(false);
  expect(fitsSurface(asset,{...to,x:570},basket,after.mapId)).toBe(false);
  expect(fitsSurface(asset,to,basket,after.mapId)).toBe(true);
  for(const reverse of [false,true]) for(let i=0;i<=100;i++) {
    const frame=motionFrame({id:item.id,from:reverse?to:before.placements[item.id],to:reverse?before.placements[item.id]:to,progress:i/100},item,after.geometry,after.mapId);
    if(frame.inside&&frame.surface.id==="basket") {
      const bounds=visualBounds(item,frame.placement,frame.surface,after.mapId);
      expect(bounds.top-frame.elevation).toBeGreaterThanOrEqual(basket.ceilingY!);
    }
  }
});
