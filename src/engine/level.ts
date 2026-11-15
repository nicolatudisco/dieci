/**
 * THE LEVEL CONTRACT.
 *
 * A level is one scene of the journey (usually one stop). The engine owns the camera,
 * the fades, the loading and the draw order; a level only builds its content, in its own
 * units, around its own origin, and updates it every frame.
 *
 * Rules for whoever writes a level:
 * - Build geometry in LOCAL UNITS (1 unit = `def.unit` metres) around (0, 0, 0), which is
 *   the stage anchor `def.origin`. Keep coordinates roughly between 1e-3 and 1e4.
 * - Do not create or move a camera: use `frame.camera` only to read from it.
 * - Apply `frame.fade` to your own materials (see levels/placeholder/primitives.ts for the
 *   `uFade` convention), or set `fadeMode: 'offscreen'` in the definition and let the
 *   engine fade the finished image.
 * - With `frame.isStatic` nothing may depend on time: `frame.time` is 0 and must give a
 *   complete, good-looking picture.
 * - Free every geometry, material, texture and render target in `dispose()`.
 */
import type { PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import type { DepthRange } from './framing.ts';
import type { AnchorId, Vec3 } from './stage.ts';

export interface LevelDef {
  /** Usually the id of the stop in levels.ts. */
  readonly id: string;
  /** Metres in one local unit. */
  readonly unit: number;
  /** Stage anchor that sits at the local origin. */
  readonly origin: AnchorId;
  /** The level is alive only while `u` is inside this range of the journey axis. */
  readonly range: readonly [number, number];
  /** Opacity ramps on the journey axis: 0 → 1 over `fadeIn`, 1 → 0 over `fadeOut`. */
  readonly fadeIn?: readonly [number, number];
  readonly fadeOut?: readonly [number, number];
  /** `material` (default): the level applies `frame.fade` itself. `offscreen`: the engine does. */
  readonly fadeMode?: 'material' | 'offscreen';
  /** Near and far planes as multiples of the camera distance. */
  readonly depth?: DepthRange;
  /** Draw order: lower is drawn first (behind). Default: larger units are behind. */
  readonly order?: number;
  /** Dynamic import, so that every level is its own chunk and loads only when needed. */
  readonly load: () => Promise<{ default: LevelFactory }>;
}

export type LevelFactory = (def: LevelDef) => Level;

export interface LevelContext {
  readonly renderer: WebGLRenderer;
  readonly isStatic: boolean;
  readonly reducedMotion: boolean;
}

export interface LevelFrame {
  /** Position on the journey axis and camera exponent (equal in Act I). */
  readonly u: number;
  readonly e: number;
  /** 0..1 opacity the level must show this frame. */
  readonly fade: number;
  /** Seconds of animation time and of the last step; both 0 with ?static=1. */
  readonly time: number;
  readonly dt: number;
  readonly isStatic: boolean;
  /** Configured by the engine for this level. Read only. */
  readonly camera: PerspectiveCamera;
  /** View width in local units, and CSS pixels per local unit on the focus plane. */
  readonly viewWidth: number;
  readonly pxPerUnit: number;
  /** Device pixels per CSS pixel currently used by the renderer. */
  readonly pixelRatio: number;
  /** 0..1 share of particles to draw, lowered when the device struggles. */
  readonly quality: number;
}

/** A text anchored to a point of the scene. The engine projects, places and fades it. */
export interface LabelSpec {
  /** Unique within the level. */
  readonly id: string;
  /** Plain text; `^{…}` makes a superscript, e.g. `10^{7} m`. */
  readonly text: string;
  /** Position in local units. */
  readonly at: Vec3;
  /** 0..1, multiplied by the fade of the level. Default 1. */
  readonly opacity?: number;
  readonly kind?: 'title' | 'place' | 'note';
  /** Where the text sits relative to the point. Default `above`. */
  readonly align?: 'above' | 'below' | 'left' | 'right' | 'center';
}

export interface Level {
  /** three.js content in local units. Omit for DOM-only levels. */
  readonly scene?: Scene;
  /** DOM content (the typographic scenes of Act II). The engine mounts and fades it. */
  readonly dom?: HTMLElement;
  init(ctx: LevelContext): void | Promise<void>;
  /** Called every frame while the level is alive, just before it is drawn. */
  update(frame: LevelFrame): void;
  /** Labels to show this frame. */
  labels?(frame: LevelFrame): readonly LabelSpec[];
  dispose(): void;
}
