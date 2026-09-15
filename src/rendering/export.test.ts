import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { SceneModel } from "./paint";
import { initialPlacements, makeSession } from "../domain/session";

const mock = vi.hoisted(() => ({
  draw: vi.fn(),
  toCanvas: vi.fn(),
  destroy: vi.fn(),
  load: vi.fn(),
}));
vi.mock("konva", () => ({
  default: {
    Stage: class {
      add() {}
      toCanvas() {
        return mock.toCanvas();
      }
      destroy() {
        mock.destroy();
      }
    },
    Layer: class {
      add() {}
      draw() {
        mock.draw();
      }
    },
    Shape: class {},
  },
}));
vi.mock("./art", () => ({ loadSceneArt: mock.load }));
import { exportResult, renderLogicalScene } from "./export";

let canvases: HTMLCanvasElement[];
let failComposition = false;
function makeCanvas() {
  const canvas = {
    width: 960,
    height: 720,
    getContext: () => ({
      fillRect() {},
      fillText() {},
      drawImage() {
        if (failComposition) throw new Error("composite failed");
      },
    }),
    toBlob(callback: BlobCallback) {
      callback(new Blob(["test"], { type: "image/png" }));
    },
  } as unknown as HTMLCanvasElement;
  canvases.push(canvas);
  return canvas;
}
beforeEach(() => {
  vi.clearAllMocks();
  mock.draw.mockReset();
  mock.toCanvas.mockImplementation(makeCanvas);
  mock.load.mockResolvedValue({});
  canvases = [];
  failComposition = false;
  vi.stubGlobal("document", {
    fonts: { ready: Promise.resolve() },
    createElement: (tag: string) => (tag === "canvas" ? makeCanvas() : {}),
  });
});
afterEach(() => vi.unstubAllGlobals());

it("그림을 그리는 중 예외가 나도 임시 Stage를 해제한다", () => {
  mock.draw.mockImplementationOnce(() => {
    throw new Error("paint failed");
  });
  expect(() => renderLogicalScene({} as SceneModel)).toThrow("paint failed");
  expect(mock.destroy).toHaveBeenCalledTimes(1);
});

it("Stage 캔버스 출력 실패에도 Stage를 해제한다", () => {
  mock.toCanvas.mockImplementationOnce(() => {
    throw new Error("canvas failed");
  });
  expect(() => renderLogicalScene({} as SceneModel)).toThrow("canvas failed");
  expect(mock.destroy).toHaveBeenCalledTimes(1);
});

const completed = () => ({
  ...makeSession(),
  name: "내보내기검수",
  mapId: "school-desk",
  cleaned: [0, 1, 2, 3],
  toolsStored: true,
  placements: initialPlacements("school-desk", []),
});
it.each([false, true])(
  "합성 성공과 실패 뒤 임시 Canvas 세 개의 픽셀 버퍼를 해제한다 (실패=%s)",
  async (failure) => {
    failComposition = failure;
    const result = exportResult(completed());
    if (failure) await expect(result).rejects.toThrow("composite failed");
    else expect((await result).type).toBe("image/png");
    expect(mock.destroy).toHaveBeenCalledTimes(2);
    expect(canvases).toHaveLength(3);
    expect(
      canvases.every((canvas) => canvas.width === 0 && canvas.height === 0),
    ).toBe(true);
  },
);

it("그림을 기다리는 중 활동이 바뀌면 Stage나 PNG를 만들지 않는다", async () => {
  let finish!: (art: unknown) => void;
  mock.load.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const controller = new AbortController();
  const result = exportResult(completed(), controller.signal);
  const rejected = expect(result).rejects.toMatchObject({ name: "AbortError" });
  controller.abort();
  finish({});
  await rejected;
  expect(mock.toCanvas).not.toHaveBeenCalled();
  expect(canvases).toHaveLength(0);
});
