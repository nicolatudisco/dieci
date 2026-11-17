/**
 * The cosmic web of M5, from Laniakea to the edge of the observable universe: one web at every
 * scale, made the way the real one formed. Pure: no three.js, no DOM (tests/cosmic-web.test.ts).
 *
 * - A Gaussian random field on a periodic tile 10 billion light-years wide (512 × 512 cells of
 *   about 19.5 million light-years), with no structure larger than about a billion
 *   light-years: beyond that the universe looks the same everywhere, so the tile can repeat
 *   without the repetition being seen.
 * - The Zel'dovich approximation: every bit of matter slides from where it started along the
 *   slope of the potential, x = q − D ∇φ(q). Where the slides cross, matter piles up into
 *   walls, filaments and knots, around empty voids: the web. Each point drawn is a galaxy.
 * - Laniakea is a basin of attraction of the smoothed potential: the region whose matter all
 *   flows towards the same minimum, the Great Attractor. That is the very definition of
 *   Tully et al. (2014, Nature 513, 71); its edge is the watershed where flows part. We are
 *   in one such basin, about 520 million light-years across, near its edge (WEB.us, found
 *   once with scripts/cosmic-web-search.mjs).
 *
 * Distances are in millions of light-years (Mly). «Tile» coordinates run over [0, tile)²;
 * «stage» coordinates are centred on us and turned so that the Great Attractor is at its true
 * longitude (about 307°, on screen 37°), like the rest of the stage.
 */
import { mulberry32 } from './levels/placeholder/primitives.ts';

export const WEB = {
  /** Side of the periodic tile, Mly, and cells per side. */
  tile: 10_000,
  grid: 512,
  /** Smallest structure, largest structure (Mly), and the slope of the spectrum of the density. */
  smooth: 14,
  largest: 900,
  index: -1.8,
  /** How far the slides have gone: the root mean square of D ∇²φ. */
  growth: 1.6,
  /** Smoothing of the potential whose basins are the superclusters, Mly. */
  flowSmooth: 60,
  /**
   * Found with scripts/cosmic-web-search.mjs: the seed, the cell where our galaxy started, and
   * the centre of Laniakea seen from us on the stage (Mly; the stage anchor `laniakea`). Our
   * basin is 516 million light-years across, we are 29 from its edge, the attractor is 257 away.
   */
  seed: 5,
  us: [221, 20] as readonly [number, number],
  centre: [103.5, 189.9] as readonly [number, number],
  /** Screen angle of the Great Attractor seen from us: longitude 307° → 90° + 307° (mod 360). */
  attractorAngle: 37,
} as const;

// ───────────────────────────────────────────────────────────────────────────── FFT

/** In-place radix-2 complex FFT of length n (a power of two), stride `step` from `offset`. */
function fft1(re: Float64Array, im: Float64Array, n: number, offset: number, step: number, inverse: boolean, bufRe: Float64Array, bufIm: Float64Array): void {
  for (let i = 0; i < n; i++) {
    bufRe[i] = re[offset + i * step]!;
    bufIm[i] = im[offset + i * step]!;
  }
  // Bit reversal.
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = bufRe[i]!;
      bufRe[i] = bufRe[j]!;
      bufRe[j] = tr;
      const ti = bufIm[i]!;
      bufIm[i] = bufIm[j]!;
      bufIm[j] = ti;
    }
  }
  for (let size = 2; size <= n; size <<= 1) {
    const half = size >> 1;
    const angle = ((inverse ? 2 : -2) * Math.PI) / size;
    const wr = Math.cos(angle);
    const wi = Math.sin(angle);
    for (let start = 0; start < n; start += size) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < half; k++) {
        const a = start + k;
        const b = a + half;
        const xr = bufRe[b]! * cr - bufIm[b]! * ci;
        const xi = bufRe[b]! * ci + bufIm[b]! * cr;
        bufRe[b] = bufRe[a]! - xr;
        bufIm[b] = bufIm[a]! - xi;
        bufRe[a] = bufRe[a]! + xr;
        bufIm[a] = bufIm[a]! + xi;
        const nr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = nr;
      }
    }
  }
  const scale = inverse ? 1 / n : 1;
  for (let i = 0; i < n; i++) {
    re[offset + i * step] = bufRe[i]! * scale;
    im[offset + i * step] = bufIm[i]! * scale;
  }
}

export function fft2(re: Float64Array, im: Float64Array, n: number, inverse: boolean): void {
  const bufRe = new Float64Array(n);
  const bufIm = new Float64Array(n);
  for (let row = 0; row < n; row++) fft1(re, im, n, row * n, 1, inverse, bufRe, bufIm);
  for (let col = 0; col < n; col++) fft1(re, im, n, col, n, inverse, bufRe, bufIm);
}

// ───────────────────────────────────────────────────────────────────────── the field

export interface Field {
  readonly n: number;
  /** Mly per cell. */
  readonly cell: number;
  readonly tile: number;
  /** The potential and its smoothed version, n × n. */
  readonly phi: Float32Array;
  readonly phiFlow: Float32Array;
  /** D ∇φ and D ∇φ_flow, in Mly: the slide of each cell (x = q − slide). */
  readonly slideX: Float32Array;
  readonly slideY: Float32Array;
  readonly flowX: Float32Array;
  readonly flowY: Float32Array;
  /** 1 / |det(I − D H)|: how many times denser than average the matter of each cell has become. */
  readonly density: Float32Array;
}

export interface FieldParams {
  readonly seed: number;
  readonly tile: number;
  readonly grid: number;
  readonly smooth: number;
  readonly largest: number;
  readonly index: number;
  readonly growth: number;
  readonly flowSmooth: number;
}

function gauss(random: () => number): number {
  return Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random());
}

export function makeField(params: FieldParams = WEB): Field {
  const { grid: n, tile } = params;
  const cell = tile / n;
  const random = mulberry32(params.seed);
  const re = new Float64Array(n * n);
  const im = new Float64Array(n * n);
  for (let i = 0; i < n * n; i++) re[i] = gauss(random);
  fft2(re, im, n, false);

  // Spectrum of the potential: P_φ = P_δ / k⁴, with P_δ ∝ k^index, cut below `smooth` and above `largest`.
  const kHigh = (2 * Math.PI) / params.largest;
  for (let j = 0; j < n; j++) {
    const ky = ((j <= n / 2 ? j : j - n) * 2 * Math.PI) / tile;
    for (let i = 0; i < n; i++) {
      const kx = ((i <= n / 2 ? i : i - n) * 2 * Math.PI) / tile;
      const k2 = kx * kx + ky * ky;
      const index = j * n + i;
      if (k2 === 0) {
        re[index] = 0;
        im[index] = 0;
        continue;
      }
      const k = Math.sqrt(k2);
      const highPass = 1 - Math.exp(-((k / kHigh) ** 4));
      const amplitude = (Math.sqrt(k ** params.index * Math.exp(-k2 * params.smooth * params.smooth)) * highPass) / k2;
      const flow = Math.exp(-0.5 * k2 * params.flowSmooth * params.flowSmooth);
      // Pack the two real fields in one transform: φ in the real part, φ_flow in the imaginary part.
      const ar = re[index]! * amplitude;
      const ai = im[index]! * amplitude;
      re[index] = ar - ai * flow;
      im[index] = ai + ar * flow;
    }
  }
  fft2(re, im, n, true);
  const phi = new Float32Array(n * n);
  const phiFlow = new Float32Array(n * n);
  for (let i = 0; i < n * n; i++) {
    phi[i] = re[i]!;
    phiFlow[i] = im[i]!;
  }

  const at = (f: Float32Array, i: number, j: number): number => f[((j + n) % n) * n + ((i + n) % n)]!;
  // The rms of ∇²φ sets D, so that the slides have gone as far as `growth` says.
  let sum = 0;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const lap = (at(phi, i + 1, j) + at(phi, i - 1, j) + at(phi, i, j + 1) + at(phi, i, j - 1) - 4 * at(phi, i, j)) / (cell * cell);
      sum += lap * lap;
    }
  }
  const D = params.growth / Math.sqrt(sum / (n * n));

  const slideX = new Float32Array(n * n);
  const slideY = new Float32Array(n * n);
  const flowX = new Float32Array(n * n);
  const flowY = new Float32Array(n * n);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const index = j * n + i;
      slideX[index] = (D * (at(phi, i + 1, j) - at(phi, i - 1, j))) / (2 * cell);
      slideY[index] = (D * (at(phi, i, j + 1) - at(phi, i, j - 1))) / (2 * cell);
      flowX[index] = (D * (at(phiFlow, i + 1, j) - at(phiFlow, i - 1, j))) / (2 * cell);
      flowY[index] = (D * (at(phiFlow, i, j + 1) - at(phiFlow, i, j - 1))) / (2 * cell);
    }
  }
  const density = new Float32Array(n * n);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const a = 1 - (at(slideX, i + 1, j) - at(slideX, i - 1, j)) / (2 * cell);
      const b = -(at(slideX, i, j + 1) - at(slideX, i, j - 1)) / (2 * cell);
      const c = -(at(slideY, i + 1, j) - at(slideY, i - 1, j)) / (2 * cell);
      const d = 1 - (at(slideY, i, j + 1) - at(slideY, i, j - 1)) / (2 * cell);
      density[j * n + i] = Math.min(12, 1 / Math.max(Math.abs(a * d - b * c), 1 / 12));
    }
  }
  return { n, cell, tile, phi, phiFlow, slideX, slideY, flowX, flowY, density };
}

/** Catmull–Rom interpolation of a periodic grid field at (u, v) in cells. */
export function sample(field: Field, f: Float32Array, u: number, v: number): number {
  const n = field.n;
  const i = Math.floor(u);
  const j = Math.floor(v);
  const tx = u - i;
  const ty = v - j;
  const w = (t: number): [number, number, number, number] => {
    const t2 = t * t;
    const t3 = t2 * t;
    return [-0.5 * t3 + t2 - 0.5 * t, 1.5 * t3 - 2.5 * t2 + 1, -1.5 * t3 + 2 * t2 + 0.5 * t, 0.5 * t3 - 0.5 * t2];
  };
  const wx = w(tx);
  const wy = w(ty);
  let sum = 0;
  for (let b = 0; b < 4; b++) {
    const row = (((j + b - 1) % n) + n) % n;
    let line = 0;
    for (let a = 0; a < 4; a++) line += wx[a]! * f[row * n + ((((i + a - 1) % n) + n) % n)]!;
    sum += wy[b]! * line;
  }
  return sum;
}

// ──────────────────────────────────────────────────────────────────────── the basins

/** For every cell, the index of the minimum of the flow potential its matter flows into. */
export function basins(field: Field): Int32Array {
  const { n, phiFlow } = field;
  const down = new Int32Array(n * n);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      let best = j * n + i;
      let value = phiFlow[best]!;
      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          const k = (((j + dj) % n) + n) % n * n + ((((i + di) % n) + n) % n);
          if (phiFlow[k]! < value) {
            value = phiFlow[k]!;
            best = k;
          }
        }
      }
      down[j * n + i] = best;
    }
  }
  const label = new Int32Array(n * n).fill(-1);
  const path: number[] = [];
  for (let start = 0; start < n * n; start++) {
    let k = start;
    while (label[k]! < 0 && down[k] !== k) {
      path.push(k);
      k = down[k]!;
    }
    const root = label[k]! >= 0 ? label[k]! : k;
    label[k] = root;
    for (const p of path) label[p] = root;
    path.length = 0;
  }
  return label;
}

/** The closed outline of one basin, in tile coordinates (Mly) unwrapped around `centre` (cells), before the slide. */
export function basinOutline(field: Field, label: Int32Array, id: number, centre: readonly [number, number], window = 120): [number, number][] {
  const { n, cell } = field;
  const size = window * 2 + 1;
  const ci = Math.round(centre[0]);
  const cj = Math.round(centre[1]);
  // The indicator of the basin around its centre, softened twice.
  let grid = new Float32Array(size * size);
  for (let b = 0; b < size; b++) {
    for (let a = 0; a < size; a++) {
      const i = (((ci + a - window) % n) + n) % n;
      const j = (((cj + b - window) % n) + n) % n;
      grid[b * size + a] = label[j * n + i] === id ? 1 : 0;
    }
  }
  for (let pass = 0; pass < 2; pass++) {
    const next = new Float32Array(size * size);
    for (let b = 1; b < size - 1; b++) {
      for (let a = 1; a < size - 1; a++) {
        let s = 0;
        for (let y = -1; y <= 1; y++) for (let x = -1; x <= 1; x++) s += grid[(b + y) * size + a + x]!;
        next[b * size + a] = s / 9;
      }
    }
    grid = next;
  }
  // Marching squares at 0.5: segments, then chained into loops.
  const segments: [number, number, number, number][] = [];
  const lerp = (v0: number, v1: number): number => (0.5 - v0) / (v1 - v0);
  for (let b = 0; b < size - 1; b++) {
    for (let a = 0; a < size - 1; a++) {
      const v = [grid[b * size + a]!, grid[b * size + a + 1]!, grid[(b + 1) * size + a + 1]!, grid[(b + 1) * size + a]!];
      const corners: [number, number][] = [[a, b], [a + 1, b], [a + 1, b + 1], [a, b + 1]];
      const points: [number, number][] = [];
      for (let e = 0; e < 4; e++) {
        const v0 = v[e]!;
        const v1 = v[(e + 1) % 4]!;
        if ((v0 >= 0.5) !== (v1 >= 0.5)) {
          const t = lerp(v0, v1);
          const p0 = corners[e]!;
          const p1 = corners[(e + 1) % 4]!;
          points.push([p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t]);
        }
      }
      if (points.length === 2) segments.push([points[0]![0], points[0]![1], points[1]![0], points[1]![1]]);
      else if (points.length === 4) {
        segments.push([points[0]![0], points[0]![1], points[1]![0], points[1]![1]]);
        segments.push([points[2]![0], points[2]![1], points[3]![0], points[3]![1]]);
      }
    }
  }
  const key = (x: number, y: number): string => `${Math.round(x * 1000)},${Math.round(y * 1000)}`;
  const ends = new Map<string, number[]>();
  segments.forEach((s, k) => {
    for (const [x, y] of [[s[0], s[1]], [s[2], s[3]]] as const) {
      const list = ends.get(key(x, y)) ?? [];
      list.push(k);
      ends.set(key(x, y), list);
    }
  });
  const used = new Uint8Array(segments.length);
  let best: [number, number][] = [];
  for (let k = 0; k < segments.length; k++) {
    if (used[k]) continue;
    const loop: [number, number][] = [];
    let current = k;
    let [x, y] = [segments[k]![2], segments[k]![3]];
    used[k] = 1;
    loop.push([segments[k]![0], segments[k]![1]]);
    for (let guard = 0; guard < segments.length; guard++) {
      loop.push([x, y]);
      const next = (ends.get(key(x, y)) ?? []).find((m) => !used[m] && m !== current);
      if (next === undefined) break;
      used[next] = 1;
      const s = segments[next]!;
      const forward = key(s[0], s[1]) === key(x, y);
      [x, y] = forward ? [s[2], s[3]] : [s[0], s[1]];
      current = next;
    }
    if (loop.length > best.length) best = loop;
  }
  return best.map(([a, b]) => [(ci + a - window) * cell, (cj + b - window) * cell]);
}

// ──────────────────────────────────────────────────────────────── from tile to stage

/** Where the matter that started at q (tile Mly, unwrapped) ends up: the full slide. */
export function slid(field: Field, qx: number, qy: number): [number, number] {
  const u = qx / field.cell;
  const v = qy / field.cell;
  return [qx - sample(field, field.slideX, u, v), qy - sample(field, field.slideY, u, v)];
}

/** The same with the smoothed slide: for the edge of Laniakea and its flow lines. */
export function slidSmooth(field: Field, qx: number, qy: number): [number, number] {
  const u = qx / field.cell;
  const v = qy / field.cell;
  return [qx - sample(field, field.flowX, u, v), qy - sample(field, field.flowY, u, v)];
}

/** A rigid move of the infinite web: from tile coordinates (after the slide) to the stage around us. */
export interface Frame {
  /** Where our galaxy is, in tile coordinates after the slide. */
  readonly origin: readonly [number, number];
  /** Radians, counter-clockwise. */
  readonly rotation: number;
  readonly tile: number;
}

export function toStage(frame: Frame, x: number, y: number, wrap = true): [number, number] {
  let dx = x - frame.origin[0];
  let dy = y - frame.origin[1];
  if (wrap) {
    dx -= frame.tile * Math.round(dx / frame.tile);
    dy -= frame.tile * Math.round(dy / frame.tile);
  }
  const c = Math.cos(frame.rotation);
  const s = Math.sin(frame.rotation);
  return [c * dx - s * dy, s * dx + c * dy];
}

/** A flow line from q (tile Mly), down the smoothed potential to its minimum: points in tile Mly before the slide. */
export function flowLine(field: Field, qx: number, qy: number, steps = 260, step = 3): [number, number][] {
  const out: [number, number][] = [[qx, qy]];
  let x = qx;
  let y = qy;
  for (let s = 0; s < steps; s++) {
    const u = x / field.cell;
    const v = y / field.cell;
    // The slide is D ∇φ: matter moves along minus it.
    const gx = sample(field, field.flowX, u, v);
    const gy = sample(field, field.flowY, u, v);
    const length = Math.hypot(gx, gy);
    if (length < 1e-6) break;
    x -= (gx / length) * step;
    y -= (gy / length) * step;
    out.push([x, y]);
    // Slow near the bottom: the line has arrived.
    if (length < 0.6 && s > 10) break;
  }
  return out;
}

// ─────────────────────────────────────────────────────────── Laniakea, as found

export interface Laniakea {
  readonly frame: Frame;
  /** Our basin: its id (the index of its minimum cell), outline (stage Mly, closed), attractor and centroid (stage Mly). */
  readonly id: number;
  readonly outline: [number, number][];
  readonly attractor: [number, number];
  readonly centroid: [number, number];
  /** Largest distance across the outline, Mly. */
  readonly width: number;
}

function polygonCentroid(points: readonly [number, number][]): [number, number] {
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < points.length; i++) {
    const [x0, y0] = points[i]!;
    const [x1, y1] = points[(i + 1) % points.length]!;
    const cross = x0 * y1 - x1 * y0;
    a += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  return [cx / (3 * a), cy / (3 * a)];
}

export function widthOf(points: readonly [number, number][]): number {
  let best = 0;
  for (let i = 0; i < points.length; i += 2) {
    for (let j = i + 1; j < points.length; j += 2) {
      best = Math.max(best, Math.hypot(points[i]![0] - points[j]![0], points[i]![1] - points[j]![1]));
    }
  }
  return best;
}

/** Our basin, seen from our galaxy (which started at cell `us`), turned so the attractor is at `attractorAngle`. */
export function findLaniakea(field: Field, label: Int32Array, us: readonly [number, number], attractorAngle: number): Laniakea {
  const { n, cell, tile } = field;
  const start = (((us[1] % n) + n) % n) * n + ((((us[0] % n) + n) % n));
  const id = label[start]!;
  const minI = id % n;
  const minJ = Math.floor(id / n);
  // Unwrap the minimum next to us.
  const unwrap = (v: number, near: number): number => v + n * Math.round((near - v) / n);
  const mi = unwrap(minI, us[0]);
  const mj = unwrap(minJ, us[1]);
  const usX = us[0] * cell;
  const usY = us[1] * cell;
  const origin = slid(field, usX, usY);
  const attractorTile = slidSmooth(field, mi * cell, mj * cell);
  const direction = Math.atan2(attractorTile[1] - origin[1], attractorTile[0] - origin[0]);
  const frame: Frame = { origin, rotation: (attractorAngle * Math.PI) / 180 - direction, tile };
  const outlineTile = basinOutline(field, label, id, [mi, mj]);
  const outline = outlineTile.map(([x, y]) => {
    const [sx, sy] = slidSmooth(field, x, y);
    return toStage(frame, sx, sy, false);
  });
  const attractor = toStage(frame, attractorTile[0], attractorTile[1], false);
  return { frame, id, outline, attractor, centroid: polygonCentroid(outline), width: widthOf(outline) };
}

/** Whether a point is inside a closed polygon (even–odd rule). */
export function inside(points: readonly [number, number][], x: number, y: number): boolean {
  let result = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i]!;
    const [xj, yj] = points[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) result = !result;
  }
  return result;
}

/** Distance from a point to a closed polygon. */
export function distanceToOutline(points: readonly [number, number][], x: number, y: number): number {
  let best = Infinity;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [ax, ay] = points[j]!;
    const [bx, by] = points[i]!;
    const dx = bx - ax;
    const dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
    best = Math.min(best, Math.hypot(ax + t * dx - x, ay + t * dy - y));
  }
  return best;
}
