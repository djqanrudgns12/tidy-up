import { describe, expect, it } from "vitest";
import { catalog } from "./catalog";
import { maps } from "./maps";
import { assetViews } from "./asset-views";

describe("전체 제작 목록", () => {
  it("72종이 모두 사용되고 9개 맵은 기본8·후보6·추가자리3을 가진다", () => {
    const ids = new Set(catalog.map((a) => a.id));
    expect(catalog).toHaveLength(72);
    expect(ids.size).toBe(72);
    expect(maps).toHaveLength(9);
    const used = new Set<string>();
    for (const map of maps) {
      expect(map.base).toHaveLength(8);
      expect(map.extras).toHaveLength(6);
      expect(map.slots).toHaveLength(3);
      expect(map.dirt).toHaveLength(4);
      expect(map.zones).toHaveLength(4);
      const instances = [...map.base, ...map.extras];
      expect(new Set(instances.map((i) => i.id)).size).toBe(14);
      for (const item of instances) {
        expect(ids.has(item.asset)).toBe(true);
        used.add(item.asset);
        expect(item.zones.every((z) => z >= 1 && z <= 5)).toBe(true);
      }
    }
    expect(used).toEqual(ids);
  });
  it("기본22시점과 추가6시점은 기존 물건을 참조하고 배포 목록은127개다", () => {
    expect(assetViews).toHaveLength(28);
    expect(new Set(assetViews.map((v) => v.path)).size).toBe(28);
    for (const v of assetViews)
      expect(catalog.some((a) => a.id === v.asset)).toBe(true);
    expect(
      catalog.length + assetViews.length + maps.length * 2 + 4 + 3 + 2,
    ).toBe(127);
  });
});
