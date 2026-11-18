/**
 * The zeros of Act II: `atomi` (a 1 followed by 80 zeros), `googol` (100 zeros) and
 * `googolplex` (a googol of zeros), then the light that leads to the finale.
 *
 * One scene for the three stops, because it is one number that grows. Everything follows
 * the position of the journey, so going back undoes it.
 *
 * - Atoms and googol: the zeros are written one after the other in rows of ten, so that
 *   they can be counted; at the end of each full row a small figure says how many there
 *   are so far. The 80 of the atoms stay where they are while the 20 more of the googol
 *   are written under them. At the atoms a dust of faint specks drifts behind the number.
 * - Towards the googolplex: the block of a hundred zeros shrinks into the top-left corner
 *   and the zeros spill out of it, until they fill everything there is to fill. The block
 *   was only the beginning of the number.
 * - At the googolplex: a wall of zeros that keeps running upwards, slowly. Nobody could
 *   write them all.
 * - Towards the finale: the zeros run faster and faster, stretch into streaks, turn into a
 *   warm light that fills the screen; then the light gathers into one point, the warm dot.
 *
 * The block and the wall share one grid (the same cell, on whole device pixels), so the
 * hundred zeros written one by one become the first cells of the wall without a jump.
 */
import { FINALE, nodeById } from '../engine/journey.ts';
import type { LevelDef, LevelFactory, LevelFrame } from '../engine/level.ts';
import { CanvasLevel, DISPLAY_FONT, TAU, TEXT_FONT, hash, ramp, sceneRegion, type Region } from './canvas-level.ts';

const ATOMS = 80;
const GOOGOL = 100;
const PER_ROW = 10;

/** A zero takes this much of an em across, a row this much down. */
const CELL = 0.7;
const ROW = 1.16;
/** Columns of the block: the 1, ten zeros, and room for the small figure at the end of the row. */
const COLUMNS = 1 + PER_ROW + 0.95;
const MAX_SIZE = 112;

type Rgb = readonly [number, number, number];
const INK = '#eef1ff';
const ZERO: Rgb = [185, 198, 247];
const ZERO_HOT: Rgb = [255, 244, 214];
const FIGURE = '#a3abcf';
const DUST = '#cfd8ff';
const DUST_BRIGHT = '#ffffff';

/** Zeros lit in a second by the light that runs along the number when it is complete. */
const SWEEP_PACE = 12;
/** CSS pixels a second the wall runs upwards: at rest on the googolplex, and at full rush. */
const WALL_PACE = 13;
const RUSH_PACE = 2600;

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

/** A little past the mark and back: a stroke of the pen. */
function overshoot(t: number): number {
  const s = 1.6;
  const x = t - 1;
  return 1 + x * x * ((s + 1) * x + s);
}

function rgb(from: Rgb, to: Rgb, t: number, alpha = 1): string {
  const c = from.map((v, i) => Math.round(v + ((to[i] ?? v) - v) * t));
  return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`;
}

class Zeros extends CanvasLevel {
  private readonly atoms: number;
  private readonly googol: number;
  private readonly plex: number;
  private readonly finale = FINALE.u;
  /** How many rows the wall has run upwards. */
  private run = 0;
  /** One cell of the wall with its zero: the wall is this tile, repeated. */
  private readonly tile = document.createElement('canvas');
  private tileKey = '';
  private pattern: CanvasPattern | null = null;
  /** The same tile seen in a rush: see `streakTile`. */
  private readonly streak = document.createElement('canvas');
  private streakKey = '';
  private streaks: CanvasPattern | null = null;
  private profile: number[] = [];
  private profileKey = '';

  constructor(def: LevelDef) {
    super(def);
    this.atoms = nodeById('atomi')?.u ?? def.range[0] + 1.1;
    this.googol = nodeById('googol')?.u ?? this.atoms + 2;
    this.plex = nodeById('googolplex')?.u ?? this.googol + 2;
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

  /** 0 at the googol, 1 when the block has become the corner of the wall. */
  private pull(u: number): number {
    return clamp01((u - (this.googol + 0.35)) / (this.plex - 0.45 - (this.googol + 0.35)));
  }

  /** 0 at the googolplex, 1 when the zeros are a torrent. */
  private rush(u: number): number {
    return ramp(this.plex + 0.15, this.plex + 1.3, u);
  }

  protected paint(g: CanvasRenderingContext2D, frame: LevelFrame, width: number, height: number, ratio: number): void {
    const { free, u, time } = frame;
    const region = sceneRegion(free, width, height);
    this.dust(g, frame, region);

    // ── The grid: from the block of the googol to the wall of the googolplex.
    const rows = this.rows(u);
    const blockSize = Math.min((free.width * 0.94) / (COLUMNS * CELL), (free.height * 0.9) / (rows * ROW), MAX_SIZE);
    const wallSize = Math.min(24, Math.max(16, (region.right - region.left) / 37));
    const pull = this.pull(u);
    const eased = pull * pull * (3 - 2 * pull);
    const size = blockSize * (wallSize / blockSize) ** eased;
    // Cells on whole device pixels: the tile of the wall repeats without seams.
    const cell = Math.max(2, Math.round(size * CELL * ratio)) / ratio;
    const row = Math.max(2, Math.round(size * ROW * ratio)) / ratio;
    // The block is centred on the zeros and the 1 (the small figures hang out on the right);
    // the wall starts at the top-left corner of what can be seen.
    const blockLeft = free.x + (free.width - (COLUMNS - 0.5) * cell) / 2;
    const blockTop = free.y + (free.height - rows * row) / 2;
    const wallLeft = region.left + (region.bounded.left ? 10 : 0.9 * cell);
    const wallTop = region.top + (region.bounded.top ? 8 : 0.6 * row);
    const left = Math.round((blockLeft + (wallLeft - blockLeft) * eased) * ratio) / ratio;
    const top = Math.round((blockTop + (wallTop - blockTop) * eased) * ratio) / ratio;

    // ── The wall runs: slowly at the googolplex, a torrent on the way to the finale.
    const rush = this.rush(u);
    const stretch = 1 + 3 * rush * rush;
    // A frame with no time in it is the engine warming the level up: it must not move the wall.
    if (frame.dt > 0) {
      if (u < this.plex - 0.7) this.run = 0;
      else if (u > this.plex - 0.3) {
        const pace = (this.ctx?.reducedMotion ? 0 : WALL_PACE) + RUSH_PACE * rush * rush;
        this.run += (pace * frame.dt) / (row * stretch);
      }
    }
    const run = this.run * ramp(this.plex - 0.6, this.plex - 0.25, u);
    // The 1 is there until its row has run away, or until the zeros are only streaks.
    const first = Math.floor(run) === 0 && rush < 0.35;

    // The hundred zeros written one by one hand over to the wall, which has them too.
    const handover = ramp(0.08, 0.3, pull);
    if (handover > 0) {
      this.wall(g, frame, region, width, height, ratio, { size, cell, row, left, top, pull, rush, stretch, run });
      // Where the 1 is, the wall has no zero.
      if (first) {
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.clearRect(Math.round(left * ratio), Math.round((top - run * row * stretch) * ratio), Math.round(cell * ratio), Math.round(row * ratio));
      }
    }

    // ── The 1 and the zeros written one by one.
    const written = this.written(u);
    const whole = written >= ATOMS && written < ATOMS + 0.001 ? ATOMS : written >= GOOGOL && pull === 0 ? GOOGOL : 0;
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

    // The 1 comes first, alone; it leaves with the first row of the wall.
    const one = ramp(this.atoms - 1.08, this.atoms - 0.96, u);
    if (first) glyph('1', left + cell / 2, top + (0.5 - run * stretch) * row, 0.8 + 0.2 * one, one * (1 - ramp(0.1, 0.35, rush)), INK);

    if (handover < 1) {
      const zero = rgb(ZERO, ZERO, 0);
      const count = Math.min(GOOGOL, Math.ceil(written));
      for (let i = 0; i < count; i++) {
        const x = left + (1.5 + (i % PER_ROW)) * cell;
        const y = top + (Math.floor(i / PER_ROW) + 0.5) * row;
        const drawn = clamp01(written - i);
        // The last ones written are still bright, like wet ink.
        const fresh = whole > 0 || pull > 0 ? 0 : clamp01(1 - (written - i) / 5);
        const lit = Math.exp(-(((i - sweep) / 1.7) ** 2));
        const bright = Math.max(fresh, lit);
        glyph('0', x, y, 0.72 + 0.28 * overshoot(drawn), (1 - handover) * drawn * (0.8 + 0.2 * bright), bright > 0.5 ? INK : zero);
      }
    }

    // How many so far: one small figure at the end of each full row, in the typeface of the
    // texts (its figures stand on the line; the old-style ones of Fraunces read badly so small).
    const figures = 1 - ramp(0, 0.1, pull);
    if (figures > 0.01) {
      const figure = Math.max(10, size * 0.25);
      g.font = `400 ${figure.toFixed(1)}px ${TEXT_FONT}`;
      g.textAlign = 'left';
      g.setTransform(ratio, 0, 0, ratio, 0, 0);
      g.fillStyle = FIGURE;
      for (let r = 1; r * PER_ROW <= GOOGOL; r++) {
        const full = clamp01(written - r * PER_ROW + 1);
        if (full < 0.01) continue;
        g.globalAlpha = 0.7 * full * figures;
        g.fillText(String(r * PER_ROW), left + (1 + PER_ROW + 0.2) * cell, top + (r - 0.5) * row + size * 0.03);
      }
    }
    g.setTransform(ratio, 0, 0, ratio, 0, 0);
    g.globalAlpha = 1;

    this.light(g, frame, width, height);
  }

  /** The wall of zeros: one tile repeated from its first cell, to the right and downwards. */
  private wall(
    g: CanvasRenderingContext2D,
    frame: LevelFrame,
    region: Region,
    width: number,
    height: number,
    ratio: number,
    at: { size: number; cell: number; row: number; left: number; top: number; pull: number; rush: number; stretch: number; run: number },
  ): void {
    const { u } = frame;
    const W = width * ratio;
    const H = height * ratio;
    const cellPx = Math.round(at.cell * ratio);
    const rowPx = Math.round(at.row * ratio);
    // The zeros warm up as they rush, and vanish into the light before it gathers.
    const heat = ramp(0.12, 0.6, at.rush);
    const color = rgb(ZERO, ZERO_HOT, heat);
    const pattern = this.zeroTile(g, cellPx, rowPx, at.size * ratio, color);
    if (!pattern) return;
    const strength = ramp(0.08, 0.3, at.pull) * (0.9 - 0.3 * ramp(0.3, 1, at.pull) + 0.35 * heat) * (1 - ramp(this.finale - 0.78, this.finale - 0.64, u));
    if (strength < 0.005) return;

    // The interface gives the whole screen back while the zeros become light.
    const open = ramp(this.plex + 0.55, this.plex + 0.92, u);
    const tall = rowPx * at.stretch;
    const whole = Math.floor(at.run);
    // Rows that have run past the top exist: as many of them as fit above the first row.
    const above = Math.min(whole, Math.ceil((at.top * ratio) / tall) + 1);
    const x = Math.round(at.left * ratio);
    const y = at.top * ratio - (at.run - whole + above) * tall;
    // Past the first row there is nothing; once it has run away, rows come from above.
    const from = whole > 0 ? -2 * rowPx : 0;
    // While the counter and the caption are there, nothing is drawn behind them: the wall is
    // painted only where it can be seen, and a band around it for the soft edge.
    const soft = 36 * ratio;
    const { free } = frame;
    const visible =
      open > 0
        ? { x0: 0, y0: 0, x1: W, y1: H }
        : {
            x0: region.bounded.left ? Math.max(0, free.x * ratio - 2) : 0,
            y0: region.bounded.top ? Math.max(0, free.y * ratio - 2) : 0,
            x1: region.bounded.right ? Math.min(W, (free.x + free.width) * ratio + 2) : W,
            y1: region.bounded.bottom ? Math.min(H, (free.y + free.height) * ratio + 2) : H,
          };
    // Too fast to be read, the zeros blur into what a zero leaves behind when it runs: two
    // lines of light, one for each of its sides.
    const blur = ramp(0.2, 0.7, at.rush);
    if (blur < 1) {
      const fromX = Math.max(x, visible.x0);
      const fromY = Math.max(y + from * at.stretch, visible.y0);
      g.setTransform(1, 0, 0, at.stretch, x, y);
      g.globalAlpha = Math.min(1, strength) * (1 - blur);
      g.fillStyle = pattern;
      g.fillRect(fromX - x, (fromY - y) / at.stretch, visible.x1 - fromX, (visible.y1 - fromY) / at.stretch);
    }
    const streaks = blur > 0 ? this.streakTile(g, color) : null;
    if (streaks) {
      g.setTransform(1, 0, 0, 1, x, 0);
      g.globalAlpha = Math.min(1, strength * blur * 1.25);
      g.fillStyle = streaks;
      g.fillRect(0, 0, W - x, H);
      // The streaks are not even: waves of brighter light run up along them.
      const period = 0.3 * H;
      const count = Math.ceil(H / period) + 3;
      const shift = (frame.time * 1.1 * H) % (2 * period);
      const waves = g.createLinearGradient(0, -shift, 0, count * period - shift);
      for (let i = 0; i <= count; i++) waves.addColorStop(i / count, `rgba(0, 0, 0, ${i % 2 === 0 ? 1 : 1 - 0.55 * blur})`);
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'destination-in';
      g.fillStyle = waves;
      g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'source-over';
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'destination-in';

    // The zeros spill out of the block: only what the wave has reached is written.
    const spill = clamp01((at.pull - 0.1) / 0.72);
    if (spill < 1) {
      const cx = (at.left + (1 + PER_ROW / 2) * at.cell) * ratio;
      const cy = (at.top + (GOOGOL / PER_ROW / 2) * at.row) * ratio;
      const from = 0.54 * Math.hypot((PER_ROW + 1) * cellPx, (GOOGOL / PER_ROW) * rowPx);
      const reach = from * ((1.25 * Math.hypot(W, H)) / from) ** spill;
      const wave = g.createRadialGradient(cx, cy, reach * 0.8, cx, cy, reach);
      wave.addColorStop(0, 'rgba(0, 0, 0, 1)');
      wave.addColorStop(1, 'rgba(0, 0, 0, 0)');
      g.fillStyle = wave;
      g.fillRect(0, 0, W, H);
    }
    g.globalCompositeOperation = 'source-over';
    // Nothing behind the counter or the caption, until they leave: a soft band along each
    // edge of the free area, and beyond it the wall only as strong as `open`. Erasing only
    // there (destination-out) is the same as dimming the whole canvas, at a fraction of the cost.
    if (open < 1) {
      const erase = 1 - open;
      g.globalCompositeOperation = 'destination-out';
      const band = (x0: number, y0: number, x1: number, y1: number, rect: [number, number, number, number]): void => {
        const fade = g.createLinearGradient(x0, y0, x1, y1);
        fade.addColorStop(0, 'rgba(0, 0, 0, 0)');
        fade.addColorStop(1, `rgba(0, 0, 0, ${erase})`);
        g.fillStyle = fade;
        g.fillRect(...rect);
      };
      const beyond = (rx: number, ry: number, rw: number, rh: number): void => {
        if (rw <= 0 || rh <= 0) return;
        if (erase >= 0.999) g.clearRect(rx, ry, rw, rh);
        else {
          g.fillStyle = `rgba(0, 0, 0, ${erase})`;
          g.fillRect(rx, ry, rw, rh);
        }
      };
      // On whole pixels, so that the band and what lies beyond it meet without a seam.
      const fx0 = Math.round(free.x * ratio);
      const fx1 = Math.round((free.x + free.width) * ratio);
      const fy0 = Math.round(free.y * ratio);
      const fy1 = Math.round((free.y + free.height) * ratio);
      if (region.bounded.left) {
        band(fx0 + soft, 0, fx0, 0, [fx0, 0, soft, H]);
        beyond(0, 0, fx0, H);
      }
      if (region.bounded.right) {
        band(fx1 - soft, 0, fx1, 0, [fx1 - soft, 0, soft, H]);
        beyond(fx1, 0, W - fx1, H);
      }
      if (region.bounded.top) {
        band(0, fy0 + soft, 0, fy0, [0, fy0, W, soft]);
        beyond(0, 0, W, fy0);
      }
      if (region.bounded.bottom) {
        band(0, fy1 - soft, 0, fy1, [0, fy1 - soft, W, soft]);
        beyond(0, fy1, W, H - fy1);
      }
      g.globalCompositeOperation = 'source-over';
    }
  }

  private zeroTile(g: CanvasRenderingContext2D, cellPx: number, rowPx: number, fontPx: number, color: string): CanvasPattern | null {
    const key = `${cellPx}×${rowPx}/${fontPx.toFixed(1)}/${color}`;
    if (key !== this.tileKey) {
      this.tileKey = key;
      this.tile.width = cellPx;
      this.tile.height = rowPx;
      // An ordinary canvas (not «willReadFrequently»): the pattern made from it stays on the
      // graphics card. The streaks read its pixels from a copy (`streakTile`).
      const t = this.tile.getContext('2d');
      if (!t) return null;
      t.font = `360 ${fontPx.toFixed(2)}px ${DISPLAY_FONT}`;
      t.textAlign = 'center';
      t.textBaseline = 'middle';
      t.fillStyle = color;
      t.fillText('0', cellPx / 2, rowPx / 2);
      this.pattern = g.createPattern(this.tile, 'repeat');
      this.streakKey = '';
    }
    return this.pattern;
  }

  /**
   * What the tile of the wall looks like when it runs too fast to be seen: one pixel high,
   * each column as bright as the zero is, on average, along that column.
   */
  private streakTile(g: CanvasRenderingContext2D, color: string): CanvasPattern | null {
    const { width, height } = this.tile;
    const shape = `${width}×${height}`;
    if (shape !== this.profileKey) {
      if (width === 0 || height === 0) return null;
      const copy = document.createElement('canvas');
      copy.width = width;
      copy.height = height;
      const t = copy.getContext('2d', { willReadFrequently: true });
      if (!t) return null;
      t.drawImage(this.tile, 0, 0);
      const data = t.getImageData(0, 0, width, height).data;
      this.profile = Array.from({ length: width }, (_, x) => {
        let sum = 0;
        for (let y = 0; y < height; y++) sum += data[(y * width + x) * 4 + 3] ?? 0;
        return sum / (255 * height);
      });
      this.profileKey = shape;
      this.streakKey = '';
    }
    const key = `${shape}/${color}`;
    if (key !== this.streakKey) {
      this.streakKey = key;
      this.streak.width = width;
      this.streak.height = 1;
      const t = this.streak.getContext('2d');
      if (!t) return null;
      t.fillStyle = color;
      this.profile.forEach((level, x) => {
        t.globalAlpha = Math.min(1, level * 1.9);
        t.fillRect(x, 0, 1, 1);
      });
      this.streaks = g.createPattern(this.streak, 'repeat');
    }
    return this.streaks;
  }

  /**
   * The light the zeros turn into. It is one ball of warm light around the warm dot: so
   * large at first that the screen sees only its heart, then it gathers into the dot.
   */
  private light(g: CanvasRenderingContext2D, frame: LevelFrame, width: number, height: number): void {
    const { free, u } = frame;
    const lit = ramp(this.plex + 0.55, this.plex + 1.3, u);
    if (lit < 0.004) return;
    const cx = free.x + free.width / 2;
    const cy = free.y + free.height / 2;
    const far = Math.hypot(Math.max(cx, width - cx), Math.max(cy, height - cy));
    const gather = ramp(this.finale - 0.62, this.finale - 0.1, u);
    const radius = 1.7 * far * (6 / (1.7 * far)) ** gather;
    const ball = g.createRadialGradient(cx, cy, 0, cx, cy, radius);
    ball.addColorStop(0, 'rgba(255, 251, 240, 1)');
    ball.addColorStop(0.28, 'rgba(255, 241, 206, 1)');
    ball.addColorStop(0.56, 'rgba(255, 221, 156, 0.96)');
    ball.addColorStop(0.8, 'rgba(255, 192, 104, 0.6)');
    ball.addColorStop(1, 'rgba(255, 170, 70, 0)');
    g.globalAlpha = lit;
    g.fillStyle = ball;
    g.fillRect(0, 0, width, height);
    g.globalAlpha = 1;
  }

  /** At the atoms: specks of dust behind the number, almost still. */
  private dust(g: CanvasRenderingContext2D, frame: LevelFrame, region: Region): void {
    const amount = ramp(this.atoms - 0.9, this.atoms - 0.2, frame.u) * (1 - ramp(this.atoms + 0.35, this.atoms + 1.1, frame.u));
    if (amount < 0.01) return;
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
