/**
 * The lights of the city at night, made up from the streets: lamps along them and lit
 * windows where the fronts of the houses usually are, just beyond the pavement.
 *
 * They are not real windows: no building is drawn or marked (CLAUDE.md, «Privacy»). They
 * are placed by a fixed random draw, so the city looks the same at every visit, and never
 * on a street, a river, a park or the railway.
 *
 * Pure: no DOM, no three.js.
 */
import { insideRing, ringBox, ROAD, type Box, type GeoArea, type GeoLine } from './format.ts';

/** Classes of the lights, for the palette of the layer. */
export const LIGHT = { warm: 0, white: 1, cool: 2, lamp: 3 } as const;

export interface CityLight {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly cls: number;
  /** Direction of the street it lines (unit vector): a window is drawn along the front. */
  readonly dx: number;
  readonly dy: number;
}

/** A small deterministic generator, the same draw every time. */
function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Segment {
  readonly ax: number;
  readonly ay: number;
  readonly bx: number;
  readonly by: number;
  readonly half: number;
}

/** Road segments in a grid, to ask «is this point on a street?» quickly. */
class SegmentGrid {
  private readonly cells = new Map<string, Segment[]>();
  private readonly size: number;
  constructor(size: number) {
    this.size = size;
  }

  private key(i: number, j: number): string {
    return `${i},${j}`;
  }

  add(s: Segment): void {
    const pad = s.half + 4;
    const i0 = Math.floor((Math.min(s.ax, s.bx) - pad) / this.size);
    const i1 = Math.floor((Math.max(s.ax, s.bx) + pad) / this.size);
    const j0 = Math.floor((Math.min(s.ay, s.by) - pad) / this.size);
    const j1 = Math.floor((Math.max(s.ay, s.by) + pad) / this.size);
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        const k = this.key(i, j);
        const list = this.cells.get(k);
        if (list) list.push(s);
        else this.cells.set(k, [s]);
      }
    }
  }

  /** True when (x, y) is within `margin` metres of the edge of any street. */
  onStreet(x: number, y: number, margin: number): boolean {
    const list = this.cells.get(this.key(Math.floor(x / this.size), Math.floor(y / this.size)));
    if (!list) return false;
    for (const s of list) {
      const dx = s.bx - s.ax;
      const dy = s.by - s.ay;
      const len2 = dx * dx + dy * dy;
      const t = len2 > 0 ? Math.max(0, Math.min(1, ((x - s.ax) * dx + (y - s.ay) * dy) / len2)) : 0;
      const d = Math.hypot(x - s.ax - t * dx, y - s.ay - t * dy);
      if (d < s.half + margin) return true;
    }
    return false;
  }
}

interface AreaIndex {
  readonly ring: Float64Array;
  readonly box: Box;
}

export interface CityLightsOptions {
  /** Only within this distance of the starting point, metres. */
  readonly radius: number;
  /** Distance between two windows along a street, metres. */
  readonly windowSpacing?: number;
  /** Share of windows that are lit. */
  readonly lit?: number;
  /** Distance between two lamps along a street, metres. */
  readonly lampSpacing?: number;
  /** Width of the pavement between the carriageway and the fronts of the houses, metres. */
  readonly pavement?: number;
}

/**
 * Lamps and lit windows along the streets within `radius` of the starting point. A window
 * has a half length (`radius`) and the direction of its street.
 * `areas` are the places where no window can be (water, parks, the railway).
 */
export function cityLights(roads: readonly GeoLine[], areas: readonly GeoArea[], options: CityLightsOptions): { windows: CityLight[]; lamps: CityLight[] } {
  const radius = options.radius;
  const spacing = options.windowSpacing ?? 3;
  const litShare = options.lit ?? 0.42;
  const lampSpacing = options.lampSpacing ?? 27;
  const pavement = options.pavement ?? 4.2;
  // Windows and lamps line the streets; pavements and lanes only keep the windows off them.
  const streets = roads.filter((r) => (r.cls & 7) <= ROAD.pedestrian);

  const grid = new SegmentGrid(24);
  for (const r of roads) {
    const p = r.points;
    for (let i = 0; i + 3 < p.length; i += 2) {
      grid.add({ ax: p[i] ?? 0, ay: p[i + 1] ?? 0, bx: p[i + 2] ?? 0, by: p[i + 3] ?? 0, half: r.width / 2 });
    }
  }
  const blocked: AreaIndex[] = [];
  for (const a of areas) {
    const ring = a.rings[0];
    if (ring && ring.length >= 6) blocked.push({ ring, box: ringBox(ring) });
  }
  const inArea = (x: number, y: number): boolean =>
    blocked.some((b) => x >= b.box[0] && x <= b.box[2] && y >= b.box[1] && y <= b.box[3] && insideRing(b.ring, x, y));

  const windows: CityLight[] = [];
  const lamps: CityLight[] = [];
  let seed = 1;
  for (const r of streets) {
    const p = r.points;
    const half = r.width / 2;
    const draw = random(++seed * 7919);
    let walked = draw() * lampSpacing;
    let side = draw() < 0.5 ? 1 : -1;
    for (let i = 0; i + 3 < p.length; i += 2) {
      const ax = p[i] ?? 0;
      const ay = p[i + 1] ?? 0;
      const bx = p[i + 2] ?? 0;
      const by = p[i + 3] ?? 0;
      const len = Math.hypot(bx - ax, by - ay);
      if (len === 0) continue;
      const tx = (bx - ax) / len;
      const ty = (by - ay) / len;
      if (Math.hypot(ax, ay) > radius + len && Math.hypot(bx, by) > radius + len) {
        walked += len;
        continue;
      }
      // Lamps: one every few tens of metres, on alternating sides, at the edge of the road.
      if ((r.cls & 7) <= ROAD.residential) {
        for (let s = lampSpacing - (walked % lampSpacing); s < len; s += lampSpacing) {
          const x = ax + tx * s - ty * side * (half - 0.6);
          const y = ay + ty * s + tx * side * (half - 0.6);
          if (Math.hypot(x, y) < radius) lamps.push({ x, y, radius: 7, cls: LIGHT.lamp, dx: tx, dy: ty });
          side = -side;
        }
      }
      walked += len;
      // Windows: on both sides, just beyond the pavement.
      for (let s = draw() * spacing; s < len; s += spacing) {
        for (const w of [1, -1]) {
          const lit = draw() < litShare;
          const depth = pavement + draw() * 2.2;
          const tint = draw();
          if (!lit) continue;
          const x = ax + tx * s - ty * w * (half + depth);
          const y = ay + ty * s + tx * w * (half + depth);
          if (Math.hypot(x, y) > radius) continue;
          if (grid.onStreet(x, y, 0.5) || inArea(x, y)) continue;
          windows.push({ x, y, radius: 0.5 + 0.4 * draw(), cls: tint < 0.62 ? LIGHT.warm : tint < 0.92 ? LIGHT.white : LIGHT.cool, dx: tx, dy: ty });
        }
      }
    }
  }
  return { windows, lamps };
}
