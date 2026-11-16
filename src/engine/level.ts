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
 * - `update()` may be called more than once in a frame: right after loading, the engine
 *   draws every level once into a hidden pixel (with `dt = 0`), so that shaders are compiled
 *   and buffers uploaded before the level enters the frame. Create every material and
 *   texture in `init()`, not lazily in `update()`, or that first draw cannot warm them up.
 */
import type { PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import type { CivilDate } from '../personalization.ts';
import type { DepthRange, Rect } from './framing.ts';
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
  /**
   * «Today», from the one clock of the site (fixed with ?static=1). Every scene that
   * depends on the date reads it from here, so that scenes and texts never disagree.
   */
  readonly now: () => Date;
  /** From the link (#nata=…, #nome=…), or null. Never stored anywhere. */
  readonly birth: CivilDate | null;
  readonly name: string | null;
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
  /** The free area of the scene, in CSS pixels from the top-left corner of the stage. */
  readonly free: Rect;
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

/**
 * THE LENS: the one convention for everything that would be invisible at true scale
 * (the Moon, Jupiter and its moons, Saturn, the probes). A circle with a thin edge, tied
 * by a thread to the true position of the object, shows it enlarged with the words
 * «ingrandito, non in scala». Never enlarge an object directly in the scene: declare a lens.
 */
export interface LensSpec {
  /** Unique within the level. */
  readonly id: string;
  /** True position of the object, in local units: the thread starts here. */
  readonly at: Vec3;
  /** What the lens shows: a small scene of its own, in any units, looked at along -z. */
  readonly scene: Scene;
  /** Width of the field shown inside the lens, in the units of `scene`, and its centre. */
  readonly fieldWidth: number;
  readonly centre?: readonly [number, number];
  /** Where the lens sits relative to the object, in degrees (0 = right, 90 = up). */
  readonly angle?: number;
  /** The name of the object, written under the lens. */
  readonly label?: string;
  /** 0..1, multiplied by the fade of the level. Default 1. */
  readonly opacity?: number;
}

/**
 * What is drawn behind every level: the shared sky. Owned by the engine, drawn first.
 */
export interface Backdrop {
  readonly scene: Scene;
  readonly camera: PerspectiveCamera;
  update(frame: BackdropFrame): void;
  dispose(): void;
}

export interface BackdropFrame {
  readonly u: number;
  /** Camera exponent. */
  readonly e: number;
  readonly time: number;
  /** Canvas size in CSS pixels. */
  readonly width: number;
  readonly height: number;
  readonly pixelRatio: number;
  readonly quality: number;
}

export interface Level {
  /** three.js content in local units. Omit for DOM-only levels. */
  readonly scene?: Scene;
  /** Scenes that are drawn into a render target (the lenses): compiled ahead for that path. */
  readonly targetScenes?: readonly Scene[];
  /**
   * DOM content (the typographic scenes of Act II). The engine mounts it over the canvas,
   * as large as the stage, fades it with the level and removes it when the level leaves.
   * It must not catch gestures: the engine sets `pointer-events: none` on it.
   */
  readonly dom?: HTMLElement;
  init(ctx: LevelContext): void | Promise<void>;
  /** Called every frame while the level is alive, just before it is drawn. */
  update(frame: LevelFrame): void;
  /** Labels to show this frame. */
  labels?(frame: LevelFrame): readonly LabelSpec[];
  /** Lenses to show this frame. */
  lenses?(frame: LevelFrame): readonly LensSpec[];
  dispose(): void;
}
