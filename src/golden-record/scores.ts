/**
 * The six sounds of the lab, written as scores: lists of events at fixed times (with a
 * fixed seed where there is chance, so a sound is the same every time). The same score is
 * played by src/golden-record/synth.ts and drawn as the shape of the sound: on the tiles,
 * and in the grooves of her disc, which shine where the sound is loud.
 *
 * Pure, with tests (tests/golden-record-lab.test.ts). No audio files anywhere.
 */
import type { SoundId } from './design.ts';
import { seeded } from './random.ts';

export type SoundEvent =
  /** A low, damped knock (the heart): a sine that falls in pitch, `dur` seconds long. */
  | { readonly kind: 'thump'; readonly at: number; readonly freq: number; readonly dur: number; readonly gain: number }
  /** A steady tone with soft edges (Morse). */
  | { readonly kind: 'tone'; readonly at: number; readonly dur: number; readonly freq: number; readonly gain: number }
  /** A struck note that rings and fades (a music box); `decay` is the time constant. */
  | { readonly kind: 'bell'; readonly at: number; readonly freq: number; readonly decay: number; readonly gain: number }
  /** A sweep from one pitch to another (birds). */
  | { readonly kind: 'chirp'; readonly at: number; readonly dur: number; readonly from: number; readonly to: number; readonly gain: number }
  /** A drop of rain: a very short burst of noise around `freq`. */
  | { readonly kind: 'drop'; readonly at: number; readonly freq: number; readonly gain: number }
  /** A bigger drop on something hard: a short ping that falls in pitch. */
  | { readonly kind: 'plink'; readonly at: number; readonly freq: number; readonly gain: number };

/** Noise under the events (rain, sea): loudness and filter, sampled `rate` times a second. */
export interface NoiseBed {
  readonly rate: number;
  /** Loudness, 0–1. */
  readonly gain: readonly number[];
  /** Cut-off of the low-pass filter, in Hz. */
  readonly cutoff: readonly number[];
  /** Cut-off of the high-pass filter, in Hz. */
  readonly highpass: number;
}

export interface Score {
  readonly id: SoundId;
  /** Seconds, from the first event to the end of the last echo. */
  readonly duration: number;
  readonly events: readonly SoundEvent[];
  readonly bed?: NoiseBed;
}

// ── Morse ───────────────────────────────────────────────────────────────────

/** International Morse code (ITU-R M.1677-1), only the letters needed here. */
const MORSE: Readonly<Record<string, string>> = { A: '.-', C: '-.-.', I: '..', O: '---' };

/** «CIAO» → "-.-. .. .- ---": the letters separated by spaces. */
export function morseCode(text: string): string {
  return [...text.toUpperCase()].map((letter) => MORSE[letter] ?? '').join(' ');
}

/** Seconds of one unit: a dot. 100 ms is 12 words a minute. */
export const MORSE_UNIT = 0.1;

/**
 * The tones of a word in Morse, with the ITU timing: a dot lasts 1 unit, a dash 3; the
 * silence is 1 unit between the signs of a letter and 3 between letters.
 */
export function morseTimeline(text: string, unit = MORSE_UNIT, start = 0): { at: number; dur: number }[] {
  const tones: { at: number; dur: number }[] = [];
  let t = start;
  [...text.toUpperCase()].forEach((letter, index) => {
    if (index > 0) t += 2 * unit; // 1 unit already follows the last sign: 3 in all
    for (const sign of MORSE[letter] ?? '') {
      const dur = sign === '-' ? 3 * unit : unit;
      tones.push({ at: t, dur });
      t += dur + unit;
    }
  });
  return tones;
}

// ── «Tanti auguri» ──────────────────────────────────────────────────────────

/**
 * The melody of «Happy Birthday to You» (Mildred and Patty Hill, 1893; public domain), in
 * 3/4 with its upbeat: semitones above the first note, and length in beats.
 */
export const MELODY: readonly { readonly step: number; readonly beats: number }[] = [
  // Tanti auguri a te
  [0, 0.75], [0, 0.25], [2, 1], [0, 1], [5, 1], [4, 2],
  // tanti auguri a te
  [0, 0.75], [0, 0.25], [2, 1], [0, 1], [7, 1], [5, 2],
  // tanti auguri a…
  [0, 0.75], [0, 0.25], [12, 1], [9, 1], [5, 1], [4, 1], [2, 1],
  // tanti auguri a te
  [10, 0.75], [10, 0.25], [9, 1], [5, 1], [7, 1], [5, 3],
].map(([step, beats]) => ({ step: step as number, beats: beats as number }));

/** The first note: G4. */
const MELODY_ROOT = 392;
/** Seconds of a beat. */
const BEAT = 0.4;

// ── The six scores ──────────────────────────────────────────────────────────

const smooth = (x: number): number => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

/** Fades in over `fadeIn` seconds from 0 and out over `fadeOut` before `end`. */
function fades(t: number, end: number, fadeIn: number, fadeOut: number): number {
  return smooth(t / fadeIn) * smooth((end - t) / fadeOut);
}

function sampleBed(duration: number, rate: number, gain: (t: number) => number, cutoff: (t: number) => number, highpass: number): NoiseBed {
  const count = Math.ceil(duration * rate) + 1;
  const times = Array.from({ length: count }, (_, i) => i / rate);
  return { rate, gain: times.map(gain), cutoff: times.map(cutoff), highpass };
}

function heart(): Score {
  // About 80 beats a minute, a heart at rest at ten: «tu» (the valves closing as the heart
  // squeezes), then «tum».
  const period = 60 / 80;
  const events: SoundEvent[] = [];
  for (let k = 0; k < 8; k++) {
    const t = 0.25 + k * period;
    events.push({ kind: 'thump', at: t, freq: 52, dur: 0.17, gain: 1 });
    events.push({ kind: 'thump', at: t + 0.3, freq: 66, dur: 0.12, gain: 0.68 });
  }
  return { id: 'cuore', duration: 7, events };
}

function rain(): Score {
  const duration = 8;
  const random = seeded(2026);
  const level = (t: number): number => fades(t, duration, 1, 1.6);
  const events: SoundEvent[] = [];
  for (let t = 0.2; t < duration - 0.3; t += -Math.log(1 - random()) / 26) {
    events.push({ kind: 'drop', at: t, freq: 2400 + 3800 * random(), gain: (0.25 + 0.6 * random()) * level(t) });
  }
  for (let t = 0.5; t < duration - 0.6; t += -Math.log(1 - random()) / 2.2) {
    events.push({ kind: 'plink', at: t, freq: 1500 + 1500 * random(), gain: (0.3 + 0.35 * random()) * level(t) });
  }
  events.sort((a, b) => a.at - b.at);
  const bed = sampleBed(duration, 25, (t) => 0.5 * level(t), () => 6200, 420);
  return { id: 'pioggia', duration, events, bed };
}

/** One wave: it rises as it comes in, breaks, and draws back. 0–1, `x` seconds from its start. */
function wave(x: number): number {
  if (x <= 0) return 0;
  const rise = 2.6;
  return x < rise ? smooth(x / rise) : Math.exp(-(x - rise) / 1.5);
}

function sea(): Score {
  const duration = 11;
  const swell = (t: number): number => Math.min(1, 0.16 + 0.84 * wave(t - 0.4) + 0.76 * wave(t - 5.7));
  const level = (t: number): number => fades(t, duration, 0.8, 1.5) * swell(t);
  const bed = sampleBed(duration, 25, level, (t) => 320 + 2900 * swell(t) ** 1.5, 60);
  return { id: 'mare', duration, events: [], bed };
}

function birds(): Score {
  const duration = 7;
  const random = seeded(1977);
  const events: SoundEvent[] = [];
  // A small bird with quick high notes falling in pitch, in short phrases.
  for (const start of [0.3, 1.9, 3.5, 5.1]) {
    let t = start + 0.25 * random();
    const notes = 3 + Math.floor(random() * 4);
    for (let k = 0; k < notes; k++) {
      const dur = 0.06 + 0.03 * random();
      events.push({ kind: 'chirp', at: t, dur, from: 4300 + 900 * random(), to: 3000 + 600 * random(), gain: 0.5 + 0.3 * random() });
      t += dur + 0.035 + 0.025 * random();
    }
  }
  // Another, lower, that answers «tu-ii» and now and then trills.
  for (const start of [1.1, 2.8, 4.4, 6.0]) {
    let t = start + 0.2 * random();
    events.push({ kind: 'chirp', at: t, dur: 0.13, from: 2100, to: 2900, gain: 0.55 });
    t += 0.19;
    events.push({ kind: 'chirp', at: t, dur: 0.16, from: 2300, to: 3300 + 300 * random(), gain: 0.6 });
    t += 0.24;
    if (random() < 0.6 && t < duration - 0.6) {
      for (let k = 0; k < 8; k++) {
        events.push({ kind: 'chirp', at: t, dur: 0.03, from: k % 2 ? 3400 : 3800, to: k % 2 ? 3300 : 3650, gain: 0.35 });
        t += 0.05;
      }
    }
  }
  events.sort((a, b) => a.at - b.at);
  return { id: 'uccelli', duration, events };
}

function birthday(): Score {
  const events: SoundEvent[] = [];
  let t = 0.3;
  MELODY.forEach((note, index) => {
    const last = index === MELODY.length - 1;
    events.push({
      kind: 'bell',
      at: t,
      freq: MELODY_ROOT * 2 ** (note.step / 12),
      decay: last ? 0.9 : 0.42,
      gain: note.beats < 0.5 ? 0.62 : 0.8,
    });
    t += note.beats * BEAT;
  });
  return { id: 'compleanno', duration: Math.ceil(t + 1.6), events };
}

function morse(): Score {
  const start = 0.4;
  const tones = morseTimeline('CIAO', MORSE_UNIT, start);
  const last = tones[tones.length - 1];
  const end = last ? last.at + last.dur : start;
  return {
    id: 'morse',
    duration: Math.round((end + 0.6) * 10) / 10,
    events: tones.map(({ at, dur }) => ({ kind: 'tone', at, dur, freq: 600, gain: 0.6 })),
  };
}

export const SCORES: Readonly<Record<SoundId, Score>> = {
  cuore: heart(),
  pioggia: rain(),
  mare: sea(),
  uccelli: birds(),
  compleanno: birthday(),
  morse: morse(),
};

// ── The shape of a sound ────────────────────────────────────────────────────

/** How loud an event is at `t` seconds, before mixing. */
function eventLevel(event: SoundEvent, t: number): number {
  const x = t - event.at;
  if (x < 0) return 0;
  switch (event.kind) {
    case 'thump':
      return x > event.dur * 1.6 ? 0 : event.gain * Math.min(1, x / 0.004) * Math.exp(-x / (event.dur / 3));
    case 'tone':
      return x > event.dur ? 0 : event.gain * Math.min(1, x / 0.005, (event.dur - x) / 0.005);
    case 'bell':
      return x > event.decay * 7 ? 0 : event.gain * Math.min(1, x / 0.003) * Math.exp(-x / event.decay);
    case 'chirp':
      return x > event.dur ? 0 : event.gain * Math.sin((Math.PI * x) / event.dur);
    case 'drop':
      return x > 0.08 ? 0 : event.gain * Math.exp(-x / 0.012);
    case 'plink':
      return x > 0.25 ? 0 : event.gain * Math.exp(-x / 0.035);
  }
}

function bedLevel(bed: NoiseBed, t: number): number {
  const at = t * bed.rate;
  const i = Math.floor(at);
  const a = bed.gain[Math.min(i, bed.gain.length - 1)] ?? 0;
  const b = bed.gain[Math.min(i + 1, bed.gain.length - 1)] ?? 0;
  return a + (b - a) * (at - i);
}

/** Fine samples of the shape of each sound, made once: 1.000 a second. */
const FINE_RATE = 1000;
const fine = new Map<SoundId, Float32Array>();

function fineEnvelope(id: SoundId): Float32Array {
  const cached = fine.get(id);
  if (cached) return cached;
  const score = SCORES[id];
  const out = new Float32Array(Math.ceil(score.duration * FINE_RATE));
  // Events sorted by start, so each sample only looks at those that can still be heard.
  const events = [...score.events].sort((a, b) => a.at - b.at);
  let first = 0;
  let peak = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / FINE_RATE;
    while (first < events.length && t - (events[first]?.at ?? 0) > 7) first++;
    let power = score.bed ? bedLevel(score.bed, t) ** 2 : 0;
    for (let k = first; k < events.length; k++) {
      const event = events[k];
      if (!event || event.at > t) break;
      power += eventLevel(event, t) ** 2;
    }
    const level = Math.sqrt(power);
    out[i] = level;
    if (level > peak) peak = level;
  }
  if (peak > 0) for (let i = 0; i < out.length; i++) out[i] = (out[i] ?? 0) / peak;
  fine.set(id, out);
  return out;
}

/**
 * The shape of a sound: how loud it is, from 0 to 1, in `bins` equal slices of its
 * duration. Each slice keeps its loudest moment, so that a short drop is never lost.
 */
export function envelope(id: SoundId, bins: number): number[] {
  const samples = fineEnvelope(id);
  const out: number[] = [];
  for (let b = 0; b < bins; b++) {
    const from = Math.floor((b / bins) * samples.length);
    const to = Math.max(from + 1, Math.floor(((b + 1) / bins) * samples.length));
    let max = 0;
    for (let i = from; i < to && i < samples.length; i++) max = Math.max(max, samples[i] ?? 0);
    out.push(max);
  }
  return out;
}
