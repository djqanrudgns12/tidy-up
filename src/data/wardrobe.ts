import type { PhysicalMap, Placement } from "../domain/types";

/** Measured from the delivered wardrobe background in the 960 × 720 world. */
export const wardrobe: PhysicalMap = {
  surfaces: [
    { id: "floor", label: "옷장 앞 바닥", zone: 0,
      polygon: [35,441,940,441,940,710,35,710], depth: .45, shadow: .18 },
    { id: "rail", label: "옷걸이 봉", zone: 1,
      polygon: [265,80,501,80,501,105,265,105], baseline: 89,
      depth: .25, shadow: .15, pose: "hanging",
      accepts: ["jacket","cardigan","hanger"],
      hangingBounds: [247,55,504,55,504,380,247,380],
      shadowReceiver: [275,57,509,57,509,352,275,352],
      occluders: [[265,93,501,93,501,96,265,96]],
      insertion: { lift: 12, duration: 450 } },
    { id: "tops", label: "접은 상의 선반", zone: 2,
      polygon: [529,154,732,154,759,161,523,161], depth: .075, shadow: .17,
      ceilingY: 56, entryWidth: [523,763],
      occluders: [[521,163,765,163,765,169,521,169]] },
    { id: "bottoms", label: "접은 하의 선반", zone: 3,
      polygon: [529,254,732,254,759,270,523,270], depth: .22, shadow: .17,
      ceilingY: 171, entryWidth: [523,763],
      occluders: [[521,272,765,272,765,280,521,280]] },
    { id: "accessories", label: "작은 의류·소품칸", zone: 4,
      polygon: [532,351,732,351,761,382,523,382], depth: .3, shadow: .18,
      ceilingY: 282, entryWidth: [523,763],
      occluders: [[520,384,768,384,768,393,520,393]] },
    { id: "bin", label: "휴지통", zone: 5,
      polygon: [875,381,941,381,941,404,875,404], baseline: 392, depth: .2, shadow: .15,
      entryPolygon: [866,326,880,321,933,321,948,328,944,337,875,339],
      insertion: { lift: 63, duration: 380 },
      occluders: [[864,329,875,339,907,344,936,339,950,331,943,417,936,428,900,432,877,422]] },
  ],
  initial: [
    { surface:"floor",x:161,y:474,angle:-9 },{ surface:"floor",x:352,y:481,angle:7 },
    { surface:"floor",x:554,y:474,angle:-8 },{ surface:"floor",x:774,y:484,angle:11 },
    { surface:"floor",x:175,y:568,angle:0 },{ surface:"floor",x:360,y:570,angle:8 },
    { surface:"floor",x:558,y:563,angle:-12 },{ surface:"floor",x:798,y:560,angle:10 },
  ],
  slots: [{ surface:"floor",x:220,y:672,angle:0 },{ surface:"floor",x:478,y:673,angle:0 },{ surface:"floor",x:744,y:674,angle:0 }],
  dirt: [{ x:703,y:158,surface:"tops",tool:"duster" },{ x:706,y:267,surface:"bottoms",tool:"duster" },
    { x:113,y:645,surface:"floor",tool:"broom" },{ x:844,y:652,surface:"floor",tool:"cloth" }],
};

export const wardrobeDestinations: Record<string, Placement> = Object.fromEntries([
  ["b1","tops",580,158],["b2","tops",682,158],
  ["b3","bottoms",580,262],["b4","bottoms",682,262],
  ["b5","rail",297,89],["b6","accessories",555,375],["b7","rail",472,89],["b8","bin",909,392],
  ["e1","rail",392,89],["e2","accessories",558,358],["e3","accessories",624,358],
  ["e4","accessories",697,358],["e5","accessories",602,375],["e6","accessories",699,376],
].map(([id,surface,x,y])=>[id,{surface,x,y,angle:0} as Placement]));
