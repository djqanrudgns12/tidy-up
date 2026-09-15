import { expect, it } from "vitest";
import { cabinetBasketFront } from "../data/cabinet-occlusion";
import { coveredByPanel } from "./occlusion";
import { pointInPolygon, footprintsOverlap } from "./placement";

it("바구니 앞면의 열린 구멍은 물건을 가리지 않고 플라스틱 살은 가린다", () => {
  for (const hole of cabinetBasketFront.openings) {
    const vertices = Array.from({ length: hole.length / 2 }, (_, i) => ({
      x: hole[2 * i],
      y: hole[2 * i + 1],
    }));
    for (const point of vertices)
      expect(pointInPolygon(point, cabinetBasketFront.polygon)).toBe(true);
    const center = {
      x: vertices.reduce((n, p) => n + p.x, 0) / vertices.length,
      y: vertices.reduce((n, p) => n + p.y, 0) / vertices.length,
    };
    expect(coveredByPanel(center, cabinetBasketFront)).toBe(false);
  }
  expect(coveredByPanel({ x: 650, y: 452 }, cabinetBasketFront)).toBe(true);
  expect(coveredByPanel({ x: 650, y: 350 }, cabinetBasketFront)).toBe(false);
});

it("구멍은 겹치지 않아 evenodd 가림에서 다시 막히는 부분이 없다", () => {
  const holes = cabinetBasketFront.openings.map((hole) =>
    Array.from({ length: hole.length / 2 }, (_, i) => ({
      x: hole[2 * i],
      y: hole[2 * i + 1],
    })),
  );
  for (let a = 0; a < holes.length; a++)
    for (let b = a + 1; b < holes.length; b++)
      expect(footprintsOverlap(holes[a], holes[b], 0)).toBe(false);
});
