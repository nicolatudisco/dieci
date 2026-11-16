/**
 * The Golden Record, drawn: a gold-plated disc with its grooves and its engraved label,
 * under a light that stays still. As on a real record the sheen does not turn: the grooves
 * run under it. The disc turns at 16⅔ revolutions a minute, the speed the Voyager record
 * is meant to be played at, and a finger can spin it.
 *
 * Canvas 2D. The disc is drawn once for each size into a buffer; a frame only turns the
 * buffer and lays the light on top. It is decorative: hidden from screen readers.
 */
import { el } from './dom.ts';

const TAU = Math.PI * 2;
/** 16⅔ revolutions a minute, in radians a second (clockwise on the screen). */
const CRUISE = ((50 / 3) * TAU) / 60;
/** The fastest a finger can spin it. */
const MAX_SPEED = 7 * CRUISE;
/** Seconds the disc takes to settle back to its own speed, after opening or after a spin. */
const SETTLE = 1.1;
/** The direction of the light: the sheen is the diameter across the disc at this angle. */
const LIGHT = (-50 * Math.PI) / 180;

/** Radii, as fractions of the radius of the disc. */
const HOLE = 0.03;
const LABEL = 0.335;
const LEAD_OUT = 0.37;
const GROOVES_END = 0.965;
/** Where one track ends and the next begins: smooth bands among the grooves. */
const GAPS = [0.43, 0.475, 0.53, 0.6, 0.645, 0.71, 0.77, 0.83, 0.9];
const GAP_HALF = 0.0045;

export interface RecordDiscOptions {
  /** False with ?static=1 and with reduced motion: the disc does not turn by itself. */
  readonly spinning: boolean;
}

interface Lights {
  /** Darker away from the light. */
  readonly shade: CanvasGradient;
  /** The sheen on the grooves, and the softer one on the matte label. */
  readonly sheen: CanvasGradient;
  readonly soft: CanvasGradient;
}

interface Drag {
  readonly id: number;
  angle: number;
  time: number;
  velocity: number;
  moved: number;
}

export class RecordDisc {
  readonly element = el('div', 'record__disc');
  private readonly canvas = el('canvas');
  private readonly context: CanvasRenderingContext2D | null;
  private readonly spinning: boolean;
  private buffer: HTMLCanvasElement | null = null;
  private lights: Lights | null = null;
  private pixels = 0;
  private angle = 0.7;
  private speed = 0;
  private active = false;
  private request = 0;
  private last = 0;
  private drag: Drag | null = null;

  constructor(options: RecordDiscOptions) {
    this.spinning = options.spinning;
    this.element.setAttribute('aria-hidden', 'true');
    this.element.append(this.canvas);
    this.context = this.canvas.getContext('2d');
    new ResizeObserver(() => this.resize()).observe(this.element);
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
    if (this.spinning && !this.request) {
      this.last = 0;
      this.request = requestAnimationFrame(this.tick);
    }
  }

  stop(): void {
    this.active = false;
    this.drag = null;
    cancelAnimationFrame(this.request);
    this.request = 0;
  }

  private readonly tick = (time: number): void => {
    this.request = 0;
    if (!this.active) return;
    const dt = this.last ? Math.min(0.05, (time - this.last) / 1000) : 0;
    this.last = time;
    if (!this.drag) {
      this.speed += (CRUISE - this.speed) * (1 - Math.exp(-dt / SETTLE));
      this.angle = (this.angle + this.speed * dt) % TAU;
    }
    this.draw();
    this.request = requestAnimationFrame(this.tick);
  };

  private resize(): void {
    const css = this.element.clientWidth;
    if (css === 0) return;
    const pixels = Math.round(css * Math.min(window.devicePixelRatio || 1, 2.5));
    if (pixels === this.pixels) return;
    this.pixels = pixels;
    this.canvas.width = this.canvas.height = pixels;
    this.buffer = paintDisc(pixels);
    this.lights = this.context ? paintLights(this.context) : null;
    this.draw();
  }

  private draw(): void {
    const g = this.context;
    if (!g || !this.buffer) return;
    const size = this.pixels;
    const c = size / 2;
    const R = radiusFor(size);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, size, size);
    g.translate(c, c);
    g.save();
    g.rotate(this.angle);
    g.drawImage(this.buffer, -c, -c);
    g.restore();
    if (!this.lights) return;
    // The light stays where it is.
    g.save();
    g.beginPath();
    g.arc(0, 0, R, 0, TAU);
    g.clip();
    g.fillStyle = this.lights.shade;
    g.fillRect(-c, -c, size, size);
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = this.lights.sheen;
    g.beginPath();
    g.arc(0, 0, R, 0, TAU);
    g.arc(0, 0, LABEL * R, 0, TAU);
    g.fill('evenodd');
    g.fillStyle = this.lights.soft;
    g.beginPath();
    g.arc(0, 0, LABEL * R, 0, TAU);
    g.fill();
    g.restore();
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
    if (!this.spinning) this.draw();
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

/** The radius of the disc in a canvas of `size` pixels: a little room for the soft edge. */
function radiusFor(size: number): number {
  return size / 2 - Math.max(1, size * 0.004);
}

/** A small seeded random generator: the same disc every time. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function circle(g: CanvasRenderingContext2D, r: number): void {
  g.beginPath();
  g.arc(0, 0, r, 0, TAU);
}

function annulus(g: CanvasRenderingContext2D, inner: number, outer: number, fill: string | CanvasGradient): void {
  g.beginPath();
  g.arc(0, 0, outer, 0, TAU);
  g.arc(0, 0, inner, 0, TAU);
  g.fillStyle = fill;
  g.fill('evenodd');
}

function conic(g: CanvasRenderingContext2D, intensity: (angle: number) => number, rgb: string): CanvasGradient | null {
  if (typeof g.createConicGradient !== 'function') return null;
  const gradient = g.createConicGradient(0, 0, 0);
  const STEPS = 360;
  for (let i = 0; i <= STEPS; i++) {
    const a = (i / STEPS) * TAU;
    gradient.addColorStop(i / STEPS, `rgba(${rgb}, ${Math.max(0, Math.min(1, intensity(a))).toFixed(3)})`);
  }
  return gradient;
}

/** Angular distance from the diameter of the light, in degrees (0 to 90). */
function fromLight(angle: number): number {
  const d = Math.abs((((angle - LIGHT) % Math.PI) + Math.PI) % Math.PI);
  return (Math.min(d, Math.PI - d) * 180) / Math.PI;
}

/** The light, centred on (0, 0). It is the same at every angle of the disc, so it is made once. */
function paintLights(g: CanvasRenderingContext2D): Lights | null {
  const gauss = (d: number, width: number): number => Math.exp(-((d / width) ** 2));
  const shade = conic(g, (a) => 0.34 * (1 - gauss(fromLight(a), 24)), '20, 12, 2');
  const sheen = conic(g, (a) => 0.5 * gauss(fromLight(a), 3.5) + 0.2 * gauss(fromLight(a), 15), '255, 238, 196');
  const soft = conic(g, (a) => 0.12 * gauss(fromLight(a), 26), '255, 236, 190');
  return shade && sheen && soft ? { shade, sheen, soft } : null;
}

/** The disc itself, with nothing of the light in it: this is what turns. */
function paintDisc(size: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d');
  if (!g) return canvas;
  const random = seeded(1977);
  const R = radiusFor(size);
  g.translate(size / 2, size / 2);

  // The metal.
  circle(g, R);
  g.fillStyle = '#c9a04a';
  g.fill();

  // The grooves: a light ring and a dark one, never quite the same (the sound is in them).
  const step = Math.max(1.6, size / 520);
  g.lineWidth = step * 0.42;
  for (let r = LEAD_OUT * R; r < GROOVES_END * R; r += step) {
    const f = r / R;
    if (GAPS.some((gap) => Math.abs(f - gap) < GAP_HALF)) continue;
    const loud = 0.5 + 0.5 * Math.sin(f * 173) * Math.sin(f * 41 + 1.3);
    g.strokeStyle = `rgba(255, 236, 170, ${(0.1 + 0.18 * loud).toFixed(3)})`;
    circle(g, r);
    g.stroke();
    g.strokeStyle = `rgba(88, 60, 14, ${(0.12 + 0.16 * (1 - loud)).toFixed(3)})`;
    circle(g, r + step * 0.5);
    g.stroke();
  }
  // Between one track and the next the groove runs fast and smooth: a darker band.
  for (const gap of GAPS) annulus(g, (gap - GAP_HALF) * R, (gap + GAP_HALF) * R, 'rgba(110, 80, 26, 0.32)');
  // Something that turns with the disc: the grooves are a little brighter and darker here and there.
  const swirl = conic(g, () => 0.13 * random(), '70, 46, 10');
  if (swirl) annulus(g, LEAD_OUT * R, GROOVES_END * R, swirl);
  g.lineCap = 'round';
  for (let i = 0; i < 220; i++) {
    const r = (LEAD_OUT + (GROOVES_END - LEAD_OUT) * random()) * R;
    const start = random() * TAU;
    g.strokeStyle = `rgba(255, 240, 190, ${(0.12 + 0.28 * random()).toFixed(3)})`;
    g.lineWidth = step * (0.3 + 0.4 * random());
    g.beginPath();
    g.arc(0, 0, r, start, start + (0.02 + 0.1 * random()));
    g.stroke();
  }
  // The smooth lead-out around the label, and the lip at the edge.
  annulus(g, LABEL * R, LEAD_OUT * R, 'rgba(255, 232, 170, 0.1)');
  annulus(g, GROOVES_END * R, R, 'rgba(255, 240, 196, 0.12)');
  circle(g, R - 0.5);
  g.strokeStyle = 'rgba(70, 46, 10, 0.7)';
  g.lineWidth = 1;
  g.stroke();

  // The label: matte, darker, engraved.
  const label = g.createRadialGradient(0, 0, 0, 0, 0, LABEL * R);
  label.addColorStop(0, '#a5803a');
  label.addColorStop(1, '#8c6a29');
  circle(g, LABEL * R);
  g.fillStyle = label;
  g.fill();
  g.lineWidth = Math.max(1, size / 700);
  for (const f of [0.318, 0.3]) {
    circle(g, f * R);
    g.strokeStyle = 'rgba(255, 228, 160, 0.3)';
    g.stroke();
  }
  engrave(g, random, R, size);

  // The hole in the middle.
  circle(g, HOLE * R);
  g.fillStyle = '#0b0805';
  g.fill();
  circle(g, HOLE * R + g.lineWidth);
  g.strokeStyle = 'rgba(255, 228, 160, 0.35)';
  g.stroke();
  return canvas;
}

/**
 * Lines of engraving on the label, too small to read: rows of little marks along two arcs
 * and two short straight rows, the way the label of the record carries its words.
 */
function engrave(g: CanvasRenderingContext2D, random: () => number, R: number, size: number): void {
  const h = 0.022 * R;
  const ink = 'rgba(255, 228, 164, 0.5)';
  const groove = 'rgba(52, 34, 6, 0.5)';
  const offset = Math.max(0.6, size / 1200);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  /** One letter-like mark of width `w`, centred on (0, 0): a few thin strokes. */
  const letter = (w: number, shape: number): void => {
    const x = w / 2;
    const y = h / 2;
    g.beginPath();
    if (shape === 0) {
      g.moveTo(0, -y);
      g.lineTo(0, y);
    } else if (shape === 1) {
      g.moveTo(-x, -y);
      g.lineTo(-x, y);
      g.moveTo(x, -y);
      g.lineTo(x, y);
      g.moveTo(-x, 0);
      g.lineTo(x, 0);
    } else if (shape === 2) {
      g.ellipse(0, 0, x, y, 0, 0, TAU);
    } else if (shape === 3) {
      g.moveTo(x, -y);
      g.lineTo(-x, -y);
      g.lineTo(-x, y);
      g.lineTo(x, y);
      g.moveTo(-x, 0);
      g.lineTo(x * 0.6, 0);
    } else if (shape === 4) {
      g.moveTo(-x, y);
      g.lineTo(0, -y);
      g.lineTo(x, y);
      g.moveTo(-x * 0.5, y * 0.25);
      g.lineTo(x * 0.5, y * 0.25);
    } else {
      g.moveTo(-x, y);
      g.lineTo(-x, -y * 0.2);
      g.quadraticCurveTo(0, -y * 1.3, x, -y * 0.2);
      g.lineTo(x, y);
    }
    g.stroke();
  };
  /** A row of letters, in words, along a path given by `at(distance)`. */
  const row = (length: number, at: (d: number) => { x: number; y: number; turn: number }): void => {
    let d = 0;
    while (d < length) {
      const word = 3 + Math.floor(random() * 6);
      for (let k = 0; k < word && d < length; k++) {
        const shape = Math.floor(random() * 6);
        const w = shape === 0 ? 0 : h * (0.5 + 0.25 * random());
        const p = at(d + w / 2);
        // A dark edge under each stroke, then the stroke: cut into the metal.
        for (const [style, dx] of [
          [groove, offset],
          [ink, 0],
        ] as const) {
          g.save();
          g.translate(p.x + dx, p.y + dx);
          g.rotate(p.turn);
          g.strokeStyle = style;
          g.lineWidth = Math.max(0.8, h * 0.13);
          letter(w, shape);
          g.restore();
        }
        d += w + h * 0.42;
      }
      d += h * 0.8;
    }
  };
  // Along the top, reading clockwise, and along the bottom.
  const arc = (r: number, from: number, to: number): void => {
    const length = Math.abs(to - from) * r;
    const sign = to > from ? 1 : -1;
    row(length, (d) => {
      const a = from + (sign * d) / r;
      return { x: r * Math.cos(a), y: r * Math.sin(a), turn: a + (sign * Math.PI) / 2 };
    });
  };
  arc(0.25 * R, (-150 * Math.PI) / 180, (-30 * Math.PI) / 180);
  arc(0.215 * R, (140 * Math.PI) / 180, (40 * Math.PI) / 180);
  // Two short rows across, above and below the hole.
  for (const [y, half] of [
    [-0.1 * R, 0.13 * R],
    [0.1 * R, 0.09 * R],
  ] as const) {
    row(2 * half, (d) => ({ x: -half + d, y, turn: 0 }));
  }
}
