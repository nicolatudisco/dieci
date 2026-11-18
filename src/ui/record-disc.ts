/**
 * A Golden Record on the screen: a gold-plated disc under a light that stays still. As on
 * a real record the sheen does not turn: the grooves run under it. It turns at 16⅔
 * revolutions a minute, the speed the Voyager record is meant to be played at, and a
 * finger can spin it.
 *
 * Two of them: Voyager's, over the story, and hers, in the lab, which changes with what she
 * chooses (`setDesign`), gets its grooves cut by a needle of light while her sound plays
 * (`cut`), has its words written on the label (`write`), is read by the needle (`listen`)
 * and stops still with the words upright while she types (`hold`).
 *
 * Canvas 2D (the painting is in src/golden-record/paint.ts): what turns is painted once for
 * each size; a frame only turns it and lays the light on top. Decorative: hidden from
 * screen readers.
 */
import { EMPTY_DESIGN, type DiscDesign } from '../golden-record/design.ts';
import {
  HERS,
  VOYAGER_LABEL,
  clipWritten,
  composeHers,
  drawHole,
  drawLights,
  drawNeedle,
  groovesOf,
  needleRadius,
  paintEngraving,
  paintHerBase,
  paintHerLayers,
  paintLights,
  paintMessage,
  paintPicture,
  paintVoyager,
  radiusFor,
  sameGrooves,
  type Grooves,
  type HerLayers,
  type Lights,
} from '../golden-record/paint.ts';
import { el } from './dom.ts';

const TAU = Math.PI * 2;
/** 16⅔ revolutions a minute, in radians a second (clockwise on the screen). */
const CRUISE = ((50 / 3) * TAU) / 60;
/** The fastest a finger can spin it. */
const MAX_SPEED = 7 * CRUISE;
/** Seconds the disc takes to settle back to its own speed, after opening or after a spin. */
const SETTLE = 1.1;
/** Seconds it takes to come to rest upright when she starts typing. */
const HOLD = 0.45;

/**
 * How her disc moves: `full`; `reduced` (prefers-reduced-motion: fades instead of the
 * needle running, no turning by itself); `none` (?static=1: everything at once).
 */
export type DiscMotion = 'full' | 'reduced' | 'none';

export interface RecordDiscOptions {
  /** False with ?static=1 and with reduced motion: the disc does not turn by itself. */
  readonly spinning: boolean;
  /** Voyager's record (the default) or hers. */
  readonly art?: 'voyager' | 'hers';
  readonly motion?: DiscMotion;
}

interface Drag {
  readonly id: number;
  angle: number;
  time: number;
  velocity: number;
  moved: number;
}

/** A clock in seconds, from when something started (the audio clock, when there is sound). */
export type Clock = () => number;

interface Cut {
  readonly from: Grooves;
  readonly to: Grooves;
  fromCanvas: HTMLCanvasElement;
  toCanvas: HTMLCanvasElement;
  readonly clock: Clock;
  readonly duration: number;
  readonly done: () => void;
}

interface Writing {
  readonly clock: Clock;
  readonly duration: number;
  readonly done: () => void;
}

interface Reading {
  readonly clock: Clock;
  readonly duration: number;
}

/** A clock that starts now, in seconds. */
export function clockFromNow(): Clock {
  const start = performance.now();
  return () => (performance.now() - start) / 1000;
}

export class RecordDisc {
  readonly element = el('div', 'record__disc');
  private readonly canvas = el('canvas');
  private readonly context: CanvasRenderingContext2D | null;
  private readonly spinning: boolean;
  private readonly art: 'voyager' | 'hers';
  private readonly motion: DiscMotion;
  /** What turns, all in one: Voyager's record, or her layers laid together. */
  private flat: HTMLCanvasElement | null = null;
  private layers: HerLayers | null = null;
  private design: DiscDesign = EMPTY_DESIGN;
  private lights: Lights | null = null;
  private pixels = 0;
  private angle: number;
  private speed = 0;
  private active = false;
  private visible = true;
  private request = 0;
  private last = 0;
  private drag: Drag | null = null;
  private holding = false;
  private cutting: Cut | null = null;
  private writing: Writing | null = null;
  private reading: Reading | null = null;
  /** Called after every frame with the canvas just drawn (the lab copies it into a small disc). */
  onDraw: ((canvas: HTMLCanvasElement) => void) | null = null;

  constructor(options: RecordDiscOptions) {
    this.spinning = options.spinning;
    this.art = options.art ?? 'voyager';
    this.motion = options.motion ?? (options.spinning ? 'full' : 'none');
    // Voyager's starts turned a little; hers upright, with her picture the right way up.
    this.angle = this.art === 'voyager' ? 0.7 : 0;
    this.element.setAttribute('aria-hidden', 'true');
    this.element.append(this.canvas);
    this.context = this.canvas.getContext('2d');
    new ResizeObserver(() => this.resize()).observe(this.element);
    // Off the screen it does not need to turn (the page may hold two of them).
    new IntersectionObserver((entries) => {
      this.visible = entries.some((entry) => entry.isIntersecting);
      if (this.visible) this.wake();
    }).observe(this.element);
    this.canvas.addEventListener('pointerdown', (event) => this.press(event));
    this.canvas.addEventListener('pointermove', (event) => this.move(event));
    this.canvas.addEventListener('pointerup', (event) => this.release(event));
    this.canvas.addEventListener('pointercancel', () => (this.drag = null));
  }

  /** The page is open: the disc starts from still and comes up to speed. */
  start(): void {
    this.active = true;
    this.speed = 0;
    this.resize();
    this.draw();
    this.wake();
  }

  stop(): void {
    this.active = false;
    this.drag = null;
    cancelAnimationFrame(this.request);
    this.request = 0;
  }

  // ── Her disc ──────────────────────────────────────────────────────────────

  /** Shows a design at once: only the layers that changed are painted again. */
  setDesign(design: DiscDesign): void {
    const before = this.design;
    this.design = design;
    if (this.cutting) {
      // The needle is cutting: it goes on, towards the grooves of this design.
      if (!sameGrooves(this.cutting.to, groovesOf(design))) this.finishCut();
    }
    const layers = this.layers;
    if (layers && this.pixels) {
      if (!this.cutting && !sameGrooves(groovesOf(before), groovesOf(design))) layers.base = paintHerBase(this.pixels, groovesOf(design));
      if (before.picture !== design.picture) layers.picture = paintPicture(this.pixels, design.picture);
      if (before.engraving !== design.engraving) layers.engraving = paintEngraving(this.pixels, design.engraving);
      if (before.message !== design.message) layers.message = paintMessage(this.pixels, design.message);
      this.flatten();
    }
    this.draw();
  }

  /**
   * The needle cuts the grooves of `design` from the edge inwards: at `clock()` seconds out
   * of `duration` it stands on the groove of that moment of the sound. The rest of the
   * design shows at once.
   */
  cut(design: DiscDesign, clock: Clock, duration: number): Promise<void> {
    // A cut still running ends where it was going: the new one starts from there.
    this.finishCut();
    const from = groovesOf(this.design);
    const to = groovesOf(design);
    const layers = this.layers;
    if (this.motion === 'none' || !this.active || !layers || !this.pixels || sameGrooves(from, to)) {
      this.setDesign(design);
      return Promise.resolve();
    }
    return new Promise((done) => {
      // Set before the design, so that the base is not painted at once with its new grooves.
      this.cutting = {
        from,
        to,
        fromCanvas: layers.base,
        toCanvas: paintHerBase(this.pixels, to),
        clock,
        duration: Math.max(0.5, duration),
        done,
      };
      this.setDesign(design);
      this.wake();
    });
  }

  /** The words of the design appear on the label, letter by letter, in `duration` seconds. */
  write(design: DiscDesign, duration: number): Promise<void> {
    this.finishWriting();
    this.setDesign(design);
    if (this.motion === 'none' || !this.active || !design.engraving) return Promise.resolve();
    return new Promise((done) => {
      this.writing = { clock: clockFromNow(), duration, done };
      this.wake();
    });
  }

  /** The needle reads the grooves while the sound plays; `listen(null)` lifts it. */
  listen(clock: Clock | null, duration = 0): void {
    this.reading = clock ? { clock, duration } : null;
    this.wake();
    this.draw();
  }

  /** Paints her disc again from scratch (once the typeface of the letters has arrived). */
  repaint(): void {
    if (!this.layers || !this.pixels) return;
    this.layers = paintHerLayers(this.pixels, this.design);
    if (this.cutting) this.layers.base = this.cutting.fromCanvas;
    this.flatten();
    this.draw();
  }

  /** Everything in progress ends where it was going: the grooves cut, the words written, the needle lifted. */
  settle(): void {
    this.finishCut();
    this.finishWriting();
    this.reading = null;
    this.draw();
  }

  /** While she types: the disc comes to rest with the words upright. Then it turns again. */
  hold(on: boolean): void {
    this.holding = on;
    if (!on && this.spinning) this.speed = 0;
    this.wake();
  }

  private finishCut(): void {
    const cut = this.cutting;
    if (!cut) return;
    this.cutting = null;
    if (this.layers) this.layers.base = cut.toCanvas;
    this.flatten();
    cut.done();
  }

  private finishWriting(): void {
    const writing = this.writing;
    if (!writing) return;
    this.writing = null;
    writing.done();
  }

  private flatten(): void {
    if (!this.layers || !this.pixels) return;
    const canvas = this.flat && this.flat.width === this.pixels ? this.flat : document.createElement('canvas');
    canvas.width = canvas.height = this.pixels;
    const g = canvas.getContext('2d');
    if (!g) return;
    g.translate(this.pixels / 2, this.pixels / 2);
    composeHers(g, this.pixels, this.layers);
    this.flat = canvas;
  }

  // ── Time ──────────────────────────────────────────────────────────────────

  private get busy(): boolean {
    return this.cutting !== null || this.writing !== null || this.reading !== null;
  }

  private wake(): void {
    if (!this.active || this.request) return;
    if (!this.busy && !(this.spinning && this.visible) && !this.holding) return;
    this.last = 0;
    this.request = requestAnimationFrame(this.tick);
  }

  private readonly tick = (time: number): void => {
    this.request = 0;
    if (!this.active) return;
    const dt = this.last ? Math.min(0.05, (time - this.last) / 1000) : 0;
    this.last = time;
    let settled = true;
    if (this.holding && !this.drag) {
      // To the nearest upright position, and still.
      const target = Math.round(this.angle / TAU) * TAU;
      this.speed = 0;
      this.angle += (target - this.angle) * (1 - Math.exp(-dt / (this.motion === 'none' ? 1e-3 : HOLD * 0.35)));
      settled = Math.abs(target - this.angle) < 1e-3;
    } else if (!this.drag && this.spinning) {
      this.speed += (CRUISE - this.speed) * (1 - Math.exp(-dt / SETTLE));
      this.angle = (this.angle + this.speed * dt) % TAU;
    }
    const cut = this.cutting;
    if (cut && cut.clock() >= cut.duration) this.finishCut();
    const writing = this.writing;
    if (writing && writing.clock() >= writing.duration) this.finishWriting();
    const reading = this.reading;
    if (reading && reading.clock() >= reading.duration) this.reading = null;
    this.draw();
    if (this.busy || (this.spinning && this.visible && !this.holding) || (this.holding && !settled)) {
      this.request = requestAnimationFrame(this.tick);
    }
  };

  private resize(): void {
    const css = this.element.clientWidth;
    if (css === 0) return;
    const pixels = Math.round(css * Math.min(window.devicePixelRatio || 1, 2.5));
    if (pixels === this.pixels) return;
    this.pixels = pixels;
    this.canvas.width = this.canvas.height = pixels;
    if (this.art === 'voyager') this.flat = paintVoyager(pixels);
    else {
      this.layers = paintHerLayers(pixels, this.design);
      const cut = this.cutting;
      if (cut) {
        cut.fromCanvas = paintHerBase(pixels, cut.from);
        cut.toCanvas = paintHerBase(pixels, cut.to);
      }
      this.flatten();
    }
    this.lights = this.context ? paintLights(this.context) : null;
    this.draw();
  }

  // ── Drawing ───────────────────────────────────────────────────────────────

  private draw(): void {
    const g = this.context;
    if (!g || !this.flat) return;
    const size = this.pixels;
    const c = size / 2;
    const R = radiusFor(size);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, size, size);
    g.translate(c, c);
    g.save();
    g.rotate(this.angle);
    if (this.layers && (this.cutting || this.writing)) this.drawAtWork(g, size);
    else g.drawImage(this.flat, -c, -c);
    g.restore();
    if (this.lights) {
      // The light stays where it is.
      drawLights(g, this.lights, R, this.art === 'voyager' ? VOYAGER_LABEL : HERS.label, size);
      const needle = this.needleAt();
      if (needle !== null) drawNeedle(g, size, needleRadius(needle));
    }
    this.onDraw?.(this.canvas);
  }

  /** Where the needle is, from 0 (the edge) to 1 (the end of the sound); null when it is lifted. */
  private needleAt(): number | null {
    if (this.motion !== 'full') return null;
    const job = this.cutting ?? this.reading;
    return job ? Math.min(1, job.clock() / job.duration) : null;
  }

  /** Her disc while the needle cuts or the words are being written: the layers one by one. */
  private drawAtWork(g: CanvasRenderingContext2D, size: number): void {
    const layers = this.layers;
    if (!layers) return;
    const c = size / 2;
    const R = radiusFor(size);
    const cut = this.cutting;
    if (cut) {
      const progress = Math.min(1, cut.clock() / cut.duration);
      g.drawImage(cut.fromCanvas, -c, -c);
      g.save();
      if (this.motion === 'full') {
        // Cut already: from the edge to the needle.
        g.beginPath();
        g.arc(0, 0, R + 2, 0, TAU);
        g.arc(0, 0, needleRadius(progress) * R, 0, TAU);
        g.clip('evenodd');
      } else g.globalAlpha = progress;
      g.drawImage(cut.toCanvas, -c, -c);
      g.restore();
    } else g.drawImage(layers.base, -c, -c);
    if (layers.picture) g.drawImage(layers.picture, -c, -c);
    const engraving = layers.engraving;
    const writing = this.writing;
    if (engraving) {
      g.save();
      if (writing) {
        const progress = Math.min(1, writing.clock() / writing.duration);
        if (this.motion === 'full') clipWritten(g, size, engraving.arcs, progress);
        else g.globalAlpha = progress;
      }
      g.drawImage(engraving.canvas, -c, -c);
      g.restore();
    }
    if (layers.message) g.drawImage(layers.message, -c, -c);
    drawHole(g, size);
  }

  // ── A finger on the disc: drag it round, or tap it for a push.

  /** The angle of the pointer around the centre, or null outside the disc. */
  private pointerAngle(event: PointerEvent): number | null {
    const box = this.canvas.getBoundingClientRect();
    const x = event.clientX - box.left - box.width / 2;
    const y = event.clientY - box.top - box.height / 2;
    return Math.hypot(x, y) > box.width / 2 ? null : Math.atan2(y, x);
  }

  private press(event: PointerEvent): void {
    const angle = this.pointerAngle(event);
    if (angle === null || !this.active) return;
    this.canvas.setPointerCapture(event.pointerId);
    this.drag = { id: event.pointerId, angle, time: event.timeStamp, velocity: 0, moved: 0 };
  }

  private move(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag || drag.id !== event.pointerId) return;
    const box = this.canvas.getBoundingClientRect();
    const angle = Math.atan2(event.clientY - box.top - box.height / 2, event.clientX - box.left - box.width / 2);
    // The shortest way round, so that crossing ±180° is not a jump.
    const delta = ((angle - drag.angle + 3 * Math.PI) % TAU) - Math.PI;
    const dt = (event.timeStamp - drag.time) / 1000;
    this.angle += delta;
    if (dt > 0) drag.velocity = 0.5 * drag.velocity + 0.5 * (delta / dt);
    drag.moved += Math.abs(delta);
    drag.angle = angle;
    drag.time = event.timeStamp;
    if (!this.spinning && !this.busy) this.draw();
  }

  private release(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag || drag.id !== event.pointerId) return;
    this.drag = null;
    if (!this.spinning) return;
    const still = (event.timeStamp - drag.time) / 1000 > 0.08;
    const spin = drag.moved < 0.02 ? this.speed + 3 * CRUISE : still ? 0 : drag.velocity;
    this.speed = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, spin));
  }
}
