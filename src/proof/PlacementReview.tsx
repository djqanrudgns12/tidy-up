import { useEffect, useMemo, useRef, useState } from "react";
import { mapsById } from "../data/maps";
import { schoolDesk } from "../data/physical";
import {
  activeItems,
  initialPlacements,
  makeSession,
  tryPlacement,
  type Session,
} from "../domain/session";
import { loadSceneArt } from "../rendering/art";
import { paintScene, type SceneModel } from "../rendering/paint";
import type { ArtCollection, Placement } from "../domain/types";

const points: Record<string, Placement> = {
  b1: { surface: "books", x: 330, y: 328, angle: 0 },
  b2: { surface: "notebooks", x: 541, y: 328, angle: 0 },
  b3: { surface: "notebooks", x: 662, y: 329, angle: -6 },
  b4: { surface: "ready", x: 280, y: 134, angle: 0 },
  b5: { surface: "ready", x: 433, y: 135, angle: 0 },
  b6: { surface: "ready", x: 539, y: 136, angle: 0 },
  b7: { surface: "hook", x: 821, y: 318, angle: 0 },
  b8: { surface: "bin", x: 876, y: 560, angle: 0 },
  e3: { surface: "tray", x: 761, y: 211, angle: 0 },
  e4: { surface: "notebooks", x: 541, y: 329, angle: 0 },
  e6: { surface: "ready-top", x: 378, y: 178, angle: 7 },
};
function fixture(): Session {
  let s: Session = {
    ...makeSession(),
    name: "배치검수",
    step: "organize",
    tutorialDone: true,
    mapId: "school-desk",
    mapRevision: mapsById["school-desk"].revision,
    extras: ["e3", "e4", "e6"],
    placements: initialPlacements("school-desk", ["e3", "e4", "e6"]),
  };
  for (const id of [
    "e4",
    "b1",
    "b2",
    "b3",
    "b4",
    "b5",
    "b6",
    "b7",
    "b8",
    "e3",
    "e6",
  ]) {
    const p = points[id],
      checked = tryPlacement(s, id, p, p.surface, p.angle);
    if (!checked.placement) throw new Error(`${id}: ${checked.message}`);
    s = { ...s, placements: { ...s.placements, [id]: checked.placement } };
  }
  return s;
}
function Frame({ model, label }: { model: SceneModel; label: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    paintScene(canvas.current!.getContext("2d")!, model, false);
  }, [model]);
  return (
    <figure>
      <canvas ref={canvas} width={960} height={720} aria-label={label} />
      <figcaption>{label}</figcaption>
    </figure>
  );
}
export function PlacementReview() {
  const [art, setArt] = useState<ArtCollection>(),
    [error, setError] = useState(""),
    [caseId, setCase] = useState("paper"),
    [progress, setProgress] = useState(66);
  const complete = useMemo(fixture, []);
  useEffect(() => {
    loadSceneArt(
      "school-desk",
      activeItems("school-desk", complete.extras).map((i) => i.asset),
    )
      .then(setArt)
      .catch((e) => setError(e.message));
  }, [complete]);
  const cases: Record<
    string,
    { label: string; id: string; from: Placement; to: Placement }
  > = {
    paper: {
      label: "휴지통에 넣기",
      id: "b8",
      from: initialPlacements("school-desk", [])["b8"],
      to: complete.placements.b8,
    },
    retrieve: {
      label: "휴지통에서 꺼내기",
      id: "b8",
      from: complete.placements.b8,
      to: { surface: "floor", x: 330, y: 600, angle: 23 },
    },
    stack: {
      label: "파일 위에 공책 포개기",
      id: "b2",
      from: initialPlacements("school-desk", [])["b2"],
      to: complete.placements.b2,
    },
    hook: {
      label: "가방 손잡이 걸기",
      id: "b7",
      from: initialPlacements("school-desk", [])["b7"],
      to: complete.placements.b7,
    },
    nudge: {
      label: "연필 옆으로 지우개 밀림",
      id: "b6",
      from: { ...complete.placements.b6, x: 433, y: 135 },
      to: tryPlacement(complete, "b6", { x: 433, y: 135 }, "ready", 0)
        .placement!,
    },
  };
  const chosen = cases[caseId];
  function downloadThumbnail() {
    if (!art) return;
    const logical = document.createElement("canvas");
    logical.width = 960;
    logical.height = 720;
    paintScene(
      logical.getContext("2d")!,
      {
        mapId: "school-desk",
        geometry: schoolDesk,
        items: activeItems("school-desk", []),
        placements: initialPlacements("school-desk", []),
        art,
        showDirt: true,
      },
      false,
    );
    const thumbnail = document.createElement("canvas");
    thumbnail.width = 384;
    thumbnail.height = 288;
    thumbnail.getContext("2d")!.drawImage(logical, 0, 0, 384, 288);
    thumbnail.toBlob((blob) => {
      if (!blob) {
        setError("썸네일 생성 실패");
        return;
      }
      const url = URL.createObjectURL(blob),
        link = document.createElement("a");
      link.href = url;
      link.download = "school-desk-thumbnail.png";
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
    }, "image/png");
  }
  const model = (value: number): SceneModel => ({
    mapId: "school-desk",
    geometry: schoolDesk,
    items: activeItems("school-desk", complete.extras),
    placements: { ...complete.placements, [chosen.id]: chosen.to },
    art: art!,
    showDirt: false,
    motion: {
      id: chosen.id,
      from: chosen.from,
      to: chosen.to,
      progress: value / 100,
    },
  });
  return (
    <main className="app-shell placement-review">
      <header className="page-heading">
        <div>
          <span className="eyebrow">개발용 시각 검수 · 배포에서 제외</span>
          <h1>배치 동작을 한 장면씩 확인</h1>
          <p>실제 화면과 PNG에 쓰는 렌더러로 접점·가림·그림자를 확인합니다.</p>
        </div>
      </header>
      <div className="row-actions">
        {Object.entries(cases).map(([id, v]) => (
          <button
            key={id}
            className="button secondary"
            aria-pressed={id === caseId}
            onClick={() => setCase(id)}
          >
            {v.label}
          </button>
        ))}
      </div>
      <button
        className="button secondary"
        disabled={!art}
        onClick={downloadThumbnail}
      >
        기본 8개 썸네일 저장
      </button>
      <label className="frame-control">
        동작 진행 {progress}%{" "}
        <input
          type="range"
          min="0"
          max="100"
          value={progress}
          onChange={(e) => setProgress(Number(e.target.value))}
        />
      </label>
      {art ? (
        <>
          <Frame
            model={model(progress)}
            label={`${chosen.label} · ${progress}%`}
          />
          <div className="frame-strip">
            {[0, 24, 66, 85, 100].map((value) => (
              <Frame key={value} model={model(value)} label={`${value}%`} />
            ))}
          </div>
        </>
      ) : (
        <p>{error || "검수할 그림을 불러오고 있어요."}</p>
      )}
    </main>
  );
}
