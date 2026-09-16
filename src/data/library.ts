import type {PhysicalMap,Placement} from "../domain/types";

/** Measured and reviewed in 42 combinations and browser activity, 2026-09-16. */
export const library:PhysicalMap={
 surfaces:[
  {id:"floor",label:"책장 앞 바닥",zone:0,polygon:[35,342,945,342,945,710,35,710],depth:.45,shadow:.18,
   obstacles:[[646,396,663,396,663,408,646,408],[655,438,676,438,676,452,655,452],[890,438,910,438,910,453,890,453]],
   depthOccluders:[{depth:452,polygon:[630,290,649,280,866,280,923,326,923,346,904,350,653,350,639,334]},
    {depth:408,polygon:[640,345,658,345,658,407,640,407]},
    {depth:452,polygon:[651,346,676,346,676,451,654,451]},
    {depth:453,polygon:[888,346,910,346,910,452,889,452]}]},
  {id:"display-upper",label:"이야기책 위 진열대",zone:1,polygon:[97,136,314,136,311,181,84,181],depth:.62,shadow:.22,tiltedPanel:true,
   occluders:[[81,182,314,182,313,195,84,196]]},
  {id:"display-middle",label:"이야기책 아래 진열대",zone:1,polygon:[92,210,312,210,308,256,77,256],depth:.62,shadow:.22,tiltedPanel:true,
   occluders:[[76,257,311,257,310,270,78,271]]},
  {id:"info-upper",label:"정보책 위 선반",zone:2,polygon:[360,144,600,144,608,153,349,153],depth:.15,shadow:.2,bookSpines:true,ceilingY:90,entryWidth:[350,607],insertion:{lift:4,duration:650},
   occluders:[[348,154,609,154,609,163,348,163]]},
  {id:"info-middle",label:"정보책 가운데 선반",zone:2,polygon:[360,213,600,213,608,225,349,225],depth:.18,shadow:.2,bookSpines:true,ceilingY:164,entryWidth:[350,607],insertion:{lift:4,duration:650},
   occluders:[[348,226,609,226,609,235,348,235]]},
  {id:"info-lower",label:"정보책 아래 선반",zone:2,polygon:[360,286,600,286,608,302,349,302],depth:.22,shadow:.2,bookSpines:true,ceilingY:236,entryWidth:[350,607],insertion:{lift:4,duration:650},
   occluders:[[348,303,609,303,609,322,348,322]]},
  {id:"returns",label:"반납 선반",zone:3,polygon:[668,207,830,207,847,219,667,219],depth:.16,shadow:.2,ceilingY:163,entryWidth:[668,846],
   occluders:[[666,220,848,220,848,228,666,228]]},
  {id:"table",label:"독서 탁자",zone:4,polygon:[643,286,864,286,915,330,656,330],depth:.34,shadow:.2,vanishingPoint:{x:505,y:-48},
   occluders:[[651,332,922,332,922,347,654,347]]},
  {id:"bin",label:"휴지통",zone:5,polygon:[889,292,938,292,938,309,889,309],depth:.2,shadow:.17,baseline:301,
   entryPolygon:[879,232,941,232,948,238,942,246,884,246,879,239],insertion:{lift:62,duration:380},
   occluders:[[877,237,882,242,895,246,934,246,948,238,943,314,933,323,892,323,883,314]]},
 ],
 initial:[
  {surface:"floor",x:115,y:396,angle:-7},{surface:"floor",x:270,y:398,angle:8},
  {surface:"floor",x:425,y:400,angle:-9},{surface:"floor",x:565,y:404,angle:7},
  {surface:"floor",x:115,y:567,angle:4},{surface:"floor",x:275,y:566,angle:-8},
  {surface:"floor",x:430,y:567,angle:10},{surface:"floor",x:570,y:565,angle:0},
 ],
 slots:[{surface:"floor",x:725,y:558,angle:0},{surface:"floor",x:857,y:560,angle:0},{surface:"floor",x:460,y:655,angle:0}],
 dirt:[{x:473,y:148,surface:"info-upper",tool:"duster"},{x:793,y:302,surface:"table",tool:"duster"},
  {x:325,y:475,surface:"floor",tool:"broom"},{x:719,y:659,surface:"floor",tool:"cloth"}],
};
export const libraryDestinations:Record<string,Placement>=Object.fromEntries([
 ["b1","display-upper",142,159],["b2","info-upper",407,149],
 ["b3","display-upper",244,159],["b4","info-upper",502,149],
 ["b5","info-lower",425,296],["b6","returns",709,213],["b7","returns",796,213],
 ["b8","bin",914,301],["e1","info-lower",505,296],
 ["e2","table",690,307],["e3","table",756,307],
 ["e4","info-middle",543,220],["e5","table",832,308],["e6","table",786,325],
].map(([id,surface,x,y])=>[id,{surface,x,y,angle:0} as Placement]));

