import {expect,it} from "vitest";
import {libraryCombinations,libraryFixture} from "../data/library-fixtures";
import {assetsById} from "../data/catalog";
import {fitsSurface,footprint,footprintsOverlap,sizeOf} from "./placement";
import {library,libraryDestinations} from "../data/library";
import {physicalMaps} from "../data/physical";
import {activeItems,makeSession,reducer,tryPlacement,unfinished} from "./session";
import {validateSession} from "./storage";
import {motionFrame} from "../rendering/motion";
import {dragPlacement} from "./interaction";
import {visualBounds} from "../rendering/paint";

it("도서관 42조합의 전후 실제 지지면과 물건 간격",()=>{
  expect(libraryCombinations).toHaveLength(42);
  const failures=new Set<string>();
  for(const extras of libraryCombinations)for(const organized of [false,true]){
    const m=libraryFixture(extras,organized);
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
  const m=libraryFixture([],true);
  for(const id of ["b2","b4","b5"]){
    const item=m.items.find(i=>i.id===id)!,asset=assetsById[item.asset];
    const s=m.geometry.surfaces.find(s=>s.id===m.placements[id].surface)!;
    const flat=sizeOf(asset,m.mapId),upright=sizeOf(asset,m.mapId,s);
    expect(upright[1]).toBe(flat[1]);expect(upright[0]).toBeLessThan(flat[0]);
  }
});
it("책의 전환은 입구 밖에서 끝나고 끌 때 잡은 원화를 유지한다",()=>{
  const before=libraryFixture([],false),after=libraryFixture([],true);
  for(const id of ["b2","b4","b5"]){
    const item=after.items.find(i=>i.id===id)!;
    const stored=after.placements[id],floor=before.placements[id];
    expect(dragPlacement(item,{...stored,x:400,y:600},library,"library").surface).toBe(stored.surface);
    for(const reverse of [false,true])for(let i=0;i<=100;i++){
      const frame=motionFrame({id,from:reverse?stored:floor,to:reverse?floor:stored,progress:i/100},item,library,"library");
      if(frame.bookTurn)expect(frame.inside).toBe(false);
      if(frame.inside&&frame.surface.bookSpines){
        expect(frame.bookTurn).toBeUndefined();
        expect(visualBounds(item,frame.placement,frame.surface,"library").top-frame.elevation).toBeGreaterThanOrEqual(frame.surface.ceilingY!);
      }
    }
  }
});
it("도서관 42조합 모두 실제 이동 검증·복원·정리·청소·퀴즈 전이를 통과한다",()=>{
  const previous=physicalMaps.library; physicalMaps.library=library;
  try {
    for(const extras of libraryCombinations) {
      let state=reducer(makeSession(),{type:"BEGIN"});
      state=reducer(state,{type:"PROFILE",name:"검수",character:"rabbit"});
      state=reducer(state,{type:"TUTORIAL_DONE"});
      state=reducer(state,{type:"MAP",mapId:"library"});
      for(const id of extras) state=reducer(state,{type:"EXTRA",id});
      state=reducer(state,{type:"CONFIRM_SET"});
      expect(validateSession(state)).toBe(true);
      for(const item of activeItems(state.mapId!,extras)) {
        const p=libraryDestinations[item.id];
        const result=tryPlacement(state,item.id,p,p.surface,p.angle);
        expect(result.placement,`${extras}/${item.id}: ${result.message}`).toEqual(p);
        state=reducer(state,{type:"MOVE",id:item.id,placement:result.placement!});
        expect(validateSession(state)).toBe(true);
      }
      expect(unfinished(state)).toEqual([]);
      state=reducer(state,{type:"START_CLEAN"});
      state=reducer(state,{type:"VENTILATE"});
      for(const [spot,dirt] of library.dirt.entries())state=reducer(state,{type:"CLEAN",spot,tool:dirt.tool});
      state=reducer(state,{type:"STORE_TOOLS"});
      expect(state.step).toBe("quiz");
      state=reducer(state,{type:"QUIZ_DONE"});
      expect(state.step).toBe("result");
      expect(validateSession(JSON.parse(JSON.stringify(state)))).toBe(true);
    }
  } finally {if(previous)physicalMaps.library=previous;else delete physicalMaps.library;}
});




