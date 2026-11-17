/**
 * Loading of the geographic data from the site itself (public/data/, see
 * scripts/geodata/README.md). Never from another server.
 *
 * A file is fetched and decoded once and shared by every level that asks for it (`quartiere`
 * and `firenze` draw the same city), so neighbouring levels coincide by construction.
 */
import { LinearMipmapLinearFilter, NoColorSpace, TextureLoader, type Texture } from 'three';
import { decodeGeo, type Box, type GeoFile, type GeoFileRaw } from './format.ts';

const files = new Map<string, Promise<GeoFile>>();

/** Same folder as the page: works with `base: './'` whatever the name of the repo. */
function dataUrl(name: string): string {
  return new URL(`data/${name}`, document.baseURI).href;
}

export function loadGeo(name: string): Promise<GeoFile> {
  let pending = files.get(name);
  if (!pending) {
    pending = fetch(dataUrl(name))
      .then((res) => {
        if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
        return res.json() as Promise<GeoFileRaw>;
      })
      .then(decodeGeo);
    // A failed load can be retried the next time the level is needed.
    pending.catch(() => files.delete(name));
    files.set(name, pending);
  }
  return pending;
}

export interface NightPicture {
  readonly texture: Texture;
  /** Where the picture lies, metres from the starting point. */
  readonly box: Box;
}

interface NightMeta {
  readonly [name: string]: { readonly file: string; readonly box: Box };
}

let nightMeta: Promise<NightMeta> | null = null;

/** The night lights of NASA Black Marble, reprojected like every other map (`toscana`, `italia`). */
export async function loadNight(name: 'toscana' | 'italia'): Promise<NightPicture> {
  nightMeta ??= fetch(dataUrl('night.json')).then((res) => {
    if (!res.ok) throw new Error(`night.json: HTTP ${res.status}`);
    return res.json() as Promise<NightMeta>;
  });
  const meta = (await nightMeta)[name];
  if (!meta) throw new Error(`No night picture "${name}"`);
  const texture = await new TextureLoader().loadAsync(dataUrl(meta.file));
  // Brightness, not colour: the shader decides the colour of the lights.
  texture.colorSpace = NoColorSpace;
  // Mipmaps: zooming out, the lights must thin out, not shimmer.
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  return { texture, box: meta.box };
}

/** Lets the browser draw a frame between two slices of heavy work in `init()`. */
export function breathe(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
