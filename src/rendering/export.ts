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

const RESULT_WIDTH = 2048;
const RESULT_HEIGHT = 1024;
const SCENE_WIDTH = 960;
const SCENE_HEIGHT = 720;

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const corner = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + corner, y);
  ctx.lineTo(x + width - corner, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + corner);
  ctx.lineTo(x + width, y + height - corner);
  ctx.quadraticCurveTo(
    x + width,
    y + height,
    x + width - corner,
    y + height,
  );
  ctx.lineTo(x + corner, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - corner);
  ctx.lineTo(x, y + corner);
  ctx.quadraticCurveTo(x, y, x + corner, y);
  ctx.closePath();
}

function drawStageLabel(
  ctx: CanvasRenderingContext2D,
  x: number,
  label: string,
  description: string,
  accent: string,
) {
  ctx.save();
  ctx.shadowColor = "rgba(32, 53, 45, 0.12)";
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = "#ffffff";
  roundedRect(ctx, x, 144, SCENE_WIDTH, 778, 22);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = accent;
  roundedRect(ctx, x + 18, 158, 8, 38, 4);
  ctx.fill();
  ctx.fillStyle = "#20352d";
  ctx.font = '700 28px "SchoolSafe Nadeuri", "Malgun Gothic", sans-serif';
  ctx.fillText(label, x + 42, 157);
  ctx.fillStyle = "#687970";
  ctx.font = '400 18px "SchoolSafe Nadeuri", "Malgun Gothic", sans-serif';
  ctx.fillText(description, x + 166, 165);
}

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
    canvas.width = RESULT_WIDTH;
    canvas.height = RESULT_HEIGHT;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#eef4ea";
    ctx.fillRect(0, 0, RESULT_WIDTH, RESULT_HEIGHT);
    ctx.fillStyle = "#dfead8";
    ctx.beginPath();
    ctx.arc(1940, -50, 210, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f4e5b8";
    ctx.beginPath();
    ctx.arc(1835, 40, 58, 0, Math.PI * 2);
    ctx.fill();
    ctx.textBaseline = "top";
    ctx.fillStyle = "#39705a";
    ctx.font = '700 18px "SchoolSafe Nadeuri", "Malgun Gothic", sans-serif';
    ctx.fillText("정리와 청소 · 나의 실천 기록", 40, 25);
    ctx.fillStyle = "#173d30";
    ctx.font = '700 36px "SchoolSafe Nadeuri", "Malgun Gothic", sans-serif';
    ctx.fillText(
      `${state.name}님의 ${mapsById[state.mapId].name} 정리 기록`,
      40,
      55,
    );
    ctx.fillStyle = "#587067";
    ctx.font = '400 19px "SchoolSafe Nadeuri", "Malgun Gothic", sans-serif';
    ctx.fillText("정리 전과 청소 후의 달라진 모습을 나란히 살펴보세요.", 42, 103);

    drawStageLabel(ctx, 40, "정리 전", "처음 모습", "#2c7397");
    drawStageLabel(ctx, 1048, "청소 후", "정리와 청소를 마친 모습", "#3f8156");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(40, 202, SCENE_WIDTH, SCENE_HEIGHT);
    ctx.fillRect(1048, 202, SCENE_WIDTH, SCENE_HEIGHT);
    ctx.drawImage(before, 40, 202, SCENE_WIDTH, SCENE_HEIGHT);
    ctx.drawImage(after, 1048, 202, SCENE_WIDTH, SCENE_HEIGHT);
    ctx.strokeStyle = "#d6dfd2";
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 202, SCENE_WIDTH, SCENE_HEIGHT);
    ctx.strokeRect(1048, 202, SCENE_WIDTH, SCENE_HEIGHT);

    ctx.fillStyle = "#ffffff";
    roundedRect(ctx, 1009, 158, 30, 30, 15);
    ctx.fill();
    ctx.fillStyle = "#527063";
    ctx.font = '700 23px "SchoolSafe Nadeuri", "Malgun Gothic", sans-serif';
    ctx.fillText("→", 1014, 159);

    ctx.fillStyle = "#315d4b";
    ctx.font = '700 21px "SchoolSafe Nadeuri", "Malgun Gothic", sans-serif';
    ctx.fillText("제자리를 찾고, 남은 먼지까지 깨끗하게 마쳤어요.", 42, 958);
    ctx.fillStyle = "#6b7a72";
    ctx.font = '400 17px "SchoolSafe Nadeuri", "Malgun Gothic", sans-serif';
    ctx.fillText("정리 정돈  ✓     청소  ✓     마무리  ✓", 1580, 960);
    return await canvasToPng(canvas, signal);
  } finally {
    for (const canvas of canvases) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}
