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
let drawImage = vi.fn();
let outputSizes: number[][];
let fillText = vi.fn();
function makeCanvas() {
  const canvas = {
    width: 960,
    height: 720,
    getContext: () => ({
      beginPath() {},
      moveTo() {},
      lineTo() {},
      quadraticCurveTo() {},
      closePath() {},
      arc() {},
      fill() {},
      save() {},
      restore() {},
      fillRect() {},
      fillText(...args: unknown[]) {
        fillText(...args);
      },
      strokeRect() {},
      drawImage(...args: unknown[]) {
        drawImage(...args);
        if (failComposition) throw new Error("composite failed");
      },
    }),
    toBlob(callback: BlobCallback) {
      outputSizes.push([canvas.width, canvas.height]);
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
  outputSizes = [];
  drawImage = vi.fn();
  fillText = vi.fn();
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

it("저장 그림의 전후 장면을 960×720 원래 크기로 유지한다", async () => {
  await exportResult(completed());
  expect(drawImage).toHaveBeenNthCalledWith(1, canvases[0], 40, 202, 960, 720);
  expect(drawImage).toHaveBeenNthCalledWith(2, canvases[1], 1048, 202, 960, 720);
  expect(canvases[2].width).toBe(0);
  expect(canvases[2].height).toBe(0);
});

it.each([
  [390, 844, 3],
  [768, 1024, 2],
  [844, 390, 3],
  [1920, 1080, 1],
])("화면 %s×%s, DPR %s에서도 같은 가로 PNG를 저장한다", async (width, height, dpr) => {
  vi.stubGlobal("window", { innerWidth: width, innerHeight: height, devicePixelRatio: dpr });
  vi.stubGlobal("devicePixelRatio", dpr);
  await exportResult(completed());
  expect(outputSizes).toEqual([[2048, 1024]]);
  expect(drawImage).toHaveBeenNthCalledWith(1, canvases[0], 40, 202, 960, 720);
  expect(drawImage).toHaveBeenNthCalledWith(2, canvases[1], 1048, 202, 960, 720);
});

it("화면용 마무리 퀴즈 정답 수를 저장 이미지에 넣지 않는다", async () => {
  await exportResult({ ...completed(), quizCorrectCount: 2 });
  const text = fillText.mock.calls.flat().join(" ");
  expect(text).not.toContain("마무리 퀴즈");
  expect(text).not.toContain("맞혔어요");
  expect(text).not.toContain("2 / 3");
});

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
