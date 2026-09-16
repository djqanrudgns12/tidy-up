import { expect,it } from "vitest";
import { auditAllMaps } from "../proof/placement-audit";
import { assetsById } from "../data/catalog";
import { physicalMaps } from "../data/physical";
import { fitsSurface, stableBookSupport, supportedPolygon } from "./placement";
import { makeSession, reducer, tryPlacement, placementIssues } from "./session";
import { validateSession } from "./storage";
import { mapsById } from "../data/maps";
import { paintOrder } from "../rendering/paint";
import { motionFrame } from "../rendering/motion";

it("9개 공간의 물건126개 설정과 모든 지지면을 실제 크기로 검사한다",()=>{
  const report=auditAllMaps();
  let pairs=0,valid=0,flat=0;
  const missing:string[]=[];
  for(const {mapId,rows} of report)for(const {item,places} of rows) {
    if(!places.some(p=>p.placement && p.surface.id!=="floor"))missing.push(`${mapId}/${item.asset}`);
    for(const {surface,placement,flat:lying} of places) {
      pairs++;
      if(placement){valid++;expect(fitsSurface(assetsById[item.asset],placement,surface,mapId)).toBe(true);}
      if(lying){flat++;expect(fitsSurface(assetsById[item.asset],lying,surface,mapId)).toBe(true);}
    }
  }
  expect(pairs).toBe(1134);expect(valid).toBeGreaterThan(0);expect(flat).toBeGreaterThan(0);
  expect(report).toHaveLength(9);
  expect(new Set(report.flatMap(m=>m.rows.map(r=>r.item.asset))).size).toBe(72);
  expect(missing).toEqual([]);
},30000);

it("오목한 바닥의 모든 꼭짓점이 안쪽이어도 가구 모서리를 가로지르면 거부한다",()=>{
  const floor=[0,0,100,0,100,100,60,100,60,40,40,40,40,100,0,100];
  expect(supportedPolygon([{x:20,y:60},{x:80,y:60},{x:80,y:90},{x:20,y:90}],floor)).toBe(false);
  expect(supportedPolygon([{x:10,y:5},{x:90,y:5},{x:90,y:35},{x:10,y:35}],floor)).toBe(true);
});

it("책을 약간 어긋나게 포갤 수 있지만 지지 면적 부족과 큰 돌출은 거부한다",()=>{
  const lower=[{x:0,y:0},{x:100,y:0},{x:100,y:50},{x:0,y:50}];
  expect(stableBookSupport(lower.map(p=>({...p,x:p.x+4})),lower)).toBe(true);
  expect(stableBookSupport(lower.map(p=>({...p,x:p.x+15})),lower)).toBe(false);
  expect(stableBookSupport(lower.map(p=>({x:p.x*1.12-6,y:p.y*1.12-3})),lower)).toBe(false);
});

it("낮은 책장에 눕힌 책의 자세·회전·꺼내기와 저장 복원이 일치한다",()=>{
  let s=reducer(makeSession(),{type:"BEGIN"});
  s=reducer(s,{type:"PROFILE",name:"전수검수",character:"rabbit"});
  s=reducer(s,{type:"TUTORIAL_DONE"});
  s=reducer(s,{type:"MAP",mapId:"library"});
  const p=tryPlacement(s,"b1",{x:440,y:219},"info-middle",undefined,"flat").placement;
  expect(p).toBeDefined();expect(p!.bookPose).toBe("flat");
  s=reducer(s,{type:"MOVE",id:"b1",placement:p!});
  expect(s.placements.b1).toEqual(p);expect(validateSession(JSON.parse(JSON.stringify(s)))).toBe(true);
  const to=tryPlacement(s,"b1",{x:200,y:600},"floor").placement!;
  expect(to.bookPose).toBeUndefined();
  s=reducer(s,{type:"MOVE",id:"b1",placement:to});
  expect(s.placements.b1).toEqual(to);expect(placementIssues(s).size).toBe(0);
  const forged={...s,placements:{...s.placements,b1:{...to,bookPose:"flat" as const}}};
  expect(validateSession(forged)).toBe(false);
  expect(physicalMaps.library.surfaces.find(v=>v.id==="info-middle")!.bookSpines).toBe(true);
});

it("같은 상판을 가리키는 영역 사이에서도 앞뒤 순서와 포갠 책 순서를 지킨다",()=>{
  const items = mapsById["school-desk"].base.slice(0, 3);
  const model = { geometry: physicalMaps["school-desk"], items, placements: {
    [items[0].id]: {surface:"desk", x:400,y:180,angle:0},
    [items[1].id]: {surface:"ready-top", x:400,y:178,angle:0,stackOn:items[0].id},
    [items[2].id]: {surface:"ready-top", x:550,y:175,angle:0},
  }};
  expect(paintOrder(model).map(i=>i.id)).toEqual([items[2].id, items[0].id, items[1].id]);
});

it("같은 책장 칸에서도 자세 전환이 실제 원화의 두 끝점과 맞는다",()=>{
  const item=mapsById.library.base[1],geometry=physicalMaps.library;
  const from={surface:"info-middle",x:440,y:219,angle:0};
  const to={...from,bookPose:"flat" as const};
  const start=motionFrame({id:item.id,from,to,progress:0},item,geometry,"library");
  const middle=motionFrame({id:item.id,from,to,progress:.5},item,geometry,"library");
  const end=motionFrame({id:item.id,from,to,progress:1},item,geometry,"library");
  expect(start.surface.bookSpines).toBe(true);
  expect(middle.bookTurn).toBeDefined();
  expect(end.surface.bookSpines).toBe(false);
  expect(end.placement).toEqual(to);expect(end.elevation).toBeCloseTo(0);
});
