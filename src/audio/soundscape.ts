/**
 * «Il cielo che respira», as numbers: what the sound of the journey is at each point of it.
 * Pure, with tests (tests/audio.test.ts); src/audio/ambient.ts plays it.
 *
 * - The background is a few soft voices in a large space (a reverb made in the browser).
 *   Their colour follows the position on the journey: close and warm at home, open fifths
 *   among the planets, wide and deep among stars and galaxies, sparse and glassy among the
 *   numbers, a warm major chord at the finale. Each region has its own chord; between two
 *   regions one fades into the other (`regionWeights`). No noise anywhere: only tones.
 * - A soft chime for every power of ten that the counter ticks through, one step higher
 *   each time on a pentatonic scale (`chimeNote`), quiet, in the same space.
 */
import { counterAt, type CounterState } from '../ui/counter-model.ts';

export type Region = 'opening' | 'home' | 'planets' | 'stars' | 'numbers' | 'finale';

export const REGIONS: readonly Region[] = ['opening', 'home', 'planets', 'stars', 'numbers', 'finale'];

export interface Voice {
  /** Semitones above `ROOT`. */
  readonly semitones: number;
  readonly type: 'sine' | 'triangle';
  readonly level: number;
  /** Where it stands, from left (−1) to right (1). */
  readonly pan: number;
}

export interface RegionSound {
  readonly voices: readonly Voice[];
  /** Cut-off of the soft low-pass over the voices, in Hz: the brightness of the colour. */
  readonly cutoff: number;
  /** How loud the region is, before the weight of the journey. */
  readonly level: number;
  /** How much of it goes into the large space: little at home, a lot among the galaxies. */
  readonly space: number;
}

/** A2. */
export const ROOT = 110;

const v = (semitones: number, type: Voice['type'], level: number, pan: number): Voice => ({ semitones, type, level, pan });

export const SOUNDS: Readonly<Record<Region, RegionSound>> = {
  // The single star in the dark: one note, far away.
  opening: { voices: [v(12, 'sine', 0.5, 0), v(19, 'sine', 0.18, 0.3)], cutoff: 900, level: 0.75, space: 0.85 },
  // Rifredi, Florence, Italy, the Earth: close and warm, low, a major chord.
  home: { voices: [v(0, 'triangle', 0.45, -0.25), v(7, 'triangle', 0.3, 0.25), v(12, 'sine', 0.28, -0.1), v(16, 'sine', 0.2, 0.35), v(19, 'sine', 0.16, -0.4)], cutoff: 1100, level: 1, space: 0.35 },
  // The Moon to Voyager: open fifths and fourths, a little brighter.
  planets: { voices: [v(0, 'sine', 0.42, -0.35), v(7, 'triangle', 0.3, 0.35), v(14, 'sine', 0.26, -0.2), v(19, 'sine', 0.2, 0.45), v(24, 'sine', 0.12, -0.5)], cutoff: 1600, level: 0.95, space: 0.6 },
  // The Oort cloud to the edge of the universe: wide, deep, spread across the octaves.
  stars: { voices: [v(-5, 'sine', 0.42, -0.5), v(2, 'triangle', 0.26, 0.5), v(9, 'sine', 0.24, -0.3), v(16, 'sine', 0.2, 0.6), v(23, 'sine', 0.12, -0.6)], cutoff: 2000, level: 0.9, space: 0.9 },
  // Act II: only numbers. Few high glassy notes, almost all space.
  numbers: { voices: [v(19, 'sine', 0.26, -0.5), v(26, 'sine', 0.2, 0.5), v(31, 'sine', 0.14, 0)], cutoff: 3200, level: 1, space: 1 },
  // The finale: a warm major chord, close again.
  finale: { voices: [v(0, 'triangle', 0.42, -0.3), v(4, 'sine', 0.32, 0.3), v(7, 'sine', 0.32, -0.15), v(12, 'sine', 0.26, 0.45), v(16, 'sine', 0.16, -0.45), v(19, 'sine', 0.16, 0.2), v(24, 'sine', 0.1, -0.2)], cutoff: 1700, level: 1.05, space: 0.6 },
};

/** Where each region has the background to itself, on the journey axis `u` (see journey.ts). */
const SPANS: readonly (readonly [Region, number, number])[] = [
  ['opening', -1, -0.62],
  ['home', 0, 6.4],
  ['planets', 7.6, 13.6],
  ['stars', 15.2, 27],
  ['numbers', 28.6, 35.4],
  ['finale', 36.8, 40],
];

const smooth = (x: number): number => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/** How much of each region is heard at `u`: they add up to 1, and change smoothly. */
export function regionWeights(u: number): Record<Region, number> {
  const weights = { opening: 0, home: 0, planets: 0, stars: 0, numbers: 0, finale: 0 } as Record<Region, number>;
  const first = SPANS[0];
  const last = SPANS[SPANS.length - 1];
  if (!first || !last) return weights;
  if (u <= first[2]) {
    weights[first[0]] = 1;
    return weights;
  }
  for (let i = 0; i < SPANS.length; i++) {
    const span = SPANS[i];
    const next = SPANS[i + 1];
    if (!span) continue;
    if (u <= span[2]) {
      weights[span[0]] = 1;
      return weights;
    }
    if (next && u < next[1]) {
      const s = smooth((u - span[2]) / (next[1] - span[2]));
      weights[span[0]] = 1 - s;
      weights[next[0]] = s;
      return weights;
    }
  }
  weights[last[0]] = 1;
  return weights;
}

// ── The chimes ──────────────────────────────────────────────────────────────

/** The major pentatonic of the background (A): its notes never clash with the chords. */
const PENTATONIC = [0, 2, 4, 7, 9];

/** The powers the counter ticks through, in order: 10⁰ … 10²⁷, then the numbers of Act II. */
export const TICKS: readonly string[] = [...Array.from({ length: 28 }, (_, n) => String(n)), '30', '80', '100', 'googol'];

/** Which chime a state of the counter rings: its place in `TICKS`, or −1. */
export function tickIndex(state: CounterState): number {
  return TICKS.indexOf(state.exponent);
}

/** The chime at a point of the journey (the counter there). */
export function tickAt(u: number): number {
  return tickIndex(counterAt(u));
}

/** Notes of the scale in the range of the chimes: two octaves, then they start again. */
const RANGE = 10;
/** A4, the key of the background. */
const A4 = 440;
/** The climb starts from E4, the fourth note of the scale (index 3 of `PENTATONIC`). */
const FIRST = 3;

/**
 * The note of the chime `index`, in Hz: one step of the pentatonic higher than the one
 * before, over two octaves (E4 to C♯6, warm and never shrill); then the climb starts again
 * from E4, every ten powers.
 */
export function chimeNote(index: number): number {
  const step = ((index % RANGE) + RANGE) % RANGE + FIRST;
  const semitones = (PENTATONIC[step % 5] ?? 0) + 12 * Math.floor(step / 5) - 12;
  return A4 * 2 ** (semitones / 12);
}

// ── The bubble and the finale ───────────────────────────────────────────────

/** The warm chord that grows with the bubble of her light: A3, C♯4, E4, B4. */
export const BUBBLE_CHORD: readonly number[] = [12, 16, 19, 26];

/** When the wave of light leaves the dot, the chord of the finale opens: these notes join it. */
export const BLOOM_CHORD: readonly number[] = [19, 24, 28, 31];
