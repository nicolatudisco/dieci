/**
 * Lazy life cycle of the levels: loads them a little before they are needed, fades them
 * in and out along the journey axis, orders them for drawing and frees the far ones.
 */
import { PerspectiveCamera, WebGLRenderTarget } from 'three';
import type { Level, LevelContext, LevelDef } from './level.ts';

type SlotState = 'idle' | 'loading' | 'ready' | 'error';

interface Slot {
  readonly def: LevelDef;
  state: SlotState;
  level: Level | null;
  pending: Promise<void> | null;
  /** Clock time when the level became ready; null when it must not fade in. */
  readyAt: number | null;
  justReady: boolean;
  /** True once the level has been drawn at least once (see `Engine.prime`). */
  primed: boolean;
}

export interface ActiveLevel {
  readonly def: LevelDef;
  readonly level: Level;
  readonly fade: number;
}

/** Levels start loading when `u` is within this distance of their range. */
const PRELOAD = 0.8;
/** Levels are freed when `u` is farther than this from their range. */
const KEEP = 2.5;
/** Seconds a level that arrived late takes to appear: never a pop. */
const READY_FADE = 0.3;

function smoothstep(a: number, b: number, x: number): number {
  if (a === b) return x >= b ? 1 : 0;
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Opacity of a level at position `u`, from its ramps alone. */
export function rampFade(def: LevelDef, u: number): number {
  if (u < def.range[0] || u > def.range[1]) return 0;
  const fadeIn = def.fadeIn ? smoothstep(def.fadeIn[0], def.fadeIn[1], u) : 1;
  const fadeOut = def.fadeOut ? 1 - smoothstep(def.fadeOut[0], def.fadeOut[1], u) : 1;
  return fadeIn * fadeOut;
}

/** Lower is drawn first. Without an explicit order, larger units are behind. */
function drawOrder(def: LevelDef): number {
  return def.order ?? -Math.log10(def.unit);
}

export class LevelManager {
  private readonly slots: Slot[];
  private readonly ctx: LevelContext;
  private readonly forceOffscreen: boolean;
  /** Only for compiling shaders ahead of time: never drawn with. */
  private readonly warmCamera = new PerspectiveCamera();
  private warmTarget: WebGLRenderTarget | null = null;

  constructor(defs: readonly LevelDef[], ctx: LevelContext, forceOffscreen = false) {
    this.ctx = ctx;
    this.forceOffscreen = forceOffscreen;
    this.slots = [...defs]
      .sort((a, b) => drawOrder(a) - drawOrder(b))
      .map((def) => ({ def, state: 'idle', level: null, pending: null, readyAt: null, justReady: false, primed: false }));
  }

  private load(slot: Slot, fadeInWhenReady: boolean): Promise<void> {
    if (slot.pending) return slot.pending;
    slot.state = 'loading';
    slot.pending = (async () => {
      try {
        const module = await slot.def.load();
        const level = module.default(slot.def);
        await level.init(this.ctx);
        await this.warm(level, slot.def);
        if (slot.state !== 'loading') {
          // Freed while loading: the journey moved on.
          level.dispose();
          return;
        }
        slot.level = level;
        slot.state = 'ready';
        slot.justReady = fadeInWhenReady && !this.ctx.isStatic;
        slot.readyAt = null;
      } catch (error) {
        slot.state = 'error';
        console.error(`Level "${slot.def.id}" failed to load`, error);
      }
    })();
    return slot.pending;
  }

  /**
   * Compiles the shaders of a level before it is ever drawn, so that its first frame costs
   * the same as any other (without this, the level that enters stalls the zoom for a frame
   * or two while the GPU driver compiles). Where the browser can, compilation runs in
   * parallel and this only waits for it.
   */
  private async warm(level: Level, def: LevelDef): Promise<void> {
    const { renderer } = this.ctx;
    const jobs: Promise<unknown>[] = [];
    if (level.scene) jobs.push(renderer.compileAsync(level.scene, this.warmCamera));
    // Drawing into a render target uses another variant of every shader.
    const forTarget = [...(level.targetScenes ?? [])];
    if (level.scene && (def.fadeMode === 'offscreen' || this.forceOffscreen)) forTarget.push(level.scene);
    if (forTarget.length > 0) {
      const previous = renderer.getRenderTarget();
      this.warmTarget ??= new WebGLRenderTarget(1, 1);
      renderer.setRenderTarget(this.warmTarget);
      for (const scene of forTarget) jobs.push(renderer.compileAsync(scene, this.warmCamera));
      renderer.setRenderTarget(previous);
    }
    await Promise.all(jobs);
  }

  private free(slot: Slot): void {
    slot.level?.dispose();
    slot.level = null;
    slot.pending = null;
    slot.state = 'idle';
    slot.readyAt = null;
    slot.justReady = false;
    slot.primed = false;
  }

  /** Loads and initialises every level visible at `u`. They appear without a fade-in. */
  async ensure(u: number): Promise<void> {
    const needed = this.slots.filter((s) => u >= s.def.range[0] && u <= s.def.range[1] && s.state !== 'error');
    await Promise.all(needed.map((s) => this.load(s, false)));
  }

  /** True when every level visible at `u` is ready to draw. */
  isReady(u: number): boolean {
    return this.slots.every(
      (s) => u < s.def.range[0] || u > s.def.range[1] || s.state === 'ready' || s.state === 'error',
    );
  }

  /**
   * The levels to draw at `u`, back to front, with their opacity.
   *
   * `towards` is where an animated trip is heading (default: nowhere). Every level the trip
   * will cross starts loading at once, so that long jumps (▶ from the Moon to the Sun) find
   * them ready; a level that is late still fades in, it never pops.
   */
  frame(u: number, time: number, towards = u): ActiveLevel[] {
    const low = Math.min(u, towards);
    const high = Math.max(u, towards);
    const active: ActiveLevel[] = [];
    for (const slot of this.slots) {
      const [from, to] = slot.def.range;
      const visible = u >= from && u <= to;
      // Distance between the range of the level and the stretch of the axis in use.
      const distance = high < from ? from - high : low > to ? low - to : 0;

      if (slot.state === 'idle' && distance <= PRELOAD) void this.load(slot, true);
      if (slot.state !== 'idle' && slot.state !== 'error' && distance > KEEP) this.free(slot);
      if (slot.state !== 'ready' || !slot.level || !visible) continue;

      let fade = rampFade(slot.def, u);
      if (slot.justReady) {
        slot.readyAt ??= time;
        const ready = (time - slot.readyAt) / READY_FADE;
        if (ready >= 1) slot.justReady = false;
        else fade *= Math.max(0, ready);
      }
      if (fade > 0.002) active.push({ def: slot.def, level: slot.level, fade });
    }
    return active;
  }

  /**
   * One level that is loaded but has never been drawn, if any. The engine draws it once
   * into a single hidden pixel, so the cost of a first draw (buffers, GPU pipeline) is paid
   * while the journey stands still and not in the middle of a zoom.
   */
  takeUnprimed(): { def: LevelDef; level: Level } | null {
    for (const slot of this.slots) {
      if (slot.state !== 'ready' || !slot.level || slot.primed) continue;
      slot.primed = true;
      return { def: slot.def, level: slot.level };
    }
    return null;
  }

  /** For the debug overlay. */
  describe(): string[] {
    return this.slots.filter((s) => s.state !== 'idle').map((s) => `${s.def.id}:${s.state}`);
  }

  dispose(): void {
    for (const slot of this.slots) this.free(slot);
    this.warmTarget?.dispose();
    this.warmTarget = null;
  }
}
