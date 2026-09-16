import type { ArtCollection, LoadedArt } from "../domain/types";
import { assetsById } from "../data/catalog";
import { hasShelfView, hasHangingView, sceneArtwork } from "../data/scene-art";

const imagePromises = new Map<string, Promise<HTMLImageElement>>();
export function assetUrl(path: string) {
  return new URL(import.meta.env.BASE_URL + path, document.baseURI).href;
}
export function loadImage(path: string): Promise<HTMLImageElement> {
  const url = assetUrl(path);
  let promise = imagePromises.get(url);
  if (!promise) {
    promise = new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      let settled = false;
      const cleanup = () => {
        clearTimeout(timer);
        image.onload = null;
        image.onerror = null;
      };
      const fail = () => {
        if (settled) return;
        settled = true;
        cleanup();
        if (imagePromises.get(url) === promise) imagePromises.delete(url);
        reject(new Error(`그림을 불러오지 못했어요: ${path}`));
      };
      const timer = window.setTimeout(fail, 15000);
      image.onload = async () => {
        try {
          await image.decode();
          if (settled) return;
          settled = true;
          cleanup();
          resolve(image);
        } catch {
          fail();
        }
      };
      image.onerror = fail;
      image.src = url;
    });
    imagePromises.set(url, promise);
  }
  return promise;
}
const artPromises = new Map<string, Promise<LoadedArt>>();
// Drop cache ownership, not the pixels held by a visible scene or an export in progress.
export function retainArtCache(paths: string[]) {
  const urls = new Set(paths.map(assetUrl));
  for (const url of imagePromises.keys())
    if (!urls.has(url)) imagePromises.delete(url);
  for (const url of artPromises.keys())
    if (!urls.has(url)) artPromises.delete(url);
}

export function sceneArtPaths(mapId: string, ids: string[]) {
  return [
    `assets/maps/${mapId}/background.webp`,
    ...new Set(ids.map((id) => sceneArtwork(assetsById[id], mapId).path)),
    ...ids.filter(id => hasShelfView(assetsById[id], mapId)).map(id => `assets/items/views/${id}--shelf.webp`),
    ...ids.filter(id => hasHangingView(assetsById[id], mapId)).map(id => `assets/items/views/${id}--alternate-support.webp`),
    "assets/effects/dust.webp",
    "assets/effects/stain.webp",
  ];
}

export function loadArt(id: string, path?: string) {
  const sourcePath = path ?? assetsById[id].path;
  const url = assetUrl(sourcePath);
  let promise = artPromises.get(url);
  if (!promise) {
    promise = loadImage(sourcePath)
      .then((source) => {
        const scan = document.createElement("canvas");
        scan.width = source.width;
        scan.height = source.height;
        const ctx = scan.getContext("2d", { willReadFrequently: true })!;
        ctx.drawImage(source, 0, 0);
        const data = ctx.getImageData(0, 0, scan.width, scan.height).data;
        let left = scan.width,
          top = scan.height,
          right = 0,
          bottom = 0;
        for (let y = 0; y < scan.height; y++)
          for (let x = 0; x < scan.width; x++) {
            if (data[(y * scan.width + x) * 4 + 3] < 24) continue;
            left = Math.min(left, x);
            right = Math.max(right, x);
            top = Math.min(top, y);
            bottom = Math.max(bottom, y);
          }
        if (right <= left || bottom <= top) throw new Error(`빈 그림: ${id}`);
        const image = document.createElement("canvas");
        image.width = right - left + 1;
        image.height = bottom - top + 1;
        image
          .getContext("2d")!
          .drawImage(
            source,
            left,
            top,
            image.width,
            image.height,
            0,
            0,
            image.width,
            image.height,
          );
        const silhouette = document.createElement("canvas");
        silhouette.width = image.width;
        silhouette.height = image.height;
        const shadow = silhouette.getContext("2d")!;
        shadow.drawImage(image, 0, 0);
        shadow.globalCompositeOperation = "source-in";
        shadow.fillStyle = "#403a2b";
        shadow.fillRect(0, 0, image.width, image.height);
        return { image, silhouette, width: image.width, height: image.height };
      })
      .catch((error) => {
        if (artPromises.get(url) === promise) artPromises.delete(url);
        throw error;
      });
    artPromises.set(url, promise);
  }
  return promise;
}
export async function loadSceneItem(mapId: string, id: string) {
  const primary = await loadArt(id, sceneArtwork(assetsById[id], mapId).path);
  if(hasHangingView(assetsById[id],mapId)) return {...primary,hanging:await loadArt(id,`assets/items/views/${id}--alternate-support.webp`)};
  if (!hasShelfView(assetsById[id], mapId)) return primary;
  const shelf = await loadArt(id, `assets/items/views/${id}--shelf.webp`);
  return { ...primary, shelf };
}

export async function loadSceneArt(
  mapId: string,
  ids: string[],
): Promise<ArtCollection> {
  const [background, entries, dust, stain] = await Promise.all([
    loadImage(`assets/maps/${mapId}/background.webp`),
    Promise.all(
      [...new Set(ids)].map(async (id) => [id, await loadSceneItem(mapId, id)] as const),
    ),
    loadArt("effect:dust", "assets/effects/dust.webp"),
    loadArt("effect:stain", "assets/effects/stain.webp"),
  ]);
  return {
    background,
    items: Object.fromEntries(entries),
    effects: { dust, stain },
  };
}
