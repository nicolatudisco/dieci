/**
 * Base of the geographic levels (M2): a Sketch (labels, lenses, fades, quality) that first
 * loads its data from public/data/ and then builds its layers.
 *
 * Loading happens in `init()`, which the level manager awaits before the level ever enters
 * the frame (and starts well ahead of it): nothing is fetched or built while it is visible.
 */
import type { Object3D, Texture } from 'three';
import type { LevelContext, LevelDef, LevelFactory, LevelFrame } from '../../engine/level.ts';
import { Sketch } from '../placeholder/sketch.ts';
import type { Box } from './format.ts';
import { geoUniforms, updateGeoUniforms, type GeoUniforms } from './layers.ts';

/** No mask: a box far larger than any data. */
const NO_MASK: Box = [-1e9, -1e9, 1e9, 1e9];

export class GeoSketch extends Sketch {
  /** Metres in one local unit. */
  readonly unit: number;
  /** Shared by every layer of the level: fade, pixel scale, mask, time. */
  readonly geo: GeoUniforms;
  private readonly prepare: (s: GeoSketch) => Promise<void>;
  private readonly onFrame: ((frame: LevelFrame) => void)[] = [];
  private readonly textures: Texture[] = [];
  private layerOrder = 1000;

  constructor(def: LevelDef, prepare: (s: GeoSketch) => Promise<void>) {
    super(def, () => {});
    this.unit = def.unit;
    this.prepare = prepare;
    this.geo = geoUniforms(NO_MASK, 1, def.unit);
    this.tick = (frame) => {
      updateGeoUniforms(this.geo, frame);
      for (const f of this.onFrame) f(frame);
    };
  }

  override async init(ctx: LevelContext): Promise<void> {
    super.init(ctx);
    await this.prepare(this);
  }

  /** Everything outside `box` (metres from the starting point) fades out over `soft` metres. */
  mask(box: Box, soft: number): void {
    this.geo.uMask.value.set(box[0] / this.unit, box[1] / this.unit, box[2] / this.unit, box[3] / this.unit);
    this.geo.uMaskSoft.value = soft / this.unit;
  }

  /**
   * Everything also fades out between two distances (metres) from `centre` (metres from the
   * starting point): a round edge, so that a map melts into the globe.
   */
  roundMask(centre: readonly [number, number], inner: number, outer: number): void {
    this.geo.uRound.value.set(centre[0] / this.unit, centre[1] / this.unit, inner / this.unit, outer / this.unit);
  }

  /** Adds a layer (a mesh or a group of tiles); later layers are drawn later. */
  add(layer: Object3D): Object3D {
    const order = ++this.layerOrder;
    layer.traverse((o) => {
      o.renderOrder = order;
    });
    this.scene.add(layer);
    return layer;
  }

  /** A texture that must be freed with the level. */
  own(texture: Texture): Texture {
    this.textures.push(texture);
    return texture;
  }

  /** Called every frame, after the shared uniforms are set. */
  every(fn: (frame: LevelFrame) => void): void {
    this.onFrame.push(fn);
  }

  override dispose(): void {
    super.dispose();
    for (const t of this.textures) t.dispose();
    this.textures.length = 0;
  }
}

/** Makes a level factory out of an async drawing function. */
export function geoSketch(prepare: (s: GeoSketch) => Promise<void>): LevelFactory {
  return (def) => new GeoSketch(def, prepare);
}
