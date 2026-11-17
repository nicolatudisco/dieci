/**
 * The zeros of Act II: `atomi` (a 1 followed by 80 zeros) and `googol` (100 zeros).
 *
 * One scene for both, because it is one number that grows: the zeros are written one after
 * the other while the journey comes near, in rows of ten so that they can be counted, and
 * the 80 of the atoms stay where they are while the 20 more of the googol are written
 * under them. Everything follows the position of the journey: going back, the zeros are
 * taken away again.
 *
 * At the end of each full row a small figure says how many zeros there are so far.
 * At the atoms, a dust of faint specks drifts behind the number («polvere di stelle»).
 */
import { nodeById } from '../engine/journey.ts';
import type { LevelDef, LevelFactory, LevelFrame } from '../engine/level.ts';
import { CanvasLevel, DISPLAY_FONT, TAU, TEXT_FONT, hash, ramp, sceneRegion } from './canvas-level.ts';

const ATOMS = 80;
const GOOGOL = 100;
const PER_ROW = 10;

/** A zero takes this much of an em across, a row this much down. */
const CELL = 0.7;
const ROW = 1.16;
/** Columns of the block: the 1, ten zeros, and room for the small figure at the end of the row. */
const COLUMNS = 1 + PER_ROW + 0.95;
const MAX_SIZE = 112;

const INK = '#eef1ff';
const ZERO = '#b9c6f7';
const FIGURE = '#a3abcf';
const DUST = '#cfd8ff';
const DUST_BRIGHT = '#ffffff';

/** Zeros lit in a second by the light that runs along the number when it is complete. */
const SWEEP_PACE = 12;

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

/** A little past the mark and back: a stroke of the pen. */
function overshoot(t: number): number {
  const s = 1.6;
  const x = t - 1;
  return 1 + x * x * ((s + 1) * x + s);
}

class Zeros extends CanvasLevel {
  private readonly atoms: number;
  private readonly googol: number;

  constructor(def: LevelDef) {
    super(def);
    this.atoms = nodeById('atomi')?.u ?? def.range[0] + 1.1;
    this.googol = nodeById('googol')?.u ?? this.atoms + 2;
  }

  /** How many zeros are written at `u`; the fraction is the one being written. */
  private written(u: number): number {
    const first = ATOMS * clamp01((u - (this.atoms - 0.95)) / 0.87);
    const more = (GOOGOL - ATOMS) * clamp01((u - (this.googol - 0.8)) / 0.72);
    return first + more;
  }

  /** How many rows the block makes room for: the two of the googol open before they are written. */
  private rows(u: number): number {
    return ATOMS / PER_ROW + ((GOOGOL - ATOMS) / PER_ROW) * ramp(this.googol - 1.25, this.googol - 0.7, u);
  }

  protected paint(g: CanvasRenderingContext2D, frame: LevelFrame, width: number, height: number, ratio: number): void {
    const { free, u, time } = frame;
    this.dust(g, frame, width, height);

    const rows = this.rows(u);
    const size = Math.min((free.width * 0.94) / (COLUMNS * CELL), (free.height * 0.9) / (rows * ROW), MAX_SIZE);
    const cell = size * CELL;
    const row = size * ROW;
    // The block is centred on the zeros and the 1: the small figures hang out on the right.
    const left = free.x + (free.width - (COLUMNS - 0.5) * cell) / 2;
    const top = free.y + (free.height - rows * row) / 2;

    const written = this.written(u);
    const whole = written >= ATOMS && written < ATOMS + 0.001 ? ATOMS : written >= GOOGOL ? GOOGOL : 0;
    // When the number is complete a light runs along it, zero by zero, as if counting.
    const sweep = whole > 0 ? ((time * SWEEP_PACE) % (whole + 44)) - 22 : -99;

    g.font = `360 100px ${DISPLAY_FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const k = (size / 100) * ratio;
    const glyph = (text: string, x: number, y: number, scale: number, alpha: number, color: string): void => {
      if (alpha < 0.01) return;
      g.setTransform(k * scale, 0, 0, k * scale, x * ratio, y * ratio);
      g.globalAlpha = Math.min(1, alpha);
      g.fillStyle = color;
      g.fillText(text, 0, 0);
    };

    // The 1 comes first, alone.
    const one = ramp(this.atoms - 1.08, this.atoms - 0.96, u);
    glyph('1', left + cell / 2, top + row / 2, 0.8 + 0.2 * one, one, INK);

    const count = Math.min(GOOGOL, Math.ceil(written));
    for (let i = 0; i < count; i++) {
      const x = left + (1.5 + (i % PER_ROW)) * cell;
      const y = top + (Math.floor(i / PER_ROW) + 0.5) * row;
      const drawn = clamp01(written - i);
      // The last ones written are still bright, like wet ink.
      const fresh = whole > 0 ? 0 : clamp01(1 - (written - i) / 5);
      const lit = Math.exp(-(((i - sweep) / 1.7) ** 2));
      const bright = Math.max(fresh, lit);
      glyph('0', x, y, 0.72 + 0.28 * overshoot(drawn), drawn * (0.8 + 0.2 * bright), bright > 0.5 ? INK : ZERO);
    }

    // How many so far: one small figure at the end of each full row, in the typeface of the
    // texts (its figures stand on the line; the old-style ones of Fraunces read badly so small).
    const figure = Math.max(10, size * 0.25);
    g.font = `400 ${figure.toFixed(1)}px ${TEXT_FONT}`;
    g.textAlign = 'left';
    g.setTransform(ratio, 0, 0, ratio, 0, 0);
    g.fillStyle = FIGURE;
    for (let r = 1; r * PER_ROW <= GOOGOL; r++) {
      const full = clamp01(written - r * PER_ROW + 1);
      if (full < 0.01) continue;
      g.globalAlpha = 0.7 * full;
      g.fillText(String(r * PER_ROW), left + (1 + PER_ROW + 0.2) * cell, top + (r - 0.5) * row + size * 0.03);
    }
    g.setTransform(ratio, 0, 0, ratio, 0, 0);
    g.globalAlpha = 1;
  }

  /** At the atoms: specks of dust behind the number, almost still. */
  private dust(g: CanvasRenderingContext2D, frame: LevelFrame, width: number, height: number): void {
    const amount = ramp(this.atoms - 0.9, this.atoms - 0.2, frame.u) * (1 - ramp(this.atoms + 0.35, this.atoms + 1.1, frame.u));
    if (amount < 0.01) return;
    const region = sceneRegion(frame.free, width, height);
    const w = region.right - region.left;
    const h = region.bottom - region.top;
    const drift = this.ctx?.reducedMotion ? 0 : frame.time;
    const count = Math.round(Math.min(340, (w * h) / 3200) * (0.4 + 0.6 * frame.quality));
    for (let i = 0; i < count; i++) {
      const speed = 1.5 + 4 * hash(i, 3);
      const x = region.left + ((hash(i, 1) * w + drift * speed * 0.6) % w);
      const y = region.top + ((hash(i, 2) * h + h - ((drift * speed) % h)) % h);
      const twinkle = 0.5 + 0.5 * Math.sin(TAU * (frame.time / (5 + 6 * hash(i, 4)) + hash(i, 5)));
      const r = 0.5 + 0.9 * hash(i, 6) ** 2;
      g.globalAlpha = amount * region.fade(x, y, 28) * (0.1 + 0.34 * twinkle * twinkle);
      g.fillStyle = hash(i, 7) > 0.86 ? DUST_BRIGHT : DUST;
      g.beginPath();
      g.arc(x, y, r, 0, TAU);
      g.fill();
    }
    g.globalAlpha = 1;
  }
}

const zeros: LevelFactory = (def) => new Zeros(def);
export default zeros;
