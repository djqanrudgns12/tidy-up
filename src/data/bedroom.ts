import type {PhysicalMap,Placement} from "../domain/types";

/** Empty-mattress revision, 42 combinations and full browser activity verified. */
export const bedroom:PhysicalMap={
 surfaces:[
  {id:"floor",label:"침대 앞 바닥",zone:0,polygon:[321,341,945,341,945,710,35,710,35,530,217,500],depth:.45,shadow:.18},
  {id:"bed",label:"침대 위 침구 자리",zone:1,polygon:[65,216,284,216,184,352,5,352,5,258],depth:.5,shadow:.12,vanishingPoint:{x:450,y:-200}},
  {id:"books-upper",label:"낮은 책장 위칸",zone:2,polygon:[330,226,526,226,532,234,319,234],depth:.16,shadow:.2,bookSpines:true,
   ceilingY:167,entryWidth:[320,533],insertion:{lift:3,duration:650},occluders:[[317,235,535,235,535,243,317,243]]},
  {id:"books-lower",label:"낮은 책장 아래칸",zone:2,polygon:[330,302,526,302,532,313,319,313],depth:.19,shadow:.2,bookSpines:true,
   ceilingY:247,entryWidth:[320,533],insertion:{lift:3,duration:650},occluders:[[317,314,535,314,535,324,317,324]]},
  {id:"clothes",label:"깨끗한 옷 바구니",zone:3,polygon:[566,301,646,301,646,325,566,325],depth:.18,shadow:.14,
   entryPolygon:[562,228,647,228,654,245,648,251,565,251,556,240],entryOffsetY:70,entryWidth:[565,647],insertion:{lift:70,duration:450},
   occluders:[[555,239,562,249,577,253,642,252,655,243,650,322,644,330,573,330,563,325]]},
  {id:"belongings",label:"소지품 선반 위",zone:4,polygon:[670,203,865,203,881,213,672,213],depth:.17,shadow:.18},
  {id:"bag-left",label:"가방 선반 왼칸",zone:4,polygon:[687,303,764,303,772,313,679,313],depth:.2,shadow:.2,ceilingY:225,entryWidth:[679,772],
   occluders:[[676,314,775,314,775,326,676,326]]},
  {id:"bag-right",label:"가방 선반 오른칸",zone:4,polygon:[786,303,870,303,878,313,777,313],depth:.2,shadow:.2,ceilingY:225,entryWidth:[778,879],
   occluders:[[777,314,880,314,880,326,777,326]]},
  {id:"bin",label:"휴지통",zone:5,polygon:[902,310,942,310,942,328,902,328],baseline:320,depth:.19,shadow:.15,
   entryPolygon:[894,268,902,262,933,262,953,268,946,275,907,276],insertion:{lift:50,duration:380},
   occluders:[[894,269,902,277,924,279,943,275,954,269,947,333,940,340,912,340,903,335]]},
 ],
 initial:[
  {surface:"floor",x:376,y:381,angle:-8},{surface:"floor",x:510,y:383,angle:7},
  {surface:"floor",x:641,y:385,angle:-6},{surface:"floor",x:781,y:384,angle:10},
  {surface:"floor",x:340,y:506,angle:-7},{surface:"floor",x:523,y:510,angle:8},
  {surface:"floor",x:684,y:509,angle:-10},{surface:"floor",x:827,y:507,angle:9},
 ],
 slots:[{surface:"floor",x:276,y:640,angle:0},{surface:"floor",x:517,y:640,angle:0},{surface:"floor",x:768,y:640,angle:0}],
 dirt:[{x:463,y:230,surface:"books-upper",tool:"duster"},{x:749,y:208,surface:"belongings",tool:"duster"},
  {x:115,y:590,surface:"floor",tool:"broom"},{x:862,y:652,surface:"floor",tool:"cloth"}],
};
export const bedroomDestinations:Record<string,Placement>=Object.fromEntries([
 ["b1","clothes",587,307],["b2","clothes",627,307],["b3","clothes",587,319],["b4","clothes",627,319],
 ["b5","bed",172,238],["b6","bed",150,290],["b7","books-upper",378,230],["b8","bin",923,320],
 ["e1","bed",137,334],["e2","bed",52,292],["e3","bag-left",724,309],
 ["e4","belongings",706,208],["e5","belongings",770,208],["e6","belongings",833,208],
].map(([id,surface,x,y])=>[id,{surface,x,y,angle:0} as Placement]));
