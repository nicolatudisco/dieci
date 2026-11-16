/**
 * Where Voyager 1 is, at any moment: the one model behind the live panel of the Voyager
 * stop and the position of the probe in its scene, so that number and picture never disagree.
 *
 * The distance from the Earth is read from a table computed with NASA/JPL Horizons
 * (content/voyager-distance.ts) and interpolated. A straight line at 17 km/s would be wrong
 * by up to 150 million km: the Earth goes around the Sun, so the distance swings during the
 * year and, from late January to late April, even shrinks. Pure: no DOM, no three.js.
 */
import { VOYAGER_1, VOYAGER_1_DISTANCE } from './content/data.ts';

const { startMs, stepMs, km: TABLE } = VOYAGER_1_DISTANCE;
const LAST = TABLE.length - 1;
const END_MS = startMs + LAST * stepMs;

function sample(index: number): number {
  return TABLE[Math.min(LAST, Math.max(0, index))] ?? 0;
}

/**
 * Distance between the centre of the Earth and Voyager 1 at `date`, in km.
 *
 * Inside the table: the cubic through the four nearest samples (within about 10 km of
 * Horizons). Outside it there is no better knowledge than the speed of the probe: the
 * distance goes on in a straight line at 17 km/s from the nearest end of the table.
 */
export function voyagerDistanceKm(date: Date): number {
  const ms = date.getTime();
  if (ms <= startMs) return sample(0) + ((ms - startMs) / 1000) * VOYAGER_1.speedKmS;
  if (ms >= END_MS) return sample(LAST) + ((ms - END_MS) / 1000) * VOYAGER_1.speedKmS;

  const x = (ms - startMs) / stepMs;
  // The four samples around x, kept inside the table at its two ends.
  const i = Math.min(LAST - 2, Math.max(1, Math.floor(x)));
  const t = x - i;
  const a = sample(i - 1);
  const b = sample(i);
  const c = sample(i + 1);
  const d = sample(i + 2);
  // Lagrange polynomial through the samples at -1, 0, 1, 2.
  return (
    (-a * t * (t - 1) * (t - 2)) / 6 +
    (b * (t + 1) * (t - 1) * (t - 2)) / 2 -
    (c * (t + 1) * t * (t - 2)) / 2 +
    (d * (t + 1) * t * (t - 1)) / 6
  );
}

/** Before or after the moment Voyager 1 reaches one light-day from the Earth. */
export function voyagerMilestone(date: Date): 'before' | 'after' {
  return date.getTime() < Date.parse(VOYAGER_1.lightDayDateUTC) ? 'before' : 'after';
}
