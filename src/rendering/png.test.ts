import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { canvasToPng } from "./png";

const png = () => new Blob(["test pixels"], { type: "image/png" });
function canvas(toBlob: HTMLCanvasElement["toBlob"]) {
  return { toBlob } as HTMLCanvasElement;
}
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it("PNG 변환을 기다리며 지정한 MIME으로 요청한다", async () => {
  const blob = png();
  const toBlob = vi.fn((callback: BlobCallback) => callback(blob));
  expect(await canvasToPng(canvas(toBlob))).toBe(blob);
  expect(toBlob).toHaveBeenCalledWith(expect.any(Function), "image/png");
  expect(vi.getTimerCount()).toBe(0);
});

it.each([
  null,
  new Blob([], { type: "image/png" }),
  new Blob(["jpeg"], { type: "image/jpeg" }),
])(
  "null·빈 파일·다른 형식을 성공으로 처리하지 않고 재시도할 수 있다 (%s)",
  async (invalid) => {
    const toBlob = vi
      .fn()
      .mockImplementationOnce((callback: BlobCallback) => callback(invalid))
      .mockImplementationOnce((callback: BlobCallback) => callback(png()));
    const target = canvas(toBlob);
    await expect(canvasToPng(target)).rejects.toThrow("다시 만들어 주세요");
    expect((await canvasToPng(target)).type).toBe("image/png");
    expect(vi.getTimerCount()).toBe(0);
  },
);

it("SecurityError를 재시도 가능한 오류로 바꾸고 타이머를 정리한다", async () => {
  await expect(
    canvasToPng(
      canvas(() => {
        throw new DOMException("tainted", "SecurityError");
      }),
    ),
  ).rejects.toThrow("다시 만들어 주세요");
  expect(vi.getTimerCount()).toBe(0);
});

it("응답이 없는 변환을 15초에 끝내고 늦은 콜백은 무시한다", async () => {
  let callback!: BlobCallback;
  const result = canvasToPng(
    canvas((value) => {
      callback = value;
    }),
  );
  const rejected = expect(result).rejects.toThrow("다시 만들어 주세요");
  await vi.advanceTimersByTimeAsync(15000);
  await rejected;
  callback(png());
  expect(vi.getTimerCount()).toBe(0);
});

it("활동을 벗어나면 변환을 취소하고 늦은 결과를 넘기지 않는다", async () => {
  const controller = new AbortController();
  let callback!: BlobCallback;
  const result = canvasToPng(
    canvas((value) => {
      callback = value;
    }),
    controller.signal,
  );
  const rejected = expect(result).rejects.toMatchObject({ name: "AbortError" });
  controller.abort();
  await rejected;
  callback(png());
  expect(vi.getTimerCount()).toBe(0);
  const toBlob = vi.fn();
  await expect(
    canvasToPng(canvas(toBlob), controller.signal),
  ).rejects.toMatchObject({ name: "AbortError" });
  expect(toBlob).not.toHaveBeenCalled();
});
