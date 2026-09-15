import { useEffect, useRef, useState } from "react";
import {
  cabinetBasketFront,
  cabinetBasketProbe,
} from "../data/cabinet-occlusion";
import { loadSceneArt } from "../rendering/art";
import { paintScene, type SceneModel } from "../rendering/paint";
import type { ArtCollection } from "../domain/types";

const difference = (a: Uint8ClampedArray, b: Uint8ClampedArray) =>
  Math.max(...a.map((value, index) => Math.abs(value - b[index])));
export function CabinetReview() {
  const [art, setArt] = useState<ArtCollection>(),
    [error, setError] = useState("");
  const [x, setX] = useState(650),
    [y, setY] = useState(466),
    [masked, setMasked] = useState(true),
    [report, setReport] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let current = true;
    loadSceneArt("classroom-cabinet", ["water-bottle"])
      .then((value) => {
        if (current) setArt(value);
      })
      .catch(() => {
        if (current) setError("검수할 그림을 불러오지 못했습니다.");
      });
    return () => {
      current = false;
    };
  }, []);
  const model = (withMask: boolean): SceneModel => ({
    mapId: "cabinet-review",
    geometry: {
      surfaces: [
        {
          ...cabinetBasketProbe,
          perforatedOccluders: withMask ? [cabinetBasketFront] : [],
        },
      ],
      initial: [],
      slots: [],
      dirt: [],
    },
    items: [
      {
        id: "probe",
        asset: "water-bottle",
        label: "가림 검수용 물병",
        zones: [4],
      },
    ],
    placements: { probe: { surface: "basket", x, y, angle: 0 } },
    art: art!,
    showDirt: false,
  });
  useEffect(() => {
    if (art && canvas.current)
      paintScene(canvas.current.getContext("2d")!, model(masked), false);
    setReport("");
  }, [art, x, y, masked]);
  function verify() {
    if (!art) return;
    const make = (value: SceneModel) => {
      const c = document.createElement("canvas");
      c.width = 960;
      c.height = 720;
      paintScene(c.getContext("2d")!, value, false);
      return c.getContext("2d")!;
    };
    const full = make(model(true)),
      underlay = make(model(false)),
      base = make({ ...model(false), items: [] });
    let visibleHoles = 0,
      failed = 0;
    for (const hole of cabinetBasketFront.openings) {
      const px = Math.floor(
        hole.filter((_, i) => i % 2 === 0).reduce((a, b) => a + b, 0) /
          (hole.length / 2),
      );
      const py = Math.floor(
        hole.filter((_, i) => i % 2 === 1).reduce((a, b) => a + b, 0) /
          (hole.length / 2),
      );
      const expected = underlay.getImageData(px, py, 1, 1).data;
      if (difference(expected, base.getImageData(px, py, 1, 1).data) < 8)
        continue;
      visibleHoles++;
      if (difference(full.getImageData(px, py, 1, 1).data, expected) > 2)
        failed++;
    }
    const barX = Math.round(x),
      barY = 452;
    const barHasObject =
      difference(
        underlay.getImageData(barX, barY, 1, 1).data,
        base.getImageData(barX, barY, 1, 1).data,
      ) >= 8;
    const barRestored =
      difference(
        full.getImageData(barX, barY, 1, 1).data,
        base.getImageData(barX, barY, 1, 1).data,
      ) <= 2;
    setReport(
      `${visibleHoles >= 2 && failed === 0 && barHasObject && barRestored ? "통과" : "재검수 필요"} · 물건이 보이는 구멍 ${visibleHoles}개 · 구멍 오류 ${failed}개 · 앞면 살 ${barHasObject && barRestored ? "원본 색 유지" : "확인 필요"}`,
    );
  }
  function download() {
    canvas.current?.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob),
        link = document.createElement("a");
      link.href = url;
      link.download = "cabinet-basket-occlusion.png";
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
    }, "image/png");
  }
  return (
    <main className="app-shell placement-review">
      <span className="eyebrow">개발용 검수 · 수납장 활동은 아직 미완성</span>
      <h1>바구니 구멍과 앞면 가림</h1>
      <p>
        기존 물병을 가림 시험에 사용합니다. 학생 활동의 물건 구성이나 정답
        배치가 아닙니다.
      </p>
      <label className="frame-control">
        가로 위치 {x}
        <input
          aria-label="검수 물건 가로 위치"
          type="range"
          min="545"
          max="770"
          value={x}
          onChange={(e) => setX(Number(e.target.value))}
        />
      </label>
      <label className="frame-control">
        받침 높이 {y}
        <input
          aria-label="검수 물건 받침 높이"
          type="range"
          min="420"
          max="468"
          value={y}
          onChange={(e) => setY(Number(e.target.value))}
        />
      </label>
      <div className="row-actions">
        <button
          className="button secondary"
          aria-pressed={masked}
          onClick={() => setMasked(!masked)}
        >
          앞면 가림 {masked ? "켜짐" : "꺼짐"}
        </button>
        <button className="button secondary" disabled={!art} onClick={verify}>
          구멍과 살 픽셀 검사
        </button>
        <button className="button secondary" disabled={!art} onClick={download}>
          검수 PNG 저장
        </button>
      </div>
      <p role="status">{report || error}</p>
      <figure>
        <canvas
          ref={canvas}
          width={960}
          height={720}
          aria-label="바구니 앞면과 구멍 뒤에 놓인 검수용 물병"
        />
      </figure>
    </main>
  );
}
