import type { PhysicalMap, Placement } from "../domain/types";

/** Measured from artwork/locker.png; 42 combinations and browser activity reviewed 2026-09-16. */
export const locker: PhysicalMap = {
  surfaces: [
    {id:"floor",label:"사물함 앞 바닥",zone:0,polygon:[35,435,855,435,855,709,35,709],depth:.45,shadow:.19},
    {id:"top",label:"사물함 위",zone:0,polygon:[137,87,814,87,852,112,98,112],depth:.23,shadow:.2},
    {id:"books",label:"교과서 칸",zone:1,polygon:[135,350,174,350,174,384,109,384],depth:.23,shadow:.22,bookSpines:true,insertion:{lift:10,duration:650},ceilingY:128,entryWidth:[109,173],
      occluders:[[107,385,176,385,176,396,107,396]]},
    {id:"notebooks",label:"공책 칸",zone:2,polygon:[207,350,247,350,247,384,183,384],depth:.23,shadow:.22,bookSpines:true,insertion:{lift:10,duration:650},ceilingY:128,entryWidth:[183,246],
      occluders:[[181,385,249,385,249,396,181,396]]},
    {id:"folders",label:"자료 파일 칸",zone:2,polygon:[280,350,322,350,322,384,257,384],depth:.23,shadow:.22,bookSpines:true,insertion:{lift:10,duration:650},ceilingY:128,entryWidth:[257,321],
      occluders:[[255,385,325,385,325,396,255,396]]},
    {id:"supplies-upper",label:"준비물 위 선반",zone:3,polygon:[350,227,549,227,559,253,335,253],depth:.25,shadow:.2,ceilingY:128,entryWidth:[336,558],
      occluders:[[334,254,560,254,560,264,334,264]]},
    {id:"supplies-lower",label:"준비물 아래 선반",zone:3,polygon:[350,350,549,350,559,384,335,384],depth:.25,shadow:.2,ceilingY:266,entryWidth:[336,558],
      occluders:[[334,385,560,385,560,396,334,396]]},
    {id:"small-upper",label:"작은 준비물 위칸",zone:3,polygon:[576,182,681,182,693,199,574,199],depth:.24,shadow:.2,ceilingY:128,entryWidth:[575,692],
      occluders:[[573,200,694,200,694,209,573,209]]},
    {id:"small-middle",label:"작은 준비물 가운데칸",zone:3,polygon:[576,264,681,264,693,288,574,288],depth:.24,shadow:.2,ceilingY:211,entryWidth:[575,692],
      occluders:[[573,289,694,289,694,297,573,297]]},
    {id:"small-lower",label:"작은 준비물 아래칸",zone:3,polygon:[576,350,681,350,693,384,574,384],depth:.24,shadow:.2,ceilingY:299,entryWidth:[575,692],
      occluders:[[573,385,694,385,694,396,573,396]]},
    {id:"bags",label:"주머니 보관칸",zone:4,polygon:[721,350,819,350,841,384,707,384],depth:.25,shadow:.2,ceilingY:128,entryWidth:[708,840],
      occluders:[[705,385,843,385,843,396,705,396]]},
    {id:"hook",label:"실내화 주머니 걸이",zone:4,polygon:[752,137,796,137,796,180,752,180],depth:1,shadow:.2,pose:"hanging",anchor:{x:774,y:164},
      shadowReceiver:[709,174,839,174,839,348,709,348]},
    {id:"bin",label:"휴지통",zone:5,polygon:[884,383,937,383,942,398,881,398],depth:.23,shadow:.17,baseline:390,
      entryPolygon:[868,301,947,301,956,313,946,325,879,325,865,313],insertion:{lift:78,duration:390},
      occluders:[[864,310,875,321,892,325,931,325,948,320,957,311,945,415,933,424,889,424,878,417]]},
  ],
  initial:[
    {surface:"floor",x:135,y:480,angle:-7},{surface:"floor",x:285,y:480,angle:9},
    {surface:"floor",x:445,y:480,angle:-6},{surface:"floor",x:610,y:484,angle:8},
    {surface:"floor",x:750,y:575,angle:0},{surface:"floor",x:145,y:658,angle:0},
    {surface:"floor",x:315,y:650,angle:12},{surface:"floor",x:480,y:655,angle:-8},
  ],
  slots:[{surface:"floor",x:606,y:655,angle:0},{surface:"floor",x:756,y:655,angle:0},{surface:"floor",x:440,y:567,angle:0}],
  dirt:[{x:399,y:99,surface:"top",tool:"duster"},{x:490,y:243,surface:"supplies-upper",tool:"duster"},
    {x:228,y:559,surface:"floor",tool:"broom"},{x:600,y:560,surface:"floor",tool:"cloth"}],
};
export const lockerDestinations: Record<string,Placement> = Object.fromEntries([
  ["b1","books",145,370],["b2","notebooks",218,370],["b3","folders",296,373],
  ["b4","supplies-upper",373,241],["b5","hook",774,164],["b6","supplies-upper",448,249],
  ["b7","supplies-upper",519,241],["b8","bin",910,390],
  ["e1","small-upper",635,191],["e2","bags",770,361],["e3","small-middle",636,278],
  ["e4","supplies-lower",414,368],["e5","supplies-lower",520,368],["e6","bags",798,378],
].map(([id,surface,x,y])=>[id,{surface,x,y,angle:0} as Placement]));



