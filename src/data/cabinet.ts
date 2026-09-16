import type { PhysicalMap, Placement } from "../domain/types";
import { cabinetBasketFront } from "./cabinet-occlusion.ts";

/** Measured cabinet supports; 42 combinations and browser activity reviewed 2026-09-16. */
export const classroomCabinet: PhysicalMap = {
  surfaces: [
    { id:"floor",label:"수납장 앞 바닥",zone:0,polygon:[35,537,832,537,832,713,35,713],depth:.45,shadow:.19 },
    { id:"top",label:"수납장 위",zone:0,polygon:[155,110,796,110,840,146,103,146],depth:.25,shadow:.2 },
    { id:"games",label:"놀이 상자 선반",zone:1,polygon:[160,260,462,260,462,316,114,316],depth:.3,shadow:.2,ceilingY:165,
      occluders:[[113,317,463,317,463,330,113,330]], },
    { id:"art",label:"미술 용품함",zone:2,polygon:[516,254,777,254,795,279,501,279],depth:.24,shadow:.22,ceilingY:165,entryWidth:[500,797],
      entryPolygon:[511,236,783,236,800,278,497,278],insertion:{lift:23,duration:380},
      occluders:[[492,274,500,278,798,278,806,273,801,310,795,314,504,314,497,310]], },
    { id:"tools",label:"작은 만들기 도구칸",zone:3,polygon:[172,399,429,399,433,432,146,432],depth:.26,shadow:.2,ceilingY:332,entryWidth:[149,435],
      entryPolygon:[165,373,437,373,444,432,135,432],insertion:{lift:19,duration:340},
      occluders:[[134,430,143,437,436,437,444,430,437,463,431,469,144,469,138,464]], },
    { id:"basket",label:"체육 물품 바구니",zone:4,polygon:[529,414,762,414,775,464,521,464],depth:.32,shadow:.22,ceilingY:332,entryWidth:[543,753],
      entryPolygon:[543,407,753,407,755,442,542,442],insertion:{lift:25,duration:420},
      perforatedOccluders:[cabinetBasketFront], },
    { id:"bin",label:"휴지통",zone:5,polygon:[880,477,938,477,948,498,940,512,880,512,871,494],depth:.25,shadow:.18,baseline:494,
      entryPolygon:[870,408,935,408,952,440,942,451,875,451,865,440],insertion:{lift:63,duration:380},
      occluders:[[858,421,867,439,876,452,942,452,956,443,961,433,951,535,943,549,881,549,872,539]], },
  ],
  initial: [
    {surface:"floor",x:140,y:560,angle:0},{surface:"floor",x:290,y:560,angle:0},
    {surface:"floor",x:445,y:564,angle:-9},{surface:"floor",x:590,y:564,angle:8},
    {surface:"floor",x:735,y:568,angle:-5},{surface:"floor",x:155,y:669,angle:12},
    {surface:"floor",x:310,y:668,angle:0},{surface:"floor",x:470,y:670,angle:13},
  ],
  slots:[{surface:"floor",x:570,y:660,angle:0},{surface:"floor",x:690,y:655,angle:0},{surface:"floor",x:80,y:615,angle:0}],
  dirt:[{x:394,y:127,surface:"top",tool:"duster"},{x:360,y:292,surface:"games",tool:"duster"},
    {x:398,y:607,surface:"floor",tool:"broom"},{x:762,y:615,surface:"floor",tool:"cloth"}],
};
export const cabinetDestinations: Record<string,Placement> = Object.fromEntries(
  [
    ["b1","games",195,301],["b2","games",313,301],
    ["b3","art",536,266],["b4","art",590,266],["b5","art",649,266],
    ["b6","basket",703,444],["b7","basket",590,449],["b8","bin",909,494],
    ["e1","tools",202,416],["e2","tools",292,416],["e3","tools",372,416],
    ["e4","art",713,266],["e5","art",764,268],["e6","games",418,301],
  ].map(([id,surface,x,y])=>[id,{surface,x,y,angle:0} as Placement])
);
