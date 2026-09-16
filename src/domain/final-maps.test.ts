import {expect,it} from "vitest";
import {finalMaps,finalCombinations,type FinalMapId} from "../data/final-maps-fixtures";
import {physicalMaps} from "../data/physical";
import {activeItems,makeSession,reducer,tryPlacement,unfinished,placementIssues} from "./session";
import {validateSession} from "./storage";
for(const id of Object.keys(finalMaps) as FinalMapId[]) it(`${id}: 42조합의 실측 배치와 초기 각도, 전체 활동 및 복원`,()=>{
 const {geometry,destinations}=finalMaps[id],previous=physicalMaps[id];physicalMaps[id]=geometry;
 try{for(const extras of finalCombinations(id))for(const tapped of [false,true]){
  let state=reducer(makeSession(),{type:"BEGIN"});state=reducer(state,{type:"PROFILE",name:"검수",character:"rabbit"});
  state=reducer(state,{type:"TUTORIAL_DONE"});state=reducer(state,{type:"MAP",mapId:id});
  for(const extra of extras)state=reducer(state,{type:"EXTRA",id:extra});state=reducer(state,{type:"CONFIRM_SET"});
  expect([...placementIssues(state)],`initial ${extras}`).toEqual([]);
  for(const item of activeItems(id,extras)){
   const p=destinations[item.id],s=geometry.surfaces.find(s=>s.id===p.surface)!;
   const point=tapped&&s.entryPolygon?{x:p.x,y:p.y-(s.insertion?.lift??0)}:p;
   const result=tryPlacement(state,item.id,point,tapped?undefined:p.surface,tapped?undefined:0);
   expect(result.placement,`${extras}/${item.id}/tap=${tapped}: ${result.message}`).toBeDefined();
   expect(result.placement!.surface).toBe(p.surface);
   state=reducer(state,{type:"MOVE",id:item.id,placement:result.placement!});expect(validateSession(state)).toBe(true);
  }
  expect(unfinished(state)).toEqual([]);state=reducer(state,{type:"START_CLEAN"});state=reducer(state,{type:"VENTILATE"});
  geometry.dirt.forEach((d,spot)=>{state=reducer(state,{type:"CLEAN",spot,tool:d.tool});});
  state=reducer(state,{type:"STORE_TOOLS"});expect(state.step).toBe("quiz");state=reducer(state,{type:"QUIZ_DONE",correctCount:2});
  expect(state.step).toBe("result");expect(validateSession(JSON.parse(JSON.stringify(state)))).toBe(true);
 }}finally{if(previous)physicalMaps[id]=previous;else delete physicalMaps[id];}
});
