import type {PhysicalMap,Placement} from "../domain/types";

/** Measured supports, 42 combinations and full browser activity verified 2026-09-16. */
export const homeDesk:PhysicalMap={
 surfaces:[
  {id:"floor",label:"책상 앞 바닥",zone:0,polygon:[35,455,940,455,940,710,35,710],depth:.45,shadow:.18},
  {id:"books",label:"왼쪽 책꽂이",zone:1,polygon:[149,193,232,193,232,225,118,225],depth:.3,shadow:.22,bookSpines:true,
   ceilingY:88,entryWidth:[119,235],insertion:{lift:8,duration:650},occluders:[[117,226,236,226,236,237,117,237]]},
  {id:"books-lower",label:"아래 책꽂이",zone:1,polygon:[149,350,232,350,232,389,118,389],depth:.3,shadow:.22,bookSpines:true,
   ceilingY:240,entryWidth:[119,235],insertion:{lift:8,duration:650},occluders:[[117,390,236,390,236,416,117,416]]},
  {id:"documents",label:"뒤쪽 공책·자료 받침",zone:2,polygon:[277,105,780,105,788,124,274,124],depth:.19,shadow:.2,
   occluders:[[274,124,788,124,789,132,273,132]]},
  {id:"desk",label:"공부할 책상 면",zone:0,polygon:[273,137,790,137,851,207,230,207],depth:.35,shadow:.22,supportKey:"desktop",vanishingPoint:{x:487,y:-158}},
  {id:"ready",label:"자주 쓰는 물건 자리",zone:4,polygon:[658,142,790,142,838,199,658,199],depth:.35,shadow:.22,supportKey:"desktop",vanishingPoint:{x:487,y:-158}},
  {id:"drawer",label:"열린 서랍 안",zone:3,polygon:[662,269,812,269,821,294,658,294],depth:.26,shadow:.18,
   entryPolygon:[664,232,802,232,817,269,660,269],entryOffsetY:29,entryWidth:[663,817],insertion:{lift:29,duration:410},
   occluders:[[653,273,726,273,727,288,775,288,778,273,849,273,849,347,657,347]]},
  {id:"bin",label:"휴지통",zone:5,polygon:[866,391,937,391,937,410,866,410],baseline:401,depth:.22,shadow:.17,
   entryPolygon:[858,316,866,307,894,303,922,307,945,317,939,328,908,335,875,331],insertion:{lift:80,duration:410},
   occluders:[[856,317,864,328,881,333,909,336,934,330,947,319,938,423,927,436,905,440,879,436,864,425]]},
 ],
 initial:[
  {surface:"desk",x:330,y:169,angle:-7},{surface:"desk",x:462,y:173,angle:10},
  {surface:"desk",x:589,y:173,angle:-5},{surface:"floor",x:145,y:510,angle:-12},
  {surface:"floor",x:295,y:512,angle:9},{surface:"floor",x:453,y:511,angle:-8},
  {surface:"floor",x:629,y:514,angle:0},{surface:"floor",x:808,y:514,angle:8},
 ],
 slots:[{surface:"floor",x:250,y:641,angle:0},{surface:"floor",x:465,y:641,angle:0},{surface:"floor",x:687,y:641,angle:0}],
 dirt:[{x:488,y:196,surface:"desk",tool:"duster"},{x:364,y:116,surface:"documents",tool:"duster"},
  {x:115,y:640,surface:"floor",tool:"broom"},{x:827,y:643,surface:"floor",tool:"cloth"}],
};
export const homeDeskDestinations:Record<string,Placement>=Object.fromEntries([
 ["b1","books",178,212],["b2","documents",335,115],["b3","documents",433,115],
 ["b4","drawer",691,277],["b5","drawer",773,281],["b6","documents",542,115],
 ["b7","ready",742,176],["b8","bin",902,401],
 ["e1","ready",801,178],["e2","drawer",735,281],["e3","drawer",801,281],
 ["e4","ready",695,152],["e5","documents",664,115],["e6","drawer",691,289],
].map(([id,surface,x,y])=>[id,{surface,x,y,angle:0} as Placement]));
