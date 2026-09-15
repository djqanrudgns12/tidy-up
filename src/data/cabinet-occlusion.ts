import type { PerforatedPanel, Surface } from "../domain/types";

// Measured from the 1920×1440 cabinet original, crop origin (990,680), then divided by two.
// Only the front grille is foreground. Holes in the rear wall remain part of the background.
const toWorld = (points: number[]) =>
  points.map((value, index) => (value + (index % 2 ? 680 : 990)) / 2);
const rect = (left: number, top: number, right: number, bottom: number) =>
  toWorld([left, top, right, top, right, bottom, left, bottom]);
export const cabinetBasketFront: PerforatedPanel = {
  polygon: toWorld([
    13, 134, 26, 145, 65, 146, 77, 151, 90, 183, 101, 198, 115, 205, 482, 205,
    497, 194, 516, 149, 530, 140, 580, 140, 599, 131, 588, 166, 579, 246, 568,
    259, 41, 261, 29, 252, 23, 230,
  ]),
  openings: [
    // Bottom row, following the slightly different widths in the generated furniture.
    ...[
      [50, 62],
      [72, 84],
      [94, 107],
      [117, 131],
      [142, 157],
      [169, 184],
      [197, 212],
      [225, 241],
      [252, 268],
      [280, 297],
      [309, 327],
      [340, 358],
      [369, 387],
      [398, 415],
      [427, 444],
      [455, 471],
      [481, 498],
      [508, 523],
      [534, 548],
      [556, 569],
    ].map(([left, right]) => rect(left, 228, right, 241)),
    // Side posts. Insets keep the painted plastic bevel intact.
    rect(48, 158, 59, 169),
    rect(69, 158, 79, 169),
    rect(49, 181, 60, 192),
    rect(70, 181, 80, 192),
    rect(50, 205, 61, 216),
    rect(71, 205, 82, 216),
    toWorld([534, 158, 545, 157, 543, 169, 532, 169]),
    toWorld([555, 157, 566, 157, 564, 169, 553, 170]),
    toWorld([530, 182, 542, 181, 540, 192, 529, 193]),
    toWorld([552, 181, 564, 181, 562, 192, 550, 193]),
    toWorld([527, 205, 539, 205, 537, 216, 526, 216]),
    toWorld([549, 205, 560, 205, 559, 216, 547, 216]),
  ],
};

/** Static mask stress test only. This is not an approved support or insertion path for the lesson. */
export const cabinetBasketProbe: Surface = {
  id: "basket",
  label: "바구니 가림 검수",
  zone: 4,
  polygon: [516, 410, 765, 410, 784, 467, 514, 467],
  entryPolygon: [516, 404, 765, 404, 772, 418, 520, 418],
  depth: 0.28,
  shadow: 0.2,
  perforatedOccluders: [cabinetBasketFront],
};
