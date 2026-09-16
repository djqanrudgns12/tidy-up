import type {PhysicalMap,Placement} from "../domain/types";

/** Support planes measured from the delivered, empty 1920×1440 background. */
export const livingRoom:PhysicalMap={
 surfaces:[
  {id:"floor",label:"거실 바닥",zone:0,polygon:[35,390,942,390,942,710,35,710],depth:.45,shadow:.18},
  {id:"books",label:"책장 가운데 칸",zone:1,polygon:[489,202,655,202,663,212,479,212],depth:.18,shadow:.18,bookSpines:true,ceilingY:170,entryWidth:[479,663],insertion:{lift:3,duration:650},occluders:[[476,213,665,213,665,219,476,219]]},
  {id:"games-left",label:"놀이 상자 왼칸",zone:2,polygon:[689,241,735,241,744,251,685,251],depth:.2,shadow:.19,ceilingY:174,entryWidth:[685,745],occluders:[[683,252,747,252,747,258,683,258]]},
  {id:"games-middle",label:"놀이 상자 가운데 칸",zone:2,polygon:[756,241,805,241,814,251,752,251],depth:.2,shadow:.19,ceilingY:174,entryWidth:[752,815],occluders:[[750,252,817,252,817,258,750,258]]},
  {id:"games-right",label:"놀이 상자 오른칸",zone:2,polygon:[826,241,874,241,882,251,821,251],depth:.2,shadow:.19,ceilingY:174,entryWidth:[821,883],occluders:[[819,252,885,252,885,258,819,258]]},
  {id:"games-upper",label:"책장 아래 놀이칸",zone:2,polygon:[489,252,655,252,663,261,479,261],depth:.18,shadow:.18,ceilingY:221,entryWidth:[479,663],occluders:[[476,262,665,262,665,268,476,268]]},
  {id:"sofa",label:"소파 앉는 자리",zone:3,polygon:[111,193,430,193,436,216,68,216],depth:.25,shadow:.13},
  {id:"table",label:"낮은 탁자 위",zone:4,polygon:[151,245,454,245,454,290,85,290],depth:.32,shadow:.17},
  {id:"bin",label:"휴지통",zone:5,polygon:[903,248,937,248,937,264,903,264],baseline:256,depth:.2,shadow:.14,
   entryPolygon:[892,198,903,194,935,194,945,198,935,204,903,204],insertion:{lift:56,duration:380},occluders:[[893,199,904,205,934,205,946,199,941,266,935,271,904,269]]},
 ],
 initial:[{surface:"floor",x:161,y:435,angle:-8},{surface:"floor",x:353,y:438,angle:9},{surface:"floor",x:549,y:441,angle:0},{surface:"floor",x:776,y:437,angle:0},
 {surface:"floor",x:159,y:548,angle:-8},{surface:"floor",x:349,y:547,angle:8},{surface:"floor",x:557,y:550,angle:-8},{surface:"floor",x:795,y:549,angle:10}],
 slots:[{surface:"floor",x:210,y:666,angle:0},{surface:"floor",x:479,y:667,angle:0},{surface:"floor",x:747,y:666,angle:0}],
 dirt:[{surface:"table",x:261,y:267,tool:"duster"},{surface:"books",x:608,y:207,tool:"duster"},{surface:"floor",x:109,y:622,tool:"broom"},{surface:"floor",x:857,y:635,tool:"cloth"}],
};
export const livingRoomDestinations:Record<string,Placement>=Object.fromEntries([
 ["b1","books",508,207],["b2","books",537,207],["b3","games-left",715,247],["b4","games-middle",784,247],
 ["b5","table",191,266],["b6","sofa",162,204],["b7","sofa",314,204],["b8","bin",920,256],
 ["e1","games-right",852,247],["e2","games-upper",574,257],["e3","table",267,268],
 ["e4","table",337,268],["e5","table",403,270],["e6","table",368,254],
].map(([id,surface,x,y])=>[id,{surface,x,y,angle:0} as Placement]));
