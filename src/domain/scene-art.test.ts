import { expect, it } from "vitest";
import { assetsById } from "../data/catalog";
import artMetrics from "../data/art-metrics.json";
import { sceneArtwork } from "../data/scene-art";
import { footprint, normalizePlacement, poseOf, sizeOf } from "./placement";
import { visualBounds } from "../rendering/paint";
import { motionFrame } from "../rendering/motion";
import type { Surface } from "./types";

const floor: Surface = { id: "floor", label: "검수 바닥", zone: 0,
  polygon: [0,0,960,0,960,720,0,720], depth: .4, shadow: .2 };
const shelf: Surface = { ...floor, id: "shelf", depth: .2, insertion: { lift: 30, duration: 300 } };

it.each(["board-game", "puzzle-box", "card-game"])("%s의 실루엣·밑면·이동은 같은 선반 원화를 따른다", (id) => {
  const asset = assetsById[id], mapId = "classroom-cabinet";
  const selected = sceneArtwork(asset, mapId);
  const metric = (artMetrics as Record<string, {width:number;height:number}>)[selected.metricId];
  const [w,h] = sizeOf(asset,mapId);
  expect(w/h).toBeCloseTo(metric.width/metric.height);
  const from = normalizePlacement(asset,{x:300,y:600},floor,45,mapId);
  const to = normalizePlacement(asset,{x:400,y:350},shelf,45,mapId);
  expect(from.angle).toBe(0);
  expect(poseOf(asset,floor,mapId)).toBe("upright");
  const item = {id,asset:id,label:id,zones:[1]};
  const bounds = visualBounds(item,to,shelf,mapId);
  expect(bounds.right-bounds.left).toBeCloseTo(w);
  expect(bounds.bottom-bounds.top).toBeCloseTo(h);
  const feet = footprint(asset,to,shelf,mapId);
  expect(Math.max(...feet.map(p=>p.y))-Math.min(...feet.map(p=>p.y))).toBeCloseTo(asset.height*shelf.depth);
  for (const progress of [0,.2,.5,.66,.8,1]) {
    const frame = motionFrame({id,from,to,progress},item,{surfaces:[floor,shelf],initial:[],slots:[],dirt:[]},mapId);
    const moving = visualBounds(item,frame.placement,frame.surface,mapId);
    expect(moving.right-moving.left).toBeCloseTo(w);
    expect(moving.bottom-moving.top).toBeCloseTo(h);
  }
  expect(sceneArtwork(asset,"school-desk").path).toBe(asset.path);
});
