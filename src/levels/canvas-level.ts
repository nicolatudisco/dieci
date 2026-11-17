/**
 * Base of the levels drawn with a 2D canvas over the stage: the scenes made of numbers of
 * Act II, and the scene of the finale. Past the observable universe there is nothing left
 * to put in a 3D scene: only digits and light.
 *
 * The canvas is as large as the stage and follows the pixel ratio of the renderer, so the
 * adaptive quality of the engine applies here too. A level only implements `paint`, in CSS
 * pixels from the top-left corner of the stage. The engine mounts `dom`, fades it with the
 * level and removes it (see level.ts → Level.dom).
 */
import type { Rect } from '../engine/framing.ts';
import type { Level, LevelContext, LevelDef, LevelFrame } from '../engine/level.ts';

/** The typeface of titles and counter, as a canvas font family. */
export const DISPLAY_FONT = `'Fraunces Variable', 'Iowan Old Style', Georgia, serif`;

/** The typeface of the running texts. */
export const TEXT_FONT = `'Andika', system-ui, sans-serif`;

export const TAU = Math.PI * 2;

/** 0 before `from`, 1 after `to`, smooth in between. */
export function ramp(from: number, to: number, x: number): number {
  if (from === to) return x >= to ? 1 : 0;
  const t = Math.min(1, Math.max(0, (x - from) / (to - from)));
  return t * t * (3 - 2 * t);
}

/** A number in [0, 1) from two integers: the same every time, for scenes that must not change between visits. */
export function hash(a: number, b = 0): number {
  let h = (Math.imul(a | 0, 0x9e3779b1) ^ Math.imul((b | 0) + 0x7f4a7c15, 0x85ebca6b)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0;
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39) >>> 0;
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

/**
 * The part of the stage where a scene of numbers can be seen. Where the free area ends
 * against the interface (the counter, the caption) the scene stops there, softly; where it
 * ends against the edge of the screen, the scene simply runs off it.
 */
export interface Region {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  /** 1 well inside, 0 at an edge that borders the interface; `reach` pixels in between. */
  fade(x: number, y: number, reach: number): number;
}

export function sceneRegion(free: Rect, width: number, height: number): Region {
  const bounded = { left: free.x > 4, top: free.y > 4, right: free.x + free.width < width - 4, bottom: free.y + free.height < height - 4 };
  return {
    left: bounded.left ? free.x : 0,
    top: bounded.top ? free.y : 0,
    right: bounded.right ? free.x + free.width : width,
    bottom: bounded.bottom ? free.y + free.height : height,
    fade: (x, y, reach) =>
      (bounded.left ? ramp(0, reach, x - free.x) : 1) *
      (bounded.right ? ramp(0, reach, free.x + free.width - x) : 1) *
      (bounded.top ? ramp(0, reach, y - free.y) : 1) *
      (bounded.bottom ? ramp(0, reach, free.y + free.height - y) : 1),
  };
}

export abstract class CanvasLevel implements Level {
  readonly dom = document.createElement('div');
  protected readonly canvas = document.createElement('canvas');
  protected readonly def: LevelDef;
  protected ctx: LevelContext | null = null;
  private readonly context: CanvasRenderingContext2D | null;
  private key = '';

  constructor(def: LevelDef) {
    this.def = def;
    this.dom.className = `canvas-level canvas-level--${def.id}`;
    this.dom.setAttribute('aria-hidden', 'true');
    this.dom.append(this.canvas);
    this.context = this.canvas.getContext('2d');
  }

  init(ctx: LevelContext): void {
    this.ctx = ctx;
  }

  update(frame: LevelFrame): void {
    const g = this.context;
    if (!g) return;
    // Before the engine mounts it the layer has no size: the stage is as large as the window.
    const width = this.dom.clientWidth || window.innerWidth;
    const height = this.dom.clientHeight || window.innerHeight;
    const ratio = Math.max(1, Math.round(frame.pixelRatio * 100) / 100);
    const key = `${width}×${height}@${ratio}`;
    if (key !== this.key) {
      this.key = key;
      this.canvas.width = Math.round(width * ratio);
      this.canvas.height = Math.round(height * ratio);
    }
    g.setTransform(ratio, 0, 0, ratio, 0, 0);
    g.clearRect(0, 0, width, height);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    this.paint(g, frame, width, height, ratio);
  }

  /**
   * Draws one frame, in CSS pixels. `ratio` is device pixels per CSS pixel: a level that sets
   * its own transform must multiply by it.
   */
  protected abstract paint(g: CanvasRenderingContext2D, frame: LevelFrame, width: number, height: number, ratio: number): void;

  dispose(): void {
    this.dom.remove();
  }
}
