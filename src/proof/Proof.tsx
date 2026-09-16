import { useEffect, useState } from "react";
import { schoolDesk } from "../data/physical";
import { assetsById } from "../data/catalog";
import { Scene } from "../components/Scene";
import { loadSceneArt } from "../rendering/art";
import {
  fitsSurface,
  normalizePlacement,
  pointInPolygon,
} from "../domain/placement";
import type {
  ArtCollection,
  ItemDefinition,
  Placement,
  Point,
} from "../domain/types";

const items: ItemDefinition[] = [
  { id: "book", asset: "textbook", label: "교과서", zones: [1] },
  { id: "bag", asset: "backpack", label: "책가방", zones: [4] },
];
const initial: Record<string, Placement> = {
  book: schoolDesk.initial[0],
  bag: schoolDesk.initial[6],
};
export function Proof() {
  const [art, setArt] = useState<ArtCollection>(),
    [error, setError] = useState("");
  const [placements, setPlacements] = useState(initial),
    [selected, setSelected] = useState("book"),
    [highlight, setHighlight] = useState("");
  const [message, setMessage] = useState("교과서와 책가방을 골라 놓아 보세요.");
  useEffect(() => {
    let active = true;
    loadSceneArt("school-desk", ["textbook", "backpack"])
      .then((value) => active && setArt(value))
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, []);
  function place(id: string, point: Point, surfaceId?: string) {
    const item = items.find((item) => item.id === id)!;
    const surface = schoolDesk.surfaces.find((s) =>
      surfaceId ? s.id === surfaceId : pointInPolygon(point, s.polygon),
    );
    if (!surface || (surface.id === "hook" && item.asset !== "backpack")) {
      setMessage("물건을 받칠 수 있는 곳에 놓아 주세요.");
      return;
    }
    const next = normalizePlacement(
      assetsById[item.asset],
      point,
      surface,
      placements[id].angle,
      "school-desk",
    );
    if (!fitsSurface(assetsById[item.asset], next, surface, "school-desk")) {
      setMessage(
        "물건이 가장자리에서 떨어지지 않도록 조금 안쪽에 놓아 주세요.",
      );
      return;
    }
    setPlacements((old) => ({ ...old, [id]: next }));
    setMessage(
      `${item.label}${id === "book" ? "를" : "을"} ${surface.label}에 놓았어요.`,
    );
    return next;
  }
  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="./">
          생활을 가꾸는 실과
        </a>
        <span className="eyebrow">배치 검수 · 첫 책상 장면</span>
      </header>
      <section className="page-heading">
        <div>
          <span className="eyebrow">정리 정돈과 청소를 실천해요</span>
          <h1>물건이 놓이는 자리</h1>
          <p>책은 면을 따라 눕히고, 가방은 손잡이를 걸이에 걸어요.</p>
        </div>
        <span className="status-pill">접점 · 원근 · 그림자 확인 중</span>
      </section>
      <div className="activity-layout">
        <section className="scene-card">
          {art ? (
            <Scene
              model={{
                mapId: "school-desk",
                geometry: schoolDesk,
                items,
                placements,
                art,
                selected,
                highlight,
              }}
              onSelect={setSelected}
              onDrop={place}
              onPoint={(point) => place(selected, point)}
            />
          ) : (
            <div className="loading">
              {error || "책상 그림을 불러오고 있어요."}
            </div>
          )}
          <div className="scene-caption">
            같은 빛 아래, 같은 공간 안에 놓인 물건
          </div>
        </section>
        <aside className="side-panel">
          <span className="eyebrow">검수할 물건</span>
          <h2>자리를 바꿔 보세요</h2>
          <div className="item-list">
            {items.map((item) => (
              <button
                className={selected === item.id ? "item selected" : "item"}
                key={item.id}
                onClick={() => setSelected(item.id)}
              >
                <img
                  src={`${import.meta.env.BASE_URL}assets/items/catalog/${item.asset}.webp`}
                  alt=""
                />
                <span>{item.label}</span>
                <span>{selected === item.id ? "선택" : ""}</span>
              </button>
            ))}
          </div>
          <h3>놓을 곳</h3>
          <div className="placement-buttons">
            {(selected === "book"
              ? ["desk", "books", "floor"]
              : ["floor", "hook"]
            ).map((id) => {
              const s = schoolDesk.surfaces.find((s) => s.id === id)!;
              const positions: Record<string, Point> = {
                desk: { x: 365, y: 200 },
                books: { x: 330, y: 328 },
                floor: { x: selected === "book" ? 355 : 595, y: 621 },
                hook: { x: 833, y: 308 },
              };
              return (
                <button
                  key={id}
                  onMouseEnter={() => setHighlight(id)}
                  onMouseLeave={() => setHighlight("")}
                  onClick={() => place(selected, positions[id], id)}
                >
                  {s.label}
                  <span>↗</span>
                </button>
              );
            })}
          </div>
          <p className="feedback" role="status">
            {message}
          </p>
          <button
            className="button secondary"
            onClick={() => {
              setPlacements(initial);
              setMessage("처음 자리로 돌아왔어요.");
            }}
          >
            처음 자리로
          </button>
          <div className="review-note">
            <strong>확인할 모습</strong>
            <p>
              책 아래의 짧은 그림자, 가방 밑면의 접촉 그림자, 수납칸 앞턱과
              가방걸이의 가림을 확인합니다.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
