/**
 * Pictures shared by neighbouring levels, loaded once from the site itself (never from
 * another server) and counted: `terra` and `luna` are alive together, and both draw the same
 * globe with the same textures. The GPU holds one copy; it is freed when the last level
 * that uses it gives it back.
 *
 *   const globe = await acquire('globe', loadGlobe);   // in init()
 *   s.onDispose(globe.release);                        // freed with the level
 */
import {
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  NoColorSpace,
  RGBAFormat,
  SRGBColorSpace,
  TextureLoader,
  UnsignedByteType,
  type Texture,
} from 'three';
import { breathe } from './geo/load.ts';

interface Entry<T> {
  readonly pending: Promise<T>;
  readonly dispose: (value: T) => void;
  count: number;
}

const entries = new Map<string, Entry<unknown>>();

export interface Handle<T> {
  readonly value: T;
  /** Gives the picture back; call it once, when the level is freed. */
  readonly release: () => void;
}

/**
 * The shared value for `key`, loading it with `load` the first time. Every call must be
 * matched by one `release()`.
 */
export async function acquire<T>(key: string, load: () => Promise<T>, dispose: (value: T) => void): Promise<Handle<T>> {
  let entry = entries.get(key) as Entry<T> | undefined;
  if (!entry) {
    const pending = load();
    entry = { pending, dispose, count: 0 };
    entries.set(key, entry as Entry<unknown>);
    // A failed load can be tried again the next time the level is needed.
    pending.catch(() => entries.delete(key));
  }
  entry.count++;
  const owned = entry;
  let released = false;
  const release = (): void => {
    if (released) return;
    released = true;
    owned.count--;
    if (owned.count > 0 || entries.get(key) !== owned) return;
    entries.delete(key);
    void owned.pending.then(owned.dispose, () => {});
  };
  try {
    return { value: await owned.pending, release };
  } catch (error) {
    release();
    throw error;
  }
}

/** Same folder as the page: works with `base: './'` whatever the name of the repo. */
export function siteUrl(path: string): string {
  return new URL(path, document.baseURI).href;
}

/** A colour picture (sRGB), with mipmaps. */
export async function loadColorTexture(path: string): Promise<Texture> {
  const texture = await new TextureLoader().loadAsync(siteUrl(path));
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  return texture;
}

/** A picture used as data (brightness, a mask), not as colour. */
export async function loadDataTexture(path: string): Promise<Texture> {
  const texture = await new TextureLoader().loadAsync(siteUrl(path));
  texture.colorSpace = NoColorSpace;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  return texture;
}

async function decode(path: string): Promise<ImageBitmap> {
  const res = await fetch(siteUrl(path));
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return createImageBitmap(await res.blob());
}

/**
 * Up to four grey pictures of the same size packed into the channels of ONE texture (red,
 * green, blue, alpha in the order given): a quarter of the GPU memory of four textures.
 * Rows are flipped, so that the texture is read like one from TextureLoader (v up).
 */
export async function packGreyTextures(paths: readonly string[]): Promise<DataTexture> {
  const images = await Promise.all(paths.map(decode));
  const first = images[0];
  if (!first) throw new Error('packGreyTextures: no pictures');
  const { width, height } = first;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('packGreyTextures: no 2D canvas');
  const data = new Uint8Array(width * height * 4);
  if (images.length < 4) for (let i = 3; i < data.length; i += 4) data[i] = 255;
  for (let c = 0; c < images.length; c++) {
    const image = images[c];
    if (!image) continue;
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    image.close();
    const grey = context.getImageData(0, 0, width, height).data;
    for (let y = 0; y < height; y++) {
      const from = y * width * 4;
      const to = (height - 1 - y) * width * 4;
      for (let x = 0; x < width * 4; x += 4) data[to + x + c] = grey[from + x] ?? 0;
    }
    // Let the browser draw a frame between two pictures.
    await breathe();
  }
  const texture = new DataTexture(data, width, height, RGBAFormat, UnsignedByteType);
  texture.colorSpace = NoColorSpace;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}
