/**
 * The Golden Records, painted on canvas 2D: Voyager's (the story) and hers (the lab).
 *
 * What turns is painted once for each size, with nothing of the light in it; the light is
 * laid on top at every frame and stays still, as on a real record (src/ui/record-disc.ts).
 * Her disc is painted in layers, so that a change repaints only what changed:
 *
 *   base       the metal and the grooves: blank before she creates it, then the grooves of
 *              her sound, which shine where the sound is loud (as on a real record, where
 *              loud and quiet passages show in the light of the grooves);
 *   picture    her picture, engraved in the middle of the label;
 *   engraving  the words of `engravingFor` on two arcs of the label;
 *   message    her message, engraved on the smooth band around the edge.
 *
 * The hole goes on top of everything.
 */
import type { DiscDesign, PictureId, SoundId } from './design.ts';
import { characters, ringText, splitEngraving } from './design.ts';
import { PICTURES } from './pictures.ts';
import { seeded } from './random.ts';
import { envelope } from './scores.ts';

const TAU = Math.PI * 2;
/** The direction of the light: the sheen is the diameter across the disc at this angle. */
export const LIGHT = (-50 * Math.PI) / 180;

/** Radii of Voyager's record, as fractions of the radius of the disc. */
const HOLE = 0.03;
export const VOYAGER_LABEL = 0.335;
const LEAD_OUT = 0.37;
const GROOVES_END = 0.965;
/** Where one track ends and the next begins: smooth bands among the grooves. */
const GAPS = [0.43, 0.475, 0.53, 0.6, 0.645, 0.71, 0.77, 0.83, 0.9];
const GAP_HALF = 0.0045;

/** Radii of her record. The label is larger than Voyager's: it carries her picture. */
export const HERS = {
  hole: 0.02,
  /** Her picture fits in this circle. */
  picture: 0.27,
  label: 0.4,
  leadOut: 0.43,
  /** The grooves run from here inwards to `leadOut`: the outermost is the first moment of the sound. */
  groovesOuter: 0.875,
  /** The baseline of the message, on the smooth band around the edge. */
  message: 0.912,
  lip: 0.975,
} as const;

const FONT = '"Fraunces Variable", Georgia, serif';

/** The letters on the disc are in Fraunces: it must be loaded before they are painted. */
export async function fontsReady(): Promise<void> {
  if (!document.fonts) return;
  await document.fonts.load(`500 32px ${FONT}`).catch(() => []);
}

/** The radius of the disc in a canvas of `size` pixels: a little room for the soft edge. */
export function radiusFor(size: number): number {
  return size / 2 - Math.max(1, size * 0.004);
}

function canvasOf(size: number): { canvas: HTMLCanvasElement; g: CanvasRenderingContext2D | null } {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d');
  g?.translate(size / 2, size / 2);
  return { canvas, g };
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

export interface Lights {
  /** Darker away from the light. */
  readonly shade: CanvasGradient;
  /** The sheen on the grooves, and the softer one on the matte label. */
  readonly sheen: CanvasGradient;
  readonly soft: CanvasGradient;
}

/** The light, centred on (0, 0). It is the same at every angle of the disc, so it is made once. */
export function paintLights(g: CanvasRenderingContext2D): Lights | null {
  const gauss = (d: number, width: number): number => Math.exp(-((d / width) ** 2));
  const shade = conic(g, (a) => 0.34 * (1 - gauss(fromLight(a), 24)), '20, 12, 2');
  const sheen = conic(g, (a) => 0.5 * gauss(fromLight(a), 3.5) + 0.2 * gauss(fromLight(a), 15), '255, 238, 196');
  const soft = conic(g, (a) => 0.12 * gauss(fromLight(a), 26), '255, 236, 190');
  return shade && sheen && soft ? { shade, sheen, soft } : null;
}

/** Lays the still light on a disc of radius `R` centred on (0, 0), with its matte label of radius `label` × R. */
export function drawLights(g: CanvasRenderingContext2D, lights: Lights, R: number, label: number, size: number): void {
  g.save();
  g.beginPath();
  g.arc(0, 0, R, 0, TAU);
  g.clip();
  g.fillStyle = lights.shade;
  g.fillRect(-size / 2, -size / 2, size, size);
  g.globalCompositeOperation = 'lighter';
  g.fillStyle = lights.sheen;
  g.beginPath();
  g.arc(0, 0, R, 0, TAU);
  g.arc(0, 0, label * R, 0, TAU);
  g.fill('evenodd');
  g.fillStyle = lights.soft;
  g.beginPath();
  g.arc(0, 0, label * R, 0, TAU);
  g.fill();
  g.restore();
}

// ── Voyager's record ────────────────────────────────────────────────────────

/** Voyager's record, with nothing of the light in it: this is what turns. */
export function paintVoyager(size: number): HTMLCanvasElement {
  const { canvas, g } = canvasOf(size);
  if (!g) return canvas;
  const random = seeded(1977);
  const R = radiusFor(size);

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
  annulus(g, VOYAGER_LABEL * R, LEAD_OUT * R, 'rgba(255, 232, 170, 0.1)');
  annulus(g, GROOVES_END * R, R, 'rgba(255, 240, 196, 0.12)');
  circle(g, R - 0.5);
  g.strokeStyle = 'rgba(70, 46, 10, 0.7)';
  g.lineWidth = 1;
  g.stroke();

  // The label: matte, darker, engraved.
  const label = g.createRadialGradient(0, 0, 0, 0, 0, VOYAGER_LABEL * R);
  label.addColorStop(0, '#a5803a');
  label.addColorStop(1, '#8c6a29');
  circle(g, VOYAGER_LABEL * R);
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

// ── Her record ──────────────────────────────────────────────────────────────

/** What the grooves of her disc carry: nothing yet, plain grooves, or her sound. */
export type Grooves = { readonly kind: 'blank' } | { readonly kind: 'plain' } | { readonly kind: 'sound'; readonly id: SoundId };

/** The grooves of a design: blank until the disc is created. */
export function groovesOf(design: DiscDesign): Grooves {
  if (design.engraving === null) return { kind: 'blank' };
  return design.sound ? { kind: 'sound', id: design.sound } : { kind: 'plain' };
}

export function sameGrooves(a: Grooves, b: Grooves): boolean {
  return a.kind === b.kind && (a.kind !== 'sound' || (b.kind === 'sound' && a.id === b.id));
}

/** The distance between two grooves, in pixels. */
function grooveStep(size: number): number {
  return Math.max(1.6, size / 520);
}

/**
 * Where the needle is at `progress` (0 to 1) of the sound, as a fraction of the radius: the
 * outermost groove is the first moment, the innermost the last.
 */
export function needleRadius(progress: number): number {
  const p = Math.max(0, Math.min(1, progress));
  return HERS.groovesOuter - p * (HERS.groovesOuter - HERS.leadOut);
}

/** The metal and the grooves of her disc (the label too, matte and empty). */
export function paintHerBase(size: number, grooves: Grooves): HTMLCanvasElement {
  const { canvas, g } = canvasOf(size);
  if (!g) return canvas;
  const random = seeded(2026);
  const R = radiusFor(size);
  const step = grooveStep(size);
  const outer = HERS.groovesOuter * R;
  const inner = HERS.leadOut * R;

  circle(g, R);
  g.fillStyle = '#c9a04a';
  g.fill();

  if (grooves.kind === 'blank') {
    // Not cut yet: polished metal, with the faintest rings of the polish.
    g.lineWidth = Math.max(0.6, step * 0.3);
    for (let r = inner; r < outer; r += step * 3.3) {
      g.strokeStyle = `rgba(255, 240, 196, ${(0.035 + 0.03 * random()).toFixed(3)})`;
      circle(g, r);
      g.stroke();
    }
    annulus(g, inner, outer, 'rgba(255, 236, 180, 0.05)');
  } else {
    const rings = Math.max(1, Math.floor((outer - inner) / step));
    // One groove for each slice of the sound, from the edge inwards.
    const loudness = grooves.kind === 'sound' ? envelope(grooves.id, rings) : null;
    g.lineWidth = step * 0.42;
    for (let k = 0; k < rings; k++) {
      const r = outer - (k + 0.5) * step;
      const f = r / R;
      const loud = loudness ? (loudness[k] ?? 0) : 0.5 + 0.5 * Math.sin(f * 173) * Math.sin(f * 41 + 1.3);
      if (loudness && loud > 0.02) {
        // A loud passage: the grooves are wider and wavier there, and catch more light.
        annulus(g, r - step * 0.5, r + step * 0.5, `rgba(255, 238, 180, ${(0.16 * loud).toFixed(3)})`);
      }
      const light = loudness ? 0.06 + 0.34 * loud : 0.1 + 0.18 * loud;
      const dark = loudness ? 0.1 + 0.24 * (1 - loud) : 0.12 + 0.16 * (1 - loud);
      g.strokeStyle = `rgba(255, 236, 170, ${light.toFixed(3)})`;
      circle(g, r);
      g.stroke();
      g.strokeStyle = `rgba(88, 60, 14, ${dark.toFixed(3)})`;
      circle(g, r + step * 0.5);
      g.stroke();
    }
    const swirl = conic(g, () => 0.11 * random(), '70, 46, 10');
    if (swirl) annulus(g, inner, outer, swirl);
    g.lineCap = 'round';
    for (let i = 0; i < 160; i++) {
      const r = inner + (outer - inner) * random();
      const start = random() * TAU;
      g.strokeStyle = `rgba(255, 240, 190, ${(0.1 + 0.24 * random()).toFixed(3)})`;
      g.lineWidth = step * (0.3 + 0.4 * random());
      g.beginPath();
      g.arc(0, 0, r, start, start + (0.02 + 0.1 * random()));
      g.stroke();
    }
  }

  // The smooth lead-out around the label, the smooth band of the message, the lip.
  annulus(g, HERS.label * R, inner, 'rgba(255, 232, 170, 0.1)');
  annulus(g, outer, R, 'rgba(255, 240, 196, 0.1)');
  g.lineWidth = Math.max(1, size / 900);
  for (const r of [outer, HERS.lip * R]) {
    circle(g, r);
    g.strokeStyle = 'rgba(110, 80, 26, 0.45)';
    g.stroke();
  }
  circle(g, R - 0.5);
  g.strokeStyle = 'rgba(70, 46, 10, 0.7)';
  g.lineWidth = 1;
  g.stroke();

  // The label: matte and darker, ready for her picture.
  const label = g.createRadialGradient(0, 0, 0, 0, 0, HERS.label * R);
  label.addColorStop(0, '#a98440');
  label.addColorStop(1, '#8e6c2b');
  circle(g, HERS.label * R);
  g.fillStyle = label;
  g.fill();
  g.lineWidth = Math.max(1, size / 700);
  for (const f of [0.385, 0.37]) {
    circle(g, f * R);
    g.strokeStyle = 'rgba(255, 228, 160, 0.3)';
    g.stroke();
  }
  return canvas;
}

/** Colours of an engraving: the light edge of the cut, and its shadow. */
const INK = 'rgba(255, 234, 178, 0.86)';
const INK_FAINT = 'rgba(255, 234, 178, 0.5)';
const SHADOW = 'rgba(48, 30, 4, 0.6)';
const SHADOW_FAINT = 'rgba(48, 30, 4, 0.36)';

/** Her picture, engraved in the middle of the label. */
export function paintPicture(size: number, id: PictureId | null): HTMLCanvasElement | null {
  if (!id) return null;
  const { canvas, g } = canvasOf(size);
  if (!g || typeof Path2D !== 'function') return canvas;
  const R = radiusFor(size);
  const scale = (2 * HERS.picture * R) / 100;
  const line = Math.max(1.1, 0.0072 * R);
  const offset = Math.max(0.6, size / 900);
  const picture = PICTURES[id];
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (const [dx, strong, faint] of [
    [offset, SHADOW, SHADOW_FAINT],
    [0, INK, INK_FAINT],
  ] as const) {
    g.save();
    g.translate(dx, dx);
    g.scale(scale, scale);
    g.translate(-50, -50);
    for (const stroke of picture.strokes) {
      g.strokeStyle = stroke.faint ? faint : strong;
      g.lineWidth = (stroke.weight * line) / scale;
      g.stroke(new Path2D(stroke.d));
    }
    g.fillStyle = strong;
    for (const fill of picture.fills) g.fill(new Path2D(fill));
    g.restore();
  }
  return canvas;
}

interface Glyph {
  readonly text: string;
  readonly width: number;
}

function glyphs(g: CanvasRenderingContext2D, text: string, spacing: number): { list: Glyph[]; length: number } {
  const list = characters(text).map((ch) => ({ text: ch, width: g.measureText(ch).width + spacing }));
  return { list, length: list.reduce((sum, glyph) => sum + glyph.width, 0) - spacing };
}

/** An arc of text: where it starts and where it ends, in radians (the direction it reads). */
export interface TextArc {
  readonly from: number;
  readonly to: number;
}

/**
 * Writes `text` along a circle of radius `r` centred on (0, 0), centred on the top (reading
 * clockwise, letters standing out from the centre) or on the bottom (reading left to right,
 * letters standing towards the centre). Returns the arc it covers.
 */
function writeArc(g: CanvasRenderingContext2D, list: readonly Glyph[], length: number, r: number, where: 'top' | 'bottom'): TextArc {
  const top = where === 'top';
  const sign = top ? 1 : -1;
  const from = top ? -Math.PI / 2 - length / (2 * r) : Math.PI / 2 + length / (2 * r);
  let a = from;
  for (const glyph of list) {
    const mid = a + (sign * glyph.width) / 2 / r;
    g.save();
    g.translate(r * Math.cos(mid), r * Math.sin(mid));
    g.rotate(top ? mid + Math.PI / 2 : mid - Math.PI / 2);
    g.fillText(glyph.text, 0, 0);
    g.restore();
    a += (sign * glyph.width) / r;
  }
  return { from, to: from + (sign * length) / r };
}

/** The gold of engraved letters. */
const LETTER_INK = '#f3dca6';

/**
 * Engraved text: drawn once in the gold of the ink, then tinted with that gold (so an emoji
 * keeps its shading but turns to gold), then laid twice, shadow and edge.
 */
function engraveText(size: number, offset: number, write: (g: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const { canvas: shape, g: s } = canvasOf(size);
  const { canvas, g } = canvasOf(size);
  if (!s || !g) return canvas;
  s.fillStyle = LETTER_INK;
  write(s);
  // The gold version: the hue of the ink on whatever was drawn, then cut back to its shape.
  const { canvas: gold, g: k } = canvasOf(size);
  if (!k) return canvas;
  k.setTransform(1, 0, 0, 1, 0, 0);
  k.drawImage(shape, 0, 0);
  k.globalCompositeOperation = 'color';
  k.fillStyle = LETTER_INK;
  k.fillRect(0, 0, size, size);
  k.globalCompositeOperation = 'destination-in';
  k.drawImage(shape, 0, 0);
  // The shadow: the same shape, dark.
  s.setTransform(1, 0, 0, 1, 0, 0);
  s.globalCompositeOperation = 'source-in';
  s.fillStyle = SHADOW;
  s.fillRect(0, 0, size, size);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.drawImage(shape, offset, offset);
  g.globalAlpha = 0.86;
  g.drawImage(gold, 0, 0);
  return canvas;
}

export interface EngravingLayer {
  readonly canvas: HTMLCanvasElement;
  /** The arcs of its two lines, in the order they are read. */
  readonly arcs: readonly TextArc[];
}

/** The baseline of the top line of the engraving (the bottom line stands on the same band). */
const ENGRAVING_RADIUS = 0.305;

/** The engraving on the label: up to the first « · » along the top, the rest along the bottom. */
export function paintEngraving(size: number, text: string | null): EngravingLayer | null {
  if (!text) return null;
  const R = radiusFor(size);
  const r = ENGRAVING_RADIUS * R;
  const { top, bottom } = splitEngraving(text);
  const arcs: TextArc[] = [];
  const canvas = engraveText(size, Math.max(0.6, size / 1000), (g) => {
    const fit = (line: string): { em: number; list: Glyph[]; length: number } => {
      // As large as the arc allows, never larger than the largest size.
      let em = 0.036 * R;
      g.font = `500 ${em}px ${FONT}`;
      let measured = glyphs(g, line, em * 0.07);
      const room = r * ((150 * Math.PI) / 180);
      if (measured.length > room) {
        em *= room / measured.length;
        g.font = `500 ${em}px ${FONT}`;
        measured = glyphs(g, line, em * 0.07);
      }
      return { em, ...measured };
    };
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    // Top: baseline inside, letters outwards. Bottom: baseline outside, letters inwards.
    const a = fit(top);
    arcs.push(writeArc(g, a.list, a.length, r, 'top'));
    if (bottom) {
      const b = fit(bottom);
      arcs.push(writeArc(g, b.list, b.length, r + b.em * 0.72, 'bottom'));
    }
  });
  return { canvas, arcs };
}

/**
 * Clips `g` (centred on the disc) to what has been written of the engraving at `progress`
 * (0 to 1): the arcs fill up one after the other, in the direction they are read.
 */
export function clipWritten(g: CanvasRenderingContext2D, size: number, arcs: readonly TextArc[], progress: number): void {
  const total = arcs.reduce((sum, arc) => sum + Math.abs(arc.to - arc.from), 0);
  let left = Math.max(0, Math.min(1, progress)) * total;
  const R = radiusFor(size);
  g.beginPath();
  for (const arc of arcs) {
    const span = Math.abs(arc.to - arc.from);
    const part = Math.min(span, left);
    left -= part;
    if (part <= 0) continue;
    const end = arc.from + Math.sign(arc.to - arc.from) * part;
    // A wedge from the centre out past the label, a hair wider at the start.
    g.moveTo(0, 0);
    g.arc(0, 0, HERS.label * R, arc.from - Math.sign(arc.to - arc.from) * 0.02, end, arc.to < arc.from);
    g.closePath();
  }
  g.clip();
}

/** Her message around the edge, centred on the top, reading clockwise. */
export function paintMessage(size: number, message: string): HTMLCanvasElement | null {
  const text = ringText(message);
  if (!text) return null;
  const R = radiusFor(size);
  const r = HERS.message * R;
  return engraveText(size, Math.max(0.6, size / 900), (g) => {
    let em = 0.05 * R;
    g.font = `500 ${em}px ${FONT}`;
    let measured = glyphs(g, text, em * 0.06);
    const room = r * TAU * 0.94;
    if (measured.length > room) {
      em *= room / measured.length;
      g.font = `500 ${em}px ${FONT}`;
      measured = glyphs(g, text, em * 0.06);
    }
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    writeArc(g, measured.list, measured.length, r, 'top');
  });
}

/** The hole in the middle of her disc, on top of everything. Centred on (0, 0). */
export function drawHole(g: CanvasRenderingContext2D, size: number): void {
  const R = radiusFor(size);
  g.beginPath();
  g.arc(0, 0, HERS.hole * R, 0, TAU);
  g.fillStyle = '#0b0805';
  g.fill();
  g.beginPath();
  g.arc(0, 0, HERS.hole * R + Math.max(1, size / 700), 0, TAU);
  g.lineWidth = Math.max(1, size / 700);
  g.strokeStyle = 'rgba(255, 228, 160, 0.35)';
  g.stroke();
}

/** The angle on the screen where the needle stands: to the right, where the light is softer. */
export const NEEDLE_ANGLE = (24 * Math.PI) / 180;

/** The needle at `radius` (a fraction of the disc), with the line of its arm out to the edge. Centred on (0, 0). */
export function drawNeedle(g: CanvasRenderingContext2D, size: number, radius: number, alpha = 1): void {
  const R = radiusFor(size);
  const x = Math.cos(NEEDLE_ANGLE) * radius * R;
  const y = Math.sin(NEEDLE_ANGLE) * radius * R;
  g.save();
  g.globalAlpha = alpha;
  g.globalCompositeOperation = 'lighter';
  g.strokeStyle = 'rgba(255, 236, 196, 0.32)';
  g.lineWidth = Math.max(1, size / 420);
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(Math.cos(NEEDLE_ANGLE) * R, Math.sin(NEEDLE_ANGLE) * R);
  g.stroke();
  const glow = g.createRadialGradient(x, y, 0, x, y, 0.07 * R);
  glow.addColorStop(0, 'rgba(255, 246, 220, 0.95)');
  glow.addColorStop(0.12, 'rgba(255, 222, 150, 0.7)');
  glow.addColorStop(0.45, 'rgba(255, 190, 90, 0.18)');
  glow.addColorStop(1, 'rgba(255, 180, 80, 0)');
  g.fillStyle = glow;
  g.fillRect(x - 0.07 * R, y - 0.07 * R, 0.14 * R, 0.14 * R);
  g.restore();
}

export interface HerLayers {
  base: HTMLCanvasElement;
  picture: HTMLCanvasElement | null;
  engraving: EngravingLayer | null;
  message: HTMLCanvasElement | null;
}

export function paintHerLayers(size: number, design: DiscDesign): HerLayers {
  return {
    base: paintHerBase(size, groovesOf(design)),
    picture: paintPicture(size, design.picture),
    engraving: paintEngraving(size, design.engraving),
    message: paintMessage(size, design.message),
  };
}

/** Lays the layers of her disc on `g`, centred on (0, 0), and the hole on top. */
export function composeHers(g: CanvasRenderingContext2D, size: number, layers: HerLayers): void {
  const c = size / 2;
  g.drawImage(layers.base, -c, -c);
  for (const layer of [layers.picture, layers.engraving?.canvas ?? null, layers.message]) if (layer) g.drawImage(layer, -c, -c);
  drawHole(g, size);
}
