/**
 * Clouds of points for the curated placeholders: a field of stars, a spiral galaxy,
 * streams that converge, a cosmic web. All deterministic (seeded), all in the local units
 * of the level that asks for them.
 */
import { mulberry32, type DotsData } from './primitives.ts';

type Rgb = readonly [number, number, number];

class Cloud {
  readonly data: DotsData;
  private n = 0;

  constructor(count: number) {
    this.data = {
      positions: new Float32Array(count * 3),
      sizes: new Float32Array(count),
      colors: new Float32Array(count * 3),
      phases: new Float32Array(count),
    };
  }

  get full(): boolean {
    return this.n >= this.data.sizes.length;
  }

  put(x: number, y: number, z: number, size: number, color: Rgb, level: number, phase: number): void {
    if (this.full) return;
    const i = this.n++;
    this.data.positions.set([x, y, z], i * 3);
    this.data.sizes[i] = size;
    this.data.colors.set([color[0] * level, color[1] * level, color[2] * level], i * 3);
    this.data.phases[i] = phase;
  }
}

function gauss(random: () => number): number {
  // Box-Muller.
  return Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random());
}

function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

const COOL: Rgb = [0.78, 0.84, 1];
const BLUE: Rgb = [0.5, 0.62, 1];
const CREAM: Rgb = [1, 0.9, 0.74];

/**
 * Stars scattered in a thin round slab around the origin, thinning out towards `radius`
 * (no edge to be seen when the field shrinks); none closer than `hole` to the origin.
 */
export function starField(seed: number, count: number, radius: number, thickness: number, hole = 0): DotsData {
  const random = mulberry32(seed);
  const cloud = new Cloud(count);
  while (!cloud.full) {
    const r = radius * random() ** 0.62;
    if (r < hole) continue;
    const a = random() * Math.PI * 2;
    const x = r * Math.cos(a);
    const y = r * Math.sin(a);
    const bright = random() ** 4;
    cloud.put(x, y, gauss(random) * thickness, 1.8 + 3.6 * bright, mixRgb(COOL, random() < 0.2 ? CREAM : BLUE, random() * 0.7), 0.35 + 0.65 * bright, random());
  }
  return cloud.data;
}

/**
 * A barred spiral seen from above its north pole: a bar along `barDegrees`, two main arms
 * that leave its ends and two fainter ones in between, a thin disc. The arms trail a
 * clockwise rotation, so they open counter-clockwise going outwards.
 */
export function spiral(seed: number, count: number, radius: number, barDegrees: number): DotsData {
  const random = mulberry32(seed);
  const cloud = new Cloud(count);
  const bar = (barDegrees * Math.PI) / 180;
  const start = radius * 0.18;
  const winding = 1 / Math.tan((12.5 * Math.PI) / 180);
  while (!cloud.full) {
    const pick = random();
    if (pick < 0.2) {
      // Bar and bulge: old, creamy stars.
      const along = gauss(random) * radius * 0.15;
      const across = gauss(random) * radius * 0.06;
      const x = along * Math.cos(bar) - across * Math.sin(bar);
      const y = along * Math.sin(bar) + across * Math.cos(bar);
      cloud.put(x, y, gauss(random) * radius * 0.03, 1.8 + 2.2 * random() ** 2, CREAM, 0.4 + 0.5 * random(), random());
    } else if (pick < 0.38) {
      // The disc between the arms.
      const r = radius * Math.sqrt(random()) * 0.98;
      const a = random() * Math.PI * 2;
      cloud.put(r * Math.cos(a), r * Math.sin(a), gauss(random) * radius * 0.01, 1.5 + 1.2 * random(), COOL, 0.16 + 0.22 * random(), random());
    } else {
      const arm = Math.floor(random() * 6);
      const main = arm < 4;
      const index = main ? arm % 2 : arm;
      const origin = bar + (main ? index * Math.PI : Math.PI / 2 + (index - 4) * Math.PI);
      const r = start + (radius - start) * random() ** 0.85;
      const spread = (main ? 0.1 : 0.13) * (0.7 + (0.6 * r) / radius);
      const a = origin + winding * Math.log(r / start) + gauss(random) * spread;
      const rr = r + gauss(random) * radius * 0.022;
      const bright = random() ** 3;
      const edge = 1 - 0.6 * (r / radius) ** 2;
      cloud.put(
        rr * Math.cos(a),
        rr * Math.sin(a),
        gauss(random) * radius * 0.008,
        1.6 + 2.4 * bright,
        mixRgb(COOL, BLUE, random()),
        (main ? 0.4 : 0.26) * edge + 0.5 * bright,
        random(),
      );
    }
  }
  return cloud.data;
}

/** Points along streams that converge on the origin, denser near it, inside `radius`. */
export function flow(seed: number, count: number, radius: number): DotsData {
  const random = mulberry32(seed);
  const cloud = new Cloud(count);
  const streams = 26;
  const starts: number[] = [];
  const bends: number[] = [];
  for (let i = 0; i < streams; i++) {
    starts.push(random() * Math.PI * 2);
    bends.push((random() - 0.5) * 2.2);
  }
  while (!cloud.full) {
    const i = Math.floor(random() * streams);
    // t = 0 at the edge, 1 at the centre: more points near the centre.
    const t = random() ** 0.7;
    const r = radius * (1 - t) ** 0.9 * (0.96 + 0.04 * random());
    const a = (starts[i] ?? 0) + (bends[i] ?? 0) * (1 - t) ** 1.5 + gauss(random) * 0.07;
    const jitter = radius * 0.035;
    const bright = random() ** 3;
    cloud.put(
      r * Math.cos(a) + gauss(random) * jitter,
      r * Math.sin(a) + gauss(random) * jitter,
      gauss(random) * radius * 0.08,
      1.6 + 2.8 * bright,
      mixRgb(COOL, CREAM, random() * 0.5),
      0.25 + 0.35 * t + 0.4 * bright,
      random(),
    );
  }
  return cloud.data;
}

export interface WebOptions {
  readonly knots: number;
  readonly count: number;
  readonly radius: number;
  /** The web thins out from this share of the radius to the surface (1 = full to the edge). */
  readonly fade: number;
  /** Thickness of the ball along z, as a share of its radius (1 = a ball, 0.2 = a thick slice). */
  readonly depth: number;
  /** Thickness of a filament, in the same units as `radius`. */
  readonly thickness: number;
}

/** A cosmic web inside a ball: knots joined by filaments of points, around empty voids. */
export function web(seed: number, options: WebOptions): DotsData {
  const { knots, count, radius, fade, depth, thickness } = options;
  const random = mulberry32(seed);
  const cloud = new Cloud(count);
  const nodes: [number, number, number][] = [];
  while (nodes.length < knots) {
    const p: [number, number, number] = [(random() * 2 - 1) * radius, (random() * 2 - 1) * radius, (random() * 2 - 1) * radius];
    if (Math.hypot(...p) <= radius) nodes.push([p[0], p[1], p[2] * depth]);
  }
  // Every knot is tied to its three nearest neighbours.
  const links: [number, number][] = [];
  nodes.forEach((a, i) => {
    const near = nodes
      .map((b, j) => ({ j, d: Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) }))
      .filter((n) => n.j !== i)
      .sort((p, q) => p.d - q.d)
      .slice(0, 3);
    for (const n of near) if (!links.some(([p, q]) => (p === i && q === n.j) || (p === n.j && q === i))) links.push([i, n.j]);
  });
  let guard = 0;
  while (!cloud.full && guard++ < count * 40) {
    const onKnot = random() < 0.22;
    let x: number;
    let y: number;
    let z: number;
    if (onKnot) {
      const n = nodes[Math.floor(random() * nodes.length)];
      if (!n) continue;
      x = n[0] + gauss(random) * thickness * 1.6;
      y = n[1] + gauss(random) * thickness * 1.6;
      z = n[2] + gauss(random) * thickness * 1.6;
    } else {
      const link = links[Math.floor(random() * links.length)];
      const a = link ? nodes[link[0]] : undefined;
      const b = link ? nodes[link[1]] : undefined;
      if (!a || !b) continue;
      const t = random();
      // Filaments sag a little: they are not ruler-straight.
      const sag = Math.sin(t * Math.PI) * thickness * 2.2;
      x = a[0] + (b[0] - a[0]) * t + gauss(random) * thickness + sag * (random() - 0.5);
      y = a[1] + (b[1] - a[1]) * t + gauss(random) * thickness + sag * (random() - 0.5);
      z = a[2] + (b[2] - a[2]) * t + gauss(random) * thickness;
    }
    const r = Math.hypot(x, y, z / depth) / radius;
    if (r > 1) continue;
    // Thin out towards the surface.
    if (fade < 1 && random() > 1 - ((r - fade) / (1 - fade)) ** 2 && r > fade) continue;
    const bright = random() ** 3;
    cloud.put(x, y, z, (onKnot ? 2 : 1.5) + 2.6 * bright, mixRgb(COOL, onKnot ? CREAM : BLUE, random() * 0.6), (onKnot ? 0.45 : 0.28) + 0.5 * bright, random());
  }
  return cloud.data;
}
