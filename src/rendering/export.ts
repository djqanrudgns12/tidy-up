import Konva from "konva";
import { mapsById } from "../data/maps";
import { physicalMaps } from "../data/physical";
import {
  activeItems,
  initialPlacements,
  type Session,
} from "../domain/session";
import { loadSceneArt } from "./art";
import { paintScene, type SceneModel } from "./paint";
import { canvasToPng } from "./png";

export function renderLogicalScene(model: SceneModel) {
  const container = document.createElement("div");
  const stage = new Konva.Stage({ container, width: 960, height: 720 });
  try {
    const layer = new Konva.Layer({ listening: false });
    layer.add(
      new Konva.Shape({
        sceneFunc: (context) => paintScene(context._context, model, false),
        listening: false,
      }),
    );
    stage.add(layer);
    layer.draw();
    return stage.toCanvas({ pixelRatio: 1 });
  } finally {
    stage.destroy();
  }
}
export async function exportResult(
  state: Session,
  signal?: AbortSignal,
): Promise<Blob> {
  signal?.throwIfAborted();
  if (!state.mapId || !state.toolsStored || state.cleaned.length !== 4)
    throw new Error("청소를 마친 뒤 결과를 만들 수 있어요.");
  const items = activeItems(state.mapId, state.extras),
    geometry = physicalMaps[state.mapId];
  const art = await loadSceneArt(
    state.mapId,
    items.map((i) => i.asset),
  );
  signal?.throwIfAborted();
  await document.fonts.ready;
  signal?.throwIfAborted();
  const model = { mapId: state.mapId, items, geometry, art, showDirt: true };
  const canvases: HTMLCanvasElement[] = [];
  try {
    const before = renderLogicalScene({
      ...model,
      placements: initialPlacements(state.mapId, state.extras),
      clean: [],
    });
    canvases.push(before);
    const after = renderLogicalScene({
      ...model,
      placements: state.placements,
      clean: state.cleaned.map(String),
    });
    canvases.push(after);
    const canvas = document.createElement("canvas");
    canvases.push(canvas);
    canvas.width = 1984;
    canvas.height = 848;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#f5f7f2";
    ctx.fillRect(0, 0, 1984, 848);
    ctx.textBaseline = "top";
    ctx.fillStyle = "#20352d";
    ctx.font = '600 27px "Hakgyoansim Nadeuri", "Malgun Gothic", sans-serif';
    ctx.fillText(`${state.name} · ${mapsById[state.mapId].name}`, 24, 20);
    ctx.font = '700 28px "Hakgyoansim Nadeuri", "Malgun Gothic", sans-serif';
    ctx.fillText("정리 전", 24, 64);
    ctx.fillText("청소 후", 1000, 64);
    ctx.drawImage(before, 24, 104, 960, 720);
    ctx.drawImage(after, 1000, 104, 960, 720);
    return await canvasToPng(canvas, signal);
  } finally {
    for (const canvas of canvases) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}
