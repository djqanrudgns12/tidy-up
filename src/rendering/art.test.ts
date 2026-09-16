import { afterEach, beforeEach, expect, it, vi } from "vitest";

class TestImage {
  static instances: TestImage[] = [];
  onload: null | (() => Promise<void>) = null;
  onerror: null | (() => void) = null;
  src = "";
  width = 2;
  height = 2;
  decode = vi.fn(() => Promise.resolve());
  constructor() {
    TestImage.instances.push(this);
  }
}
beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  TestImage.instances = [];
  vi.stubGlobal("Image", TestImage);
  vi.stubGlobal("window", { setTimeout, clearTimeout });
  vi.stubGlobal("document", {
    baseURI: "http://localhost/Cleaning/index.html",
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => ({
        drawImage: vi.fn(),
        fillRect: vi.fn(),
        getImageData: () => ({ data: new Uint8ClampedArray(16).fill(255) }),
      }),
    }),
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("decode까지 기다리고 같은 이미지 요청을 합친다", async () => {
  const { loadImage } = await import("./art");
  const first = loadImage("assets/example.webp");
  expect(loadImage("assets/example.webp")).toBe(first);
  const image = TestImage.instances[0];
  let finish!: () => void;
  image.decode.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  const loading = image.onload!();
  let ready = false;
  first.then(() => {
    ready = true;
  });
  await Promise.resolve();
  expect(ready).toBe(false);
  finish();
  await loading;
  expect(await first).toBe(image);
  expect(image.onload).toBeNull();
  expect(image.onerror).toBeNull();
});

it("15초를 넘은 요청의 늦은 decode 실패가 재시도 캐시를 지우지 않는다", async () => {
  const { loadImage } = await import("./art");
  const first = loadImage("assets/example.webp");
  const rejected = expect(first).rejects.toThrow("그림을 불러오지 못했어요");
  const oldImage = TestImage.instances[0];
  let failDecode!: (error: Error) => void;
  oldImage.decode.mockReturnValue(
    new Promise((_, reject) => {
      failDecode = reject;
    }),
  );
  const late = oldImage.onload!();
  await vi.advanceTimersByTimeAsync(15000);
  await rejected;
  const retry = loadImage("assets/example.webp");
  failDecode(new Error("late decode"));
  await late;
  expect(loadImage("assets/example.webp")).toBe(retry);
  expect(TestImage.instances).toHaveLength(2);
  const newImage = TestImage.instances[1];
  await newImage.onload!();
  expect(await retry).toBe(newImage);
});

it("깨진 이미지 요청은 재시도할 수 있다", async () => {
  const { loadImage } = await import("./art");
  const first = loadImage("assets/broken.webp");
  const rejected = expect(first).rejects.toThrow();
  TestImage.instances[0].onerror!();
  await rejected;
  const retry = loadImage("assets/broken.webp");
  expect(TestImage.instances).toHaveLength(2);
  await TestImage.instances[1].onload!();
  await retry;
});

it("공간을 다섯 번 바꿔도 현재 그림만 캐시에 남기고 진행 중인 참조는 훼손하지 않는다", async () => {
  const { loadImage, loadArt, retainArtCache } = await import("./art");
  const sharedPath = "assets/effects/dust.webp";
  const shared = loadArt("dust", sharedPath);
  await TestImage.instances[0].onload!();
  const sharedArt = await shared;
  for (let i = 0; i < 5; i++) {
    const path = `assets/maps/review-${i}/background.webp`;
    retainArtCache([path, sharedPath]);
    const current = loadImage(path);
    await TestImage.instances.at(-1)!.onload!();
    expect(await current).toBe(TestImage.instances.at(-1));
    expect(loadImage(path)).toBe(current);
    expect(loadArt("dust", sharedPath)).toBe(shared);
  }
  retainArtCache([]);
  expect(sharedArt.image.width).toBe(2);
  expect(loadArt("dust", sharedPath)).not.toBe(shared);
  await TestImage.instances.at(-1)!.onload!();
});

it("같은 물건의 다른 시점은 URL에 따라 별도로 캐시한다", async () => {
  const { loadArt } = await import("./art");
  const top = loadArt("book", "assets/top.webp");
  const front = loadArt("book", "assets/front.webp");
  expect(front).not.toBe(top);
  expect(TestImage.instances).toHaveLength(2);
  await Promise.all(TestImage.instances.map((image) => image.onload!()));
  expect((await top).image).not.toBe((await front).image);
});

it("해제한 이전 원화의 늦은 실패가 같은 URL의 새 요청을 지우지 않는다", async () => {
  const { loadArt, retainArtCache } = await import("./art");
  const path = "assets/item.webp";
  const old = loadArt("item", path);
  const rejected = expect(old).rejects.toThrow();
  retainArtCache([]);
  const current = loadArt("item", path);
  TestImage.instances[0].onerror!();
  await rejected;
  expect(loadArt("item", path)).toBe(current);
  expect(TestImage.instances).toHaveLength(2);
  await TestImage.instances[1].onload!();
  await current;
});

it("수납장 최초 로딩과 추가 물건 로딩은 같은 선반 시점 캐시를 공유한다", async () => {
  const { loadSceneArt, loadSceneItem, sceneArtPaths, loadArt } = await import("./art");
  const loading = loadSceneArt("classroom-cabinet", ["card-game"]);
  const extra = loadSceneItem("classroom-cabinet", "card-game");
  const paths = sceneArtPaths("classroom-cabinet", ["card-game"]);
  expect(paths).toContain("assets/items/views/card-game--low-front.webp");
  expect(TestImage.instances.filter((image) => image.src.includes("card-game"))).toHaveLength(1);
  await Promise.all(TestImage.instances.map((image) => image.onload!()));
  expect((await loading).items["card-game"]).toBe(await extra);
  const primary = loadArt("card-game");
  await TestImage.instances.at(-1)!.onload!();
  expect(await primary).not.toBe(await extra);
});
