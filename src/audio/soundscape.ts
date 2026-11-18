/**
 * «Il cielo che respira», as numbers: what the sound of the journey is at each point of it.
 * Pure, with tests (tests/audio.test.ts); src/audio/ambient.ts plays it.
 *
 * - The background is a few soft voices whose colour follows the position on the journey:
 *   warm and low near home, open fifths among the planets, wide and deep among stars and
 *   galaxies, crystalline among the numbers, a major chord at the finale. Each region has
 *   its own chord; between two regions one fades into the other (`regionWeights`).
 * - A chime for every power of ten that the counter ticks through, one step higher each
 *   time on a pentatonic scale that climbs for ever without leaving its register: the notes
 *   are octaves under a fixed bell-shaped curve, like Shepard's tones (`tickPartials`).
 */
import { counterAt, type CounterState } from '../ui/counter-model.ts';

export type Region = 'opening' | 'home' | 'planets' | 'stars' | 'numbers' | 'finale';

export const REGIONS: readonly Region[] = ['opening', 'home', 'planets', 'stars', 'numbers', 'finale'];

export interface Voice {
  /** Semitones above `ROOT`. */
  readonly semitones: number;
  readonly type: 'sine' | 'triangle';
  readonly level: number;
}

export interface RegionSound {
  readonly voices: readonly Voice[];
  /** Cut-off of the soft low-pass over the voices, in Hz: the brightness of the colour. */
  readonly cutoff: number;
  /** How loud the region is, before the weight of the journey. */
  readonly level: number;
  /** The breath of filtered noise, «the wind of the stars», 0–1. */
  readonly air: number;
  /** The high, trembling glints, 0–1. */
  readonly shimmer: number;
}

/** A2. */
export const ROOT = 110;

const v = (semitones: number, type: Voice['type'], level: number): Voice => ({ semitones, type, level });

export const SOUNDS: Readonly<Record<Region, RegionSound>> = {
  // The single star in the dark.
  opening: { voices: [v(0, 'sine', 0.5), v(7, 'sine', 0.35), v(12, 'triangle', 0.18)], cutoff: 700, level: 0.7, air: 0.16, shimmer: 0 },
  // Rifredi, Florence, Italy, the Earth: warm and low.
  home: { voices: [v(0, 'triangle', 0.5), v(7, 'triangle', 0.32), v(12, 'sine', 0.3), v(16, 'sine', 0.22)], cutoff: 1000, level: 1, air: 0.08, shimmer: 0 },
  // The Moon to Voyager: open fifths.
  planets: { voices: [v(0, 'sine', 0.45), v(7, 'triangle', 0.32), v(14, 'sine', 0.28), v(19, 'sine', 0.22)], cutoff: 1500, level: 0.95, air: 0.15, shimmer: 0.1 },
  // The Oort cloud to the edge of the universe: wide and deep.
  stars: { voices: [v(-5, 'sine', 0.45), v(2, 'triangle', 0.3), v(7, 'sine', 0.3), v(14, 'sine', 0.24), v(21, 'sine', 0.14)], cutoff: 2200, level: 0.9, air: 0.3, shimmer: 0.25 },
  // Act II: only numbers, crystalline.
  numbers: { voices: [v(12, 'sine', 0.3), v(19, 'sine', 0.28), v(24, 'sine', 0.24), v(28, 'sine', 0.18), v(31, 'sine', 0.14)], cutoff: 3800, level: 0.75, air: 0.08, shimmer: 0.6 },
  // The finale: everything resolves into a major chord.
  finale: { voices: [v(0, 'triangle', 0.45), v(4, 'sine', 0.35), v(7, 'sine', 0.35), v(12, 'sine', 0.3), v(16, 'sine', 0.2)], cutoff: 1800, level: 1.05, air: 0.1, shimmer: 0.3 },
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

/** One step of a major pentatonic scale for each power of ten. */
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

/** Semitones of the chime `index` above its first, always growing. */
export function tickSemitones(index: number): number {
  const step = ((index % 5) + 5) % 5;
  return (PENTATONIC[step] ?? 0) + 12 * Math.floor(index / 5);
}

/** The centre of the bell-shaped curve over the octaves, in Hz, and its width in octaves. */
const CENTRE = 660;
const SPREAD = 1;
/** C4: the lowest pitch class of the chimes. */
const TICK_BASE = 261.63;

/**
 * The partials of the chime `index`: the same pitch in five octaves, loud near `CENTRE` and
 * soft away from it. As the pitch climbs, the curve stays where it is: each chime sounds a
 * step higher than the one before, and still the sound never climbs out of its register.
 */
export function tickPartials(index: number): { readonly freq: number; readonly gain: number }[] {
  const pitchClass = ((tickSemitones(index) % 12) + 12) % 12;
  const base = TICK_BASE * 2 ** (pitchClass / 12);
  const partials = [-2, -1, 0, 1, 2].map((octave) => {
    const freq = base * 2 ** octave;
    const away = Math.log2(freq / CENTRE) / SPREAD;
    return { freq, gain: Math.exp(-0.5 * away * away) };
  });
  const total = partials.reduce((sum, p) => sum + p.gain, 0);
  return partials.map((p) => ({ freq: p.freq, gain: p.gain / total }));
}

// ── The bubble ──────────────────────────────────────────────────────────────

/** The warm chord that grows with the bubble of her light: A3, C♯4, E4, B4. */
export const BUBBLE_CHORD: readonly number[] = [12, 16, 19, 26];
