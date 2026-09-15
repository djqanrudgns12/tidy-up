export type Point = { x: number; y: number };
export type AssetDefinition = {
  id: string;
  label: string;
  art: string;
  shape: string;
  purpose: string;
  group: string;
  rotatable: boolean;
  width: number;
  height: number;
  path: string;
  book: boolean;
  standing: boolean;
};
export type ItemDefinition = {
  id: string;
  asset: string;
  label: string;
  zones: number[];
  purpose?: string;
};
export type MapDefinition = {
  id: string;
  name: string;
  family: string;
  bg: string;
  focus: string;
  copy: string;
  zones: string[];
  base: ItemDefinition[];
  extras: ItemDefinition[];
  rects: (number[] | number[][])[];
  initial: number[][];
  slots: number[][];
  dirt: number[][];
  risk: string;
  hours: string;
  phase: string;
  revision: number;
  category: "school" | "home";
};
export type Pose = "flat" | "upright" | "hanging";
/** x/y is the plane centre (flat), sole (upright), or handle contact (hanging). */
export type Placement = Point & {
  surface: string;
  angle: number;
  stackOn?: string;
};
export type PerforatedPanel = { polygon: number[]; openings: number[][] };
export type Surface = {
  id: string;
  label: string;
  zone: number;
  polygon: number[];
  entryPolygon?: number[];
  depth: number;
  vanishingPoint?: Point;
  pose?: Pose;
  baseline?: number;
  anchor?: Point;
  maxHeight?: number;
  shadow: number;
  occluders?: number[][];
  perforatedOccluders?: PerforatedPanel[];
  depthOccluders?: { polygon: number[]; depth: number }[];
  obstacles?: number[][];
  shadowReceiver?: number[];
  insertion?: { lift: number; duration: number };
  supportKey?: string;
};
export type PhysicalMap = {
  surfaces: Surface[];
  initial: Placement[];
  slots: Placement[];
  dirt: {
    x: number;
    y: number;
    surface: string;
    tool: "duster" | "broom" | "cloth";
  }[];
};
export type LoadedArt = {
  image: HTMLCanvasElement;
  silhouette: HTMLCanvasElement;
  width: number;
  height: number;
};
export type ArtCollection = {
  background: HTMLImageElement;
  items: Record<string, LoadedArt>;
  effects: { dust: LoadedArt; stain: LoadedArt };
};
