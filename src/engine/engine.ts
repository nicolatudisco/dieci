/**
 * The engine: owns the renderer, the clock, the motion and the levels, and runs the frame.
 *
 * One frame:
 *   1. advance the clock and the motion → the position `u`
 *   2. derive the camera exponent, the centre of the view and the framing
 *   3. ask the level manager which levels are alive and how opaque
 *   4. draw them back to front, one pass each, each with a camera in its own units
 *   5. tell the interface what happened (`onFrame`)
 */
import { Color, PerspectiveCamera, WebGLRenderer } from 'three';
import type { Clock } from './clock.ts';
import {
  DEFAULT_DEPTH,
  applyFraming,
  levelView,
  makeFraming,
  projectLocal,
  type Framing,
  type Rect,
} from './framing.ts';
import { cameraExponent, exponentAt, neighbour, type JourneyNode } from './journey.ts';
import type { LabelSpec, LevelContext, LevelDef, LevelFrame } from './level.ts';
import { LevelManager, type ActiveLevel } from './level-manager.ts';
import { Motion } from './motion.ts';
import { OffscreenFader } from './renderer.ts';
import { ANCHORS, centreAt } from './stage.ts';

/** The colour of the night behind everything. */
export const NIGHT = '#05060d';

const MAX_PIXEL_RATIO = 2;
/** Seconds the framing takes to follow a change of the free area. */
const FREE_TAU = 0.22;

export interface PlacedLabel {
  readonly key: string;
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly opacity: number;
  readonly kind: NonNullable<LabelSpec['kind']>;
  readonly align: NonNullable<LabelSpec['align']>;
}

export interface FrameInfo {
  readonly u: number;
  /** Exponent of Act I (clamped), for the counter. */
  readonly e: number;
  readonly framing: Framing;
  readonly time: number;
  readonly dt: number;
  readonly atNode: JourneyNode | null;
  readonly heading: JourneyNode | null;
  readonly moving: boolean;
  readonly labels: readonly PlacedLabel[];
  readonly active: readonly ActiveLevel[];
  readonly drawCalls: number;
  readonly pixelRatio: number;
}

export interface EngineOptions {
  /** The element that will contain the canvas; it defines the size of the stage. */
  readonly container: HTMLElement;
  readonly defs: readonly LevelDef[];
  readonly clock: Clock;
  readonly u: number;
  /** Force every level through the off-screen fade path (debugging aid: ?offscreen=1). */
  readonly forceOffscreen?: boolean;
}

export class Engine {
  readonly canvas: HTMLCanvasElement;
  readonly motion: Motion;
  readonly clock: Clock;
  /** Share of particles the levels should draw; lowered by the adaptive quality. */
  quality = 1;

  private readonly container: HTMLElement;
  private readonly renderer: WebGLRenderer;
  private readonly camera = new PerspectiveCamera();
  private readonly manager: LevelManager;
  private readonly fader = new OffscreenFader();
  private readonly listeners: ((info: FrameInfo) => void)[] = [];
  private readonly reducedMotion: boolean;
  private readonly forceOffscreen: boolean;
  private readonly resizeObserver: ResizeObserver;

  private width = 1;
  private height = 1;
  private pixelRatio = 1;
  private pixelRatioScale = 1;
  private free: Rect = { x: 0, y: 0, width: 1, height: 1 };
  private freeTarget: Rect | null = null;
  private running = false;
  private frames = 0;
  private readySignalled = false;

  constructor(options: EngineOptions) {
    this.container = options.container;
    this.clock = options.clock;
    this.motion = new Motion(options.u);
    this.forceOffscreen = options.forceOffscreen ?? false;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Throws when WebGL is not available: main.ts shows UI.errors.noWebGL.
    this.renderer = new WebGLRenderer({ antialias: true, alpha: false, stencil: false, powerPreference: 'high-performance' });
    this.renderer.autoClear = false;
    this.renderer.info.autoReset = false;
    this.renderer.setClearColor(new Color(NIGHT), 1);
    this.canvas = this.renderer.domElement;
    this.canvas.setAttribute('aria-hidden', 'true');
    this.container.appendChild(this.canvas);

    const ctx: LevelContext = { renderer: this.renderer, isStatic: this.clock.isStatic, reducedMotion: this.reducedMotion };
    this.manager = new LevelManager(options.defs, ctx, this.forceOffscreen);

    this.resize();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);
  }

  /** Registers a function called at the end of every frame. */
  onFrame(listener: (info: FrameInfo) => void): void {
    this.listeners.push(listener);
  }

  /**
   * The part of the stage that the interface leaves free, in CSS pixels. The framing
   * follows changes smoothly; pass `immediate` at start-up and after a resize.
   */
  setFreeRect(rect: Rect, immediate = false): void {
    if (immediate || this.clock.isStatic || this.freeTarget === null) this.free = { ...rect };
    this.freeTarget = { ...rect };
  }

  /** ▶ (1) or ◀ (-1). */
  go(dir: 1 | -1): JourneyNode | null {
    return this.motion.go(dir);
  }

  /** Scales the device pixel ratio (adaptive quality). */
  setPixelRatioScale(scale: number): void {
    if (scale === this.pixelRatioScale) return;
    this.pixelRatioScale = scale;
    this.resize();
  }

  /** Loads what is visible at the starting position, then starts the loop. */
  async start(): Promise<void> {
    await this.manager.ensure(this.motion.u);
    if (document.fonts?.ready) await document.fonts.ready;
    this.running = true;
    requestAnimationFrame(this.tick);
  }

  dispose(): void {
    this.running = false;
    this.resizeObserver.disconnect();
    this.manager.dispose();
    this.fader.dispose();
    this.renderer.dispose();
    this.canvas.remove();
  }

  private resize(): void {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO) * this.pixelRatioScale;
    if (width === this.width && height === this.height && pixelRatio === this.pixelRatio) return;
    const firstTime = this.freeTarget === null;
    this.width = width;
    this.height = height;
    this.pixelRatio = pixelRatio;
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);
    if (firstTime) this.free = { x: 0, y: 0, width, height };
  }

  private readonly tick = (timestamp: number): void => {
    if (!this.running) return;
    this.clock.tick(timestamp);
    this.motion.step(this.clock.dt);
    this.followFreeRect(this.clock.dt);
    this.render();
    this.frames++;
    // Ready = the frame at the requested state is on screen: levels loaded, free area
    // measured and still, one frame drawn and the next one arrived.
    if (!this.readySignalled && this.frames >= 2 && this.manager.isReady(this.motion.u) && this.freeIsStill()) {
      this.readySignalled = true;
      document.documentElement.dataset.ready = '1';
    }
    requestAnimationFrame(this.tick);
  };

  private freeIsStill(): boolean {
    const t = this.freeTarget;
    if (!t) return true;
    const f = this.free;
    return Math.abs(t.x - f.x) + Math.abs(t.y - f.y) + Math.abs(t.width - f.width) + Math.abs(t.height - f.height) < 0.5;
  }

  private followFreeRect(dt: number): void {
    const t = this.freeTarget;
    if (!t || this.freeIsStill()) {
      if (t) this.free = { ...t };
      return;
    }
    const k = dt > 0 ? 1 - Math.exp(-dt / FREE_TAU) : 0;
    const f = this.free;
    this.free = {
      x: f.x + (t.x - f.x) * k,
      y: f.y + (t.y - f.y) * k,
      width: f.width + (t.width - f.width) * k,
      height: f.height + (t.height - f.height) * k,
    };
  }

  /**
   * First draw of a level that has just been loaded, clipped to one pixel that the frame
   * then clears. At most one level per frame.
   */
  private prime(): void {
    const item = this.manager.takeUnprimed();
    const scene = item?.level.scene;
    if (!item || !scene) return;
    const { def, level } = item;
    const { renderer, camera, clock } = this;
    // The view in the middle of the life of the level: its content is certainly in sight.
    const u = (def.range[0] + def.range[1]) / 2;
    const e = cameraExponent(u);
    const framing = makeFraming(this.width, this.height, this.free, e, centreAt(e));
    const view = levelView(framing, def.unit, ANCHORS[def.origin]);
    applyFraming(camera, framing, view, def.depth ?? DEFAULT_DEPTH);
    level.update({
      u,
      e,
      fade: 1,
      time: clock.time,
      dt: 0,
      isStatic: clock.isStatic,
      camera,
      viewWidth: view.viewWidth,
      pxPerUnit: view.pxPerUnit,
      pixelRatio: this.pixelRatio,
      quality: this.quality,
    });
    renderer.setScissor(0, 0, 1, 1);
    renderer.setScissorTest(true);
    renderer.render(scene, camera);
    renderer.setScissorTest(false);
  }

  private render(): void {
    const { renderer, camera, clock, motion } = this;
    const u = motion.u;
    const eCam = cameraExponent(u);
    const framing = makeFraming(this.width, this.height, this.free, eCam, centreAt(eCam));
    // Where to load ahead: along an animated trip, or towards the next stop while resting
    // on one, so that pressing ▶ finds everything ready.
    const ahead = motion.heading ?? (motion.atNode ? neighbour(u, 1) : null);
    const active = this.manager.frame(u, clock.time, ahead?.u ?? u);
    const labels: PlacedLabel[] = [];

    renderer.setRenderTarget(null);
    this.prime();
    renderer.info.reset();
    renderer.clear();

    for (const item of active) {
      const { def, level, fade } = item;
      const view = levelView(framing, def.unit, ANCHORS[def.origin]);
      applyFraming(camera, framing, view, def.depth ?? DEFAULT_DEPTH);
      const offscreen = (this.forceOffscreen || def.fadeMode === 'offscreen') && fade < 0.999;
      const frame: LevelFrame = {
        u,
        e: eCam,
        // With the off-screen path the level draws at full strength and the engine fades the image.
        fade: offscreen ? 1 : fade,
        time: clock.time,
        dt: clock.dt,
        isStatic: clock.isStatic,
        camera,
        viewWidth: view.viewWidth,
        pxPerUnit: view.pxPerUnit,
        pixelRatio: this.pixelRatio,
        quality: this.quality,
      };
      level.update(frame);

      if (level.scene) {
        if (offscreen) {
          this.fader.render(renderer, level.scene, camera, fade);
        } else {
          renderer.clearDepth();
          renderer.render(level.scene, camera);
        }
      }

      for (const spec of level.labels?.(frame) ?? []) {
        const opacity = (spec.opacity ?? 1) * fade;
        if (opacity < 0.01) continue;
        const p = projectLocal(framing, view, spec.at);
        // A label belongs to the scene: outside the free area it would sit on the interface.
        const free = framing.free;
        if (!p.visible || p.x < free.x || p.y < free.y + 8 || p.x > free.x + free.width || p.y > free.y + free.height) continue;
        labels.push({
          key: `${def.id}/${spec.id}`,
          text: spec.text,
          x: p.x,
          y: p.y,
          opacity,
          kind: spec.kind ?? 'place',
          align: spec.align ?? 'above',
        });
      }
    }

    const info: FrameInfo = {
      u,
      e: exponentAt(u),
      framing,
      time: clock.time,
      dt: clock.dt,
      atNode: motion.atNode,
      heading: motion.heading,
      moving: motion.mode !== 'rest',
      labels,
      active,
      drawCalls: renderer.info.render.calls,
      pixelRatio: this.pixelRatio,
    };
    for (const listener of this.listeners) listener(info);
  }
}
