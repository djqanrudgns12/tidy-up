import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Stage, Layer, Shape } from "react-konva";
import Konva from "konva";
import {
  hitObject,
  paintOrder,
  paintScene,
  visualBounds,
  type SceneModel,
} from "../rendering/paint";
import {
  advanceDrag,
  dragPlacement,
  type DragGesture,
} from "../domain/interaction";
import { assetsById } from "../data/catalog";
import { hasShelfView,hasHangingView } from "../data/scene-art";
import type { Placement, Point } from "../domain/types";
import type { PlacementMotion } from "../rendering/motion";
Konva.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

export function Scene({
  model,
  onSelect,
  onDrop,
  onPoint,
  locked = false,
  tapPlacement = false,
}: {
  model: SceneModel;
  onSelect: (id: string) => void;
  onDrop: (
    id: string,
    point: Point,
    surfaceId?: string,
  ) => Placement | undefined | void;
  onPoint?: (point: Point) => void;
  locked?: boolean;
  tapPlacement?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null),
    stage = useRef<Konva.Stage>(null);
  const drag = useRef<DragGesture | null>(null);
  const previous = useRef(model.placements),
    release = useRef<{ id: string; placement: Placement } | null>(null);
  const [motion, setMotion] = useState<PlacementMotion | null>(null);
  const animation = useRef(0);
  const [width, setWidth] = useState(720),
    [preview, setPreview] = useState<{
      id: string;
      placement: Placement;
    } | null>(null);
  const cancel = () => {
    const pointerId = drag.current?.pointerId;
    drag.current = null;
    release.current = null;
    if (pointerId !== undefined && host.current?.hasPointerCapture(pointerId))
      host.current.releasePointerCapture(pointerId);
    setPreview(null);
    cancelAnimationFrame(animation.current);
    setMotion(null);
  };
  function startAnimation(
    id: string,
    from: Placement,
    to: Placement,
    kind?: "return",
  ) {
    cancelAnimationFrame(animation.current);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setMotion(null);
      return;
    }
    const surface = model.geometry.surfaces.find((s) => s.id === to.surface)!;
    const source = model.geometry.surfaces.find((s) => s.id === from.surface)!;
    const itemAsset=assetsById[model.items.find(i=>i.id===id)!.asset];
    const turningBook = (hasShelfView(itemAsset,model.mapId) && !!source.bookSpines !== !!surface.bookSpines) ||
      (hasHangingView(itemAsset,model.mapId) && (source.pose==="hanging")!==(surface.pose==="hanging"));
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    const duration = Math.min(
      turningBook ? 900 : 580,
      (turningBook ? 720 : surface.insertion?.duration ?? 220) + distance * 0.35,
    );
    const start = performance.now();
    const frame = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      setMotion(progress === 1 ? null : { id, from, to, progress, kind });
      if (progress < 1) animation.current = requestAnimationFrame(frame);
    };
    frame(start);
  }
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      cancel();
      setWidth(entry.contentRect.width);
    });
    observer.observe(host.current!);
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancel();
    };
    const hide = () => {
      if (document.hidden) cancel();
    };
    window.addEventListener("blur", cancel);
    window.addEventListener("keydown", escape);
    document.addEventListener("visibilitychange", hide);
    return () => {
      observer.disconnect();
      window.removeEventListener("blur", cancel);
      window.removeEventListener("keydown", escape);
      document.removeEventListener("visibilitychange", hide);
      cancelAnimationFrame(animation.current);
    };
  }, []);
  useEffect(() => {
    cancel();
  }, [locked, model.mapId]);
  useLayoutEffect(() => {
    const old = previous.current;
    previous.current = model.placements;
    const changed = model.items.filter(
      (item) =>
        old[item.id] &&
        JSON.stringify(old[item.id]) !==
          JSON.stringify(model.placements[item.id]),
    );
    if (
      locked ||
      changed.length !== 1 ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      cancel();
      return;
    }
    const id = changed[0].id,
      from = release.current?.id === id ? release.current.placement : old[id],
      to = model.placements[id];
    release.current = null;
    startAnimation(id, from, to);
    return () => cancelAnimationFrame(animation.current);
  }, [model.placements, model.mapId, locked]);
  const scale = width / 960;
  const point = (event: React.PointerEvent) => {
    const rect = host.current!.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / scale,
      y: (event.clientY - rect.top) / scale,
    };
  };
  const display = preview
    ? {
        ...model,
        carried: preview,
      }
    : { ...model, motion: motion ?? model.motion };
  return (
    <div
      ref={host}
      className="scene"
      aria-label="물건을 정리하는 공간. 아래 물건 목록에서도 선택할 수 있어요."
      onPointerDown={(event) => {
        if (
          locked ||
          motion ||
          event.button !== 0 ||
          !event.isPrimary ||
          drag.current
        )
          return;
        const p = point(event);
        if (tapPlacement) {
          onPoint?.(p);
          return;
        }
        const candidates = paintOrder(model)
          .reverse()
          .map((item) => {
            const placement = model.placements[item.id],
              surface = model.geometry.surfaces.find(
                (s) => s.id === placement.surface,
              )!;
            const box = visualBounds(item, placement, surface, model.mapId);
            const halfMin = 22 / scale;
            const cx = (box.left + box.right) / 2,
              cy = (box.top + box.bottom) / 2;
            return {
              item,
              placement,
              direct: hitObject(model, item, p),
              hit:
                p.x >= Math.min(box.left, cx - halfMin) &&
                p.x <= Math.max(box.right, cx + halfMin) &&
                p.y >= Math.min(box.top, cy - halfMin) &&
                p.y <= Math.max(box.bottom, cy + halfMin),
              distance: Math.hypot(p.x - cx, p.y - cy),
            };
          })
          .filter((c) => c.hit)
          .sort((a, b) =>
            a.direct && b.direct
              ? 0
              : a.direct
                ? -1
                : b.direct
                  ? 1
                  : a.distance - b.distance,
          );
        if (!candidates.length) {
          onPoint?.(p);
          return;
        }
        const { item, placement } = candidates[0];
        onSelect(item.id);
        drag.current = {
          id: item.id,
          origin: placement,
          start: p,
          pointerId: event.pointerId,
          started: false,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const current = drag.current;
        if (!current || current.pointerId !== event.pointerId) return;
        const moved = advanceDrag(current, point(event), scale);
        if (!current.started) return;
        const item = model.items.find((i) => i.id === current.id)!;
        setPreview({
          id: current.id,
          placement: dragPlacement(item, moved, model.geometry, model.mapId),
        });
      }}
      onPointerUp={(event) => {
        const current = drag.current;
        if (!current || current.pointerId !== event.pointerId) return;
        const moved = advanceDrag(current, point(event), scale);
        if (current.started) {
          const item = model.items.find((i) => i.id === current.id)!;
          const p = dragPlacement(item, moved, model.geometry, model.mapId);
          release.current = { id: current.id, placement: p };
          // A rough drop may land on any nearby support, not only the one the item left.
          const accepted = onDrop(current.id, p);
          if (!accepted) {
            release.current = null;
            drag.current = null;
            setPreview(null);
            startAnimation(
              current.id,
              p,
              model.placements[current.id],
              "return",
            );
            return;
          }
        }
        drag.current = null;
        setPreview(null);
      }}
      onPointerCancel={(event) => {
        if (drag.current?.pointerId === event.pointerId) cancel();
      }}
      onLostPointerCapture={(event) => {
        if (drag.current?.pointerId === event.pointerId) cancel();
      }}
    >
      <Stage
        width={width}
        height={width * 0.75}
        scaleX={scale}
        scaleY={scale}
        ref={stage}
      >
        <Layer listening={false}>
          <Shape
            sceneFunc={(context) => paintScene(context._context, display)}
          />
        </Layer>
      </Stage>
    </div>
  );
}
