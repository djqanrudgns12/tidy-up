import type { PhysicalMap } from "../domain/types";
import { classroomCabinet } from "./cabinet.ts";
import { locker } from "./locker.ts";
import { library } from "./library.ts";
import { homeDesk } from "./home-desk.ts";
import { bedroom } from "./bedroom.ts";
import {wardrobe} from "./wardrobe.ts";
import {livingRoom} from "./living-room.ts";
import {shoeCabinet} from "./shoe-cabinet.ts";

// Coordinates measured from the delivered 1920 × 1440 background, divided by two.
// Surface polygons describe the usable plane, not a bounding box around the furniture.
export const schoolDesk: PhysicalMap = {
  surfaces: [
    {
      id: "floor",
      label: "책상 앞 바닥",
      zone: 0,
      polygon: [35, 510, 740, 510, 740, 715, 35, 715],
      depth: 0.47,
      shadow: 0.19,
      obstacles: [[148, 613, 181, 613, 181, 632, 148, 632]],
      depthOccluders: [
        { polygon: [154, 280, 178, 280, 178, 629, 147, 629], depth: 632 },
        { polygon: [753, 280, 779, 280, 788, 630, 752, 630], depth: 632 },
      ],
    },
    {
      id: "desk",
      label: "책상 위",
      zone: 0,
      polygon: [193, 155, 695, 155, 730, 247, 129, 247],
      depth: 0.45,
      shadow: 0.23,
      supportKey: "desktop",
    },
    {
      id: "ready-top",
      label: "상판 뒤쪽 준비물 자리",
      zone: 3,
      polygon: [203, 152, 694, 152, 711, 203, 170, 203],
      depth: 0.45,
      shadow: 0.23,
      supportKey: "desktop",
    },
    {
      id: "ready",
      label: "필기도구 놓는 자리",
      zone: 3,
      polygon: [206, 121, 748, 121, 766, 147, 195, 147],
      depth: 0.3,
      shadow: 0.2,
      occluders: [[195, 145, 767, 145, 769, 148, 193, 148]],
    },
    {
      id: "tray",
      label: "오른쪽 준비물 자리",
      zone: 3,
      polygon: [718, 170, 777, 170, 799, 232, 730, 232],
      depth: 0.42,
      shadow: 0.22,
    },
    {
      id: "books",
      insertion: { lift: 28, duration: 300 },
      label: "책상 속 책칸",
      zone: 1,
      polygon: [218, 304, 447, 304, 447, 352, 191, 352],
      depth: 0.2,
      shadow: 0.24,
      maxHeight: 72,
      occluders: [
        [179, 350, 451, 350, 451, 365, 179, 365],
        [443, 271, 455, 271, 455, 365, 443, 365],
      ],
    },
    {
      id: "notebooks",
      insertion: { lift: 28, duration: 300 },
      label: "책상 속 공책칸",
      zone: 2,
      polygon: [474, 304, 710, 304, 731, 352, 457, 352],
      depth: 0.2,
      shadow: 0.24,
      maxHeight: 72,
      occluders: [[451, 350, 748, 350, 748, 365, 451, 365]],
    },
    {
      id: "hook",
      label: "옆 가방걸이",
      zone: 4,
      polygon: [783, 282, 875, 282, 875, 353, 783, 353],
      depth: 0.45,
      pose: "hanging",
      anchor: { x: 821, y: 318 },
      shadow: 0.1,
      shadowReceiver: [752, 300, 785, 300, 785, 553, 752, 553],
      occluders: [
        [
          836, 294, 842, 294, 846, 298, 845, 309, 842, 318, 836, 325, 827, 329,
          817, 329, 809, 325, 804, 320, 811, 316, 816, 320, 822, 321, 829, 320,
          833, 315, 835, 307,
        ],
      ],
    },
    {
      id: "bin",
      insertion: { lift: 70, duration: 340 },
      label: "휴지통",
      zone: 5,
      entryPolygon: [
        829, 491, 919, 491, 928, 502, 917, 514, 836, 514, 822, 502,
      ],
      polygon: [829, 549, 919, 549, 928, 560, 917, 572, 836, 572, 822, 560],
      baseline: 560,
      depth: 0.23,
      shadow: 0.17,
      occluders: [
        [
          818, 503, 832, 516, 867, 523, 901, 520, 926, 510, 934, 499, 929, 522,
          920, 625, 916, 634, 906, 642, 885, 647, 854, 646, 836, 638, 829, 626,
        ],
      ],
    },
  ],
  initial: [
    { x: 308, y: 201, surface: "desk", angle: -8 },
    { x: 493, y: 201, surface: "desk", angle: 12 },
    { x: 650, y: 208, surface: "desk", angle: -6 },
    { x: 276, y: 540, surface: "floor", angle: -17 },
    { x: 476, y: 680, surface: "floor", angle: 18 },
    { x: 225, y: 605, surface: "floor", angle: -12 },
    { x: 625, y: 638, surface: "floor", angle: 0 },
    { x: 95, y: 558, surface: "floor", angle: 23 },
  ],
  slots: [
    { x: 435, y: 556, surface: "floor", angle: -5 },
    { x: 125, y: 673.5, surface: "floor", angle: 0 },
    { x: 335, y: 648, surface: "floor", angle: 7 },
  ],
  dirt: [
    { x: 556, y: 225, surface: "desk", tool: "duster" },
    { x: 416, y: 338, surface: "books", tool: "duster" },
    { x: 285, y: 596, surface: "floor", tool: "broom" },
    { x: 694, y: 564, surface: "floor", tool: "cloth" },
  ],
};

export const physicalMaps: Record<string, PhysicalMap> = {
  "school-desk": schoolDesk,
  "classroom-cabinet": classroomCabinet,
  locker,
  library,
  "home-desk": homeDesk,
  bedroom,
  wardrobe,
  "living-room":livingRoom,
  "shoe-cabinet":shoeCabinet,
};

// Intersecting the measured left and right tabletop depth edges gives this point.
// Objects turn within the plane before it is projected, so their side edges follow the furniture.
for (const surface of schoolDesk.surfaces) {
  if (surface.pose !== "hanging") surface.vanishingPoint = { x: 518, y: -312 };
}
