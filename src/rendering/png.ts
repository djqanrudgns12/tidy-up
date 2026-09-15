const failureMessage = "결과 이미지를 만들지 못했어요. 다시 만들어 주세요.";

export function canvasToPng(
  canvas: HTMLCanvasElement,
  signal?: AbortSignal,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const cleanup = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
    };
    const fail = (error: Error = new Error(failureMessage)) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const abort = () =>
      fail(new DOMException("이미지 만들기를 취소했어요.", "AbortError"));
    if (signal?.aborted) {
      abort();
      return;
    }
    signal?.addEventListener("abort", abort, { once: true });
    timer = setTimeout(fail, 15000);
    try {
      canvas.toBlob((blob) => {
        if (settled) return;
        if (!blob || !blob.size || blob.type !== "image/png") {
          fail();
          return;
        }
        settled = true;
        cleanup();
        resolve(blob);
      }, "image/png");
    } catch {
      fail();
    }
  });
}
