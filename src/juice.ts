/**
 * Where the ESA probe Juice is, at any moment, on its way to Jupiter (arrival in July 2031):
 * the one model behind the point of light «sonda Juice» in the scene of `giove`.
 *
 * The table (content/juice-position.ts, from NASA/JPL Horizons) gives the probe seen from
 * the Sun in a frame that turns with the Earth: the Earth always on +x. The scene turns it to
 * wherever the Earth is drawn, so that the probe is where it really is COMPARED WITH THE
 * EARTH (the other planets are placed by composition). Pure: no DOM, no three.js.
 */
import { JUICE_POSITION } from './content/juice-position.ts';

const { startMs, stepMs, xy: TABLE } = JUICE_POSITION;
const LAST = TABLE.length / 2 - 1;
const END_MS = startMs + LAST * stepMs;

export interface JuicePlace {
  /** Astronomical units from the Sun, in the frame where the Earth is on +x. */
  readonly x: number;
  readonly y: number;
  /** After the end of the table the probe is in orbit around Jupiter. */
  readonly arrived: boolean;
}

function at(index: number): readonly [number, number] {
  const i = Math.min(LAST, Math.max(0, index));
  return [TABLE[2 * i] ?? 0, TABLE[2 * i + 1] ?? 0];
}

/** Where Juice is at `date` (linear between two samples, five days apart). */
export function juicePlace(date: Date): JuicePlace {
  const ms = date.getTime();
  if (ms > END_MS) {
    const [x, y] = at(LAST);
    return { x, y, arrived: true };
  }
  const f = Math.max(0, (ms - startMs) / stepMs);
  const i = Math.min(LAST - 1, Math.floor(f));
  const t = Math.min(1, f - i);
  const [x0, y0] = at(i);
  const [x1, y1] = at(i + 1);
  return { x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t, arrived: false };
}

/** Distance of Juice from the Sun, in astronomical units. */
export function juiceFromSun(date: Date): number {
  const p = juicePlace(date);
  return Math.hypot(p.x, p.y);
}
