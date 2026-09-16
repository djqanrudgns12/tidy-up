import {expect,it} from "vitest";
import {lockerCombinations,lockerFixture} from "../data/locker-fixtures";
import {assetsById} from "../data/catalog";
import {fitsSurface,footprint,footprintsOverlap,sizeOf} from "./placement";
import {locker,lockerDestinations} from "../data/locker";
import {physicalMaps} from "../data/physical";
import {activeItems,makeSession,reducer,tryPlacement,unfinished} from "./session";
import {validateSession} from "./storage";
import {motionFrame} from "../rendering/motion";
import {dragPlacement} from "./interaction";
import {visualBounds} from "../rendering/paint";

it("사물함 42조합의 전후 실제 지지면과 물건 간격",()=>{
  expect(lockerCombinations).toHaveLength(42);
  const failures=new Set<string>();
  for(const extras of lockerCombinations)for(const organized of [false,true]){
    const m=lockerFixture(extras,organized);
    for(const item of m.items){
      const p=m.placements[item.id],s=m.geometry.surfaces.find(s=>s.id===p.surface)!;
      if(!fitsSurface(assetsById[item.asset],p,s,m.mapId))failures.add(`${organized}/${item.id}: outside`);
      for(const other of m.items.filter(o=>o.id>item.id)){
        const q=m.placements[other.id];if(q.surface!==p.surface)continue;
        if(footprintsOverlap(footprint(assetsById[item.asset],p,s,m.mapId),footprint(assetsById[other.asset],q,s,m.mapId)))failures.add(`${organized}/${item.id}+${other.id}: overlap`);
      }
    }
  }
  expect([...failures]).toEqual([]);
});
it("책은 바닥과 책칸에서 실제 높이를 유지하고 별도 책등 폭을 사용한다",()=>{
  const m=lockerFixture([],true);
  for(const id of ["b1","b2","b3"]){
    const item=m.items.find(i=>i.id===id)!,asset=assetsById[item.asset];
    const s=m.geometry.surfaces.find(s=>s.id===m.placements[id].surface)!;
    const flat=sizeOf(asset,m.mapId),upright=sizeOf(asset,m.mapId,s);
    expect(upright[1]).toBe(flat[1]);expect(upright[0]).toBeLessThan(flat[0]);
  }
});
it("책의 전환은 입구 밖에서 끝나고 끌 때 잡은 원화를 유지한다",()=>{
  const before=lockerFixture([],false),after=lockerFixture([],true);
  for(const id of ["b1","b2","b3"]){
    const item=after.items.find(i=>i.id===id)!;
    const stored=after.placements[id],floor=before.placements[id];
    expect(dragPlacement(item,{...stored,x:400,y:600},locker,"locker").surface).toBe(stored.surface);
    for(const reverse of [false,true])for(let i=0;i<=100;i++){
      const frame=motionFrame({id,from:reverse?stored:floor,to:reverse?floor:stored,progress:i/100},item,locker,"locker");
      if(frame.bookTurn)expect(frame.inside).toBe(false);
      if(frame.inside&&frame.surface.bookSpines){
        expect(frame.bookTurn).toBeUndefined();
        expect(visualBounds(item,frame.placement,frame.surface,"locker").top-frame.elevation).toBeGreaterThanOrEqual(frame.surface.ceilingY!);
      }
    }
  }
});
it("사물함 42조합 모두 실제 이동 검증·복원·정리·청소·퀴즈 전이를 통과한다",()=>{
  const previous=physicalMaps.locker; physicalMaps.locker=locker;
  try {
    for(const extras of lockerCombinations) {
      let state=reducer(makeSession(),{type:"BEGIN"});
      state=reducer(state,{type:"PROFILE",name:"검수",character:"rabbit"});
      state=reducer(state,{type:"TUTORIAL_DONE"});
      state=reducer(state,{type:"MAP",mapId:"locker"});
      for(const id of extras) state=reducer(state,{type:"EXTRA",id});
      state=reducer(state,{type:"CONFIRM_SET"});
      expect(validateSession(state)).toBe(true);
      for(const item of activeItems(state.mapId!,extras)) {
        const p=lockerDestinations[item.id];
        const result=tryPlacement(state,item.id,p,p.surface,p.angle);
        expect(result.placement,`${extras}/${item.id}: ${result.message}`).toEqual(p);
        state=reducer(state,{type:"MOVE",id:item.id,placement:result.placement!});
        expect(validateSession(state)).toBe(true);
      }
      expect(unfinished(state)).toEqual([]);
      state=reducer(state,{type:"START_CLEAN"});
      state=reducer(state,{type:"VENTILATE"});
      for(const [spot,dirt] of locker.dirt.entries())state=reducer(state,{type:"CLEAN",spot,tool:dirt.tool});
      state=reducer(state,{type:"STORE_TOOLS"});
      expect(state.step).toBe("quiz");
      state=reducer(state,{type:"QUIZ_DONE"});
      expect(state.step).toBe("result");
      expect(validateSession(JSON.parse(JSON.stringify(state)))).toBe(true);
    }
  } finally {physicalMaps.locker=previous;}
});



it("칸 근처에 대충 놓아도 가까운 빈자리에 맞춰 정리되고 다른 물건은 움직이지 않는다",()=>{
  const previous=physicalMaps.locker; physicalMaps.locker=locker;
  try {
    for(const extras of [[],["e1","e2","e4"],["e3","e5","e6"]]) {
      let state=reducer(makeSession(),{type:"BEGIN"});
      state=reducer(state,{type:"PROFILE",name:"검수",character:"rabbit"});
      state=reducer(state,{type:"TUTORIAL_DONE"});
      state=reducer(state,{type:"MAP",mapId:"locker"});
      for(const id of extras) state=reducer(state,{type:"EXTRA",id});
      state=reducer(state,{type:"CONFIRM_SET"});
      for(const [i,item] of activeItems(state.mapId!,extras).entries()) {
        const target=lockerDestinations[item.id];
        // Released off to the side and below the opening, as a hurried drag would.
        const rough={x:target.x+(i%2?28:-28),y:target.y+45};
        const before=state.placements;
        const result=tryPlacement(state,item.id,rough);
        expect(result.placement,`${extras}/${item.id}: ${result.message}`).toBeDefined();
        const surface=locker.surfaces.find(s=>s.id===result.placement!.surface)!;
        expect(item.zones,`${extras}/${item.id} → ${surface.id}`).toContain(surface.zone);
        state=reducer(state,{type:"MOVE",id:item.id,placement:result.placement!});
        expect(state.placements[item.id]).toEqual(result.placement);
        for(const other of Object.keys(before).filter(id=>id!==item.id))
          expect(state.placements[other]).toEqual(before[other]);
        expect(validateSession(state)).toBe(true);
      }
      expect(unfinished(state)).toEqual([]);
    }
  } finally {physicalMaps.locker=previous;}
});
