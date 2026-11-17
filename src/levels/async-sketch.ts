/**
 * A Sketch (placeholder/sketch.ts: labels, lenses, fades, quality) that first loads what
 * it needs (pictures from the site itself) and then builds its scene: the base of the
 * scenes of M3. Same pattern as GeoSketch (geo/level.ts), without the maps.
 *
 * Loading happens in `init()`, which the level manager awaits before the level ever enters
 * the frame (and starts well ahead of it): nothing is fetched or built while it is visible.
 */
import type { LevelContext, LevelDef, LevelFactory, LevelFrame } from '../engine/level.ts';
import { Sketch } from './placeholder/sketch.ts';

export class AsyncSketch extends Sketch {
  private readonly prepare: (s: AsyncSketch) => Promise<void>;
  private readonly onFrame: ((frame: LevelFrame) => void)[] = [];
  private readonly releases: (() => void)[] = [];

  constructor(def: LevelDef, prepare: (s: AsyncSketch) => Promise<void>) {
    super(def, () => {});
    this.prepare = prepare;
    this.tick = (frame) => {
      for (const f of this.onFrame) f(frame);
    };
  }

  override async init(ctx: LevelContext): Promise<void> {
    super.init(ctx);
    await this.prepare(this);
  }

  /** Called every frame, after the shared uniforms are set. */
  every(fn: (frame: LevelFrame) => void): void {
    this.onFrame.push(fn);
  }

  /** Something to give back when the level is freed (a shared picture, see textures.ts). */
  onDispose(release: () => void): void {
    this.releases.push(release);
  }

  override dispose(): void {
    super.dispose();
    for (const release of this.releases) release();
    this.releases.length = 0;
  }
}

/** Makes a level factory out of an async drawing function. */
export function asyncSketch(prepare: (s: AsyncSketch) => Promise<void>): LevelFactory {
  return (def) => new AsyncSketch(def, prepare);
}
