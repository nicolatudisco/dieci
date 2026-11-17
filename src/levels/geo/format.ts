/**
 * The geographic data of the stops of M2 (public/data/*.json), written once by
 * scripts/geodata/build.mjs. Pure: no DOM, no three.js, so it runs in the tests.
 *
 * Coordinates are metres from the starting point («Tu sei qui»), in the orthographic
 * projection centred on it (+x east, +y north): the stage axes of the ground levels.
 * In the files they are integers in steps of `q` metres, the first point of a feature
 * absolute and the others as differences.
 */

/** Classes written by the build script: keep in sync with scripts/geodata/build.mjs. */
export const ROAD = { motorway: 0, primary: 1, secondary: 2, tertiary: 3, residential: 4, pedestrian: 5, path: 6, service: 7 } as const;
/** Added to the class of a road on a bridge. */
export const BRIDGE = 8;
export const RAIL = { main: 0, service: 1, tram: 2 } as const;
export const RIVER = { river: 0, stream: 1, canal: 2 } as const;
export const GREEN = { park: 0, wood: 1, meadow: 2 } as const;

/** [x0, y0, x1, y1] in metres. */
export type Box = readonly [number, number, number, number];
export type Point = readonly [number, number];

export interface GeoFileRaw {
  readonly v: 1;
  readonly q: number;
  readonly box: Box;
  readonly lines?: Readonly<Record<string, readonly (readonly number[])[]>>;
  readonly areas?: Readonly<Record<string, readonly (readonly (number | readonly number[])[])[]>>;
  readonly points?: Readonly<Record<string, Point>>;
  readonly street?: Street;
}

/** The street in front of the starting point (rifredi.json). */
export interface Street {
  /** Nearest point of the centre line of the carriageway, metres from the starting point. */
  readonly centre: Point;
  /** Angle of the street axis on screen, degrees from +x (east), counter-clockwise, in [0, 180). */
  readonly angle: number;
  /** Width of the carriageway, parking lanes included, in metres. */
  readonly width: number;
}

export interface GeoLine {
  readonly cls: number;
  /** Width in metres (0 when it does not apply). */
  readonly width: number;
  /** x0, y0, x1, y1, … in metres. */
  readonly points: Float64Array;
}

export interface GeoArea {
  readonly cls: number;
  /** The first ring is the outline, the others are holes. Open rings: the last point is not repeated. */
  readonly rings: readonly Float64Array[];
}

export interface GeoFile {
  readonly box: Box;
  readonly lines: Readonly<Record<string, readonly GeoLine[]>>;
  readonly areas: Readonly<Record<string, readonly GeoArea[]>>;
  readonly points: Readonly<Record<string, Point>>;
  readonly street: Street | null;
}

/** Integer differences → absolute metres. */
export function decodePoints(coords: readonly number[], q: number, start = 0): Float64Array {
  const n = (coords.length - start) >> 1;
  const out = new Float64Array(n * 2);
  let x = 0;
  let y = 0;
  for (let i = 0; i < n; i++) {
    x += coords[start + 2 * i] ?? 0;
    y += coords[start + 2 * i + 1] ?? 0;
    out[2 * i] = x * q;
    out[2 * i + 1] = y * q;
  }
  return out;
}

export function decodeGeo(raw: GeoFileRaw): GeoFile {
  if (raw.v !== 1) throw new Error(`Unknown geodata version ${String(raw.v)}`);
  const lines: Record<string, GeoLine[]> = {};
  for (const [name, list] of Object.entries(raw.lines ?? {})) {
    lines[name] = list.map((f) => ({ cls: f[0] ?? 0, width: (f[1] ?? 0) / 10, points: decodePoints(f, raw.q, 2) }));
  }
  const areas: Record<string, GeoArea[]> = {};
  for (const [name, list] of Object.entries(raw.areas ?? {})) {
    areas[name] = list.map((f) => ({
      cls: typeof f[0] === 'number' ? f[0] : 0,
      rings: f.slice(1).map((ring) => decodePoints(ring as readonly number[], raw.q)),
    }));
  }
  return { box: raw.box, lines, areas, points: raw.points ?? {}, street: raw.street ?? null };
}

/** True when (x, y) is inside the ring (even–odd rule). */
export function insideRing(ring: Float64Array, x: number, y: number): boolean {
  let inside = false;
  const n = ring.length >> 1;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = ring[2 * i] ?? 0;
    const yi = ring[2 * i + 1] ?? 0;
    const xj = ring[2 * j] ?? 0;
    const yj = ring[2 * j + 1] ?? 0;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Bounding box of a flat list of points. */
export function ringBox(points: Float64Array): Box {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (let i = 0; i < points.length; i += 2) {
    const x = points[i] ?? 0;
    const y = points[i + 1] ?? 0;
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  }
  return [x0, y0, x1, y1];
}
