import type {PhysicalMap,Placement} from "../domain/types";

/** Shoe soles and front lips measured from the actual delivered furniture. */
export const shoeCabinet:PhysicalMap={
 surfaces:[
  {id:"floor",label:"현관 바닥",zone:0,polygon:[35,402,940,402,940,710,35,710],depth:.45,shadow:.18},
  {id:"outdoor",label:"바깥 신발 선반",zone:1,polygon:[185,251,583,251,592,263,151,263],depth:.22,shadow:.19,ceilingY:176,entryWidth:[152,592],occluders:[[151,264,592,264,592,270,151,270]]},
  {id:"indoor",label:"실내화 선반",zone:2,polygon:[185,342,583,342,592,362,151,362],depth:.3,shadow:.19,ceilingY:272,entryWidth:[152,592],occluders:[[150,363,593,363,593,371,150,371]]},
  {id:"care-upper",label:"관리용품 위칸",zone:3,polygon:[618,225,704,225,714,234,611,234],depth:.2,shadow:.18,ceilingY:176,entryWidth:[611,714],occluders:[[611,235,715,235,715,243,611,243]]},
  {id:"care-lower",label:"관리용품 아래칸",zone:3,polygon:[618,290,704,290,714,300,611,300],depth:.2,shadow:.18,ceilingY:245,entryWidth:[611,714],occluders:[[611,301,715,301,715,307,611,307]]},
  {id:"accessories",label:"현관 소품칸",zone:4,polygon:[618,352,704,352,714,362,611,362],depth:.22,shadow:.18,ceilingY:309,entryWidth:[611,714],occluders:[[611,364,715,364,715,371,611,371]]},
  {id:"hook-left",label:"현관 왼쪽 걸이",zone:4,polygon:[635,43,655,43,655,64,635,64],anchor:{x:646,y:52},depth:.25,shadow:.14,pose:"hanging",hangingBounds:[599,35,692,35,692,154,599,154]},
  {id:"hook-right",label:"현관 오른쪽 걸이",zone:4,polygon:[699,43,718,43,718,64,699,64],anchor:{x:710,y:52},depth:.25,shadow:.14,pose:"hanging",hangingBounds:[671,35,751,35,751,154,671,154]},
  {id:"hook-cover",label:"우산 커버 걸이",zone:4,polygon:[762,43,784,43,784,64,762,64],anchor:{x:773,y:52},depth:.25,shadow:.14,pose:"hanging",accepts:["umbrella-cover"],hangingBounds:[754,35,801,35,801,178,754,178]},
  {id:"umbrella",label:"우산꽂이",zone:4,polygon:[742,368,791,368,791,379,742,379],depth:.15,shadow:.15,entryPolygon:[736,338,785,338,795,349,739,349],entryOffsetY:29,insertion:{lift:29,duration:450},accepts:["umbrella","umbrella-cover"],occluders:[[737,350,796,350,796,382,737,382]]},
  {id:"bin",label:"휴지통",zone:5,polygon:[839,366,891,366,891,385,839,385],baseline:376,depth:.2,shadow:.15,entryPolygon:[837,266,887,266,898,276,837,276,828,271],insertion:{lift:105,duration:450},occluders:[[825,272,837,282,894,282,902,277,897,389,836,389]]},
 ],
 initial:[{surface:"floor",x:156,y:466,angle:0},{surface:"floor",x:351,y:466,angle:0},{surface:"floor",x:553,y:474,angle:0},{surface:"floor",x:786,y:463,angle:8},
 {surface:"floor",x:159,y:570,angle:-8},{surface:"floor",x:353,y:590,angle:0},{surface:"floor",x:558,y:581,angle:0},{surface:"floor",x:791,y:565,angle:10}],
 slots:[{surface:"floor",x:210,y:679,angle:0},{surface:"floor",x:479,y:679,angle:0},{surface:"floor",x:747,y:679,angle:0}],
 dirt:[{surface:"outdoor",x:471,y:258,tool:"duster"},{surface:"care-lower",x:674,y:295,tool:"duster"},{surface:"floor",x:107,y:639,tool:"broom"},{surface:"floor",x:861,y:642,tool:"cloth"}],
};
export const shoeCabinetDestinations:Record<string,Placement>=Object.fromEntries([
 ["b1","outdoor",233,258],["b2","indoor",242,356],["b3","outdoor",369,258],["b4","care-upper",638,230],
 ["b5","care-lower",664,295],["b6","umbrella",754,376],["b7","hook-left",646,52],["b8","bin",865,376],
 ["e1","outdoor",505,258],["e2","hook-cover",773,52],["e3","hook-right",710,52],
 ["e4","care-upper",685,230],["e5","accessories",638,358],["e6","accessories",686,358],
].map(([id,surface,x,y])=>[id,{surface,x,y,angle:0} as Placement]));
