/**
 * Plays the scores of src/golden-record/scores.ts with the Web Audio API: oscillators,
 * filtered noise and envelopes, no audio files. `renderScore` works on any context, so the
 * same code can be rendered offline (that is how it was checked); `playSound` plays on the
 * shared context of src/audio/context.ts and must be called from a tap.
 */
import { audio } from '../audio/context.ts';
import type { SoundId } from './design.ts';
import { seeded } from './random.ts';
import { SCORES, type NoiseBed, type Score, type SoundEvent } from './scores.ts';

/**
 * How loud each sound is played, so that they all sound about as loud: pure high tones
 * (Morse, birds) pierce more than noise, and a heartbeat is mostly felt, not heard.
 */
const LEVEL: Readonly<Record<SoundId, number>> = {
  cuore: 0.6,
  pioggia: 0.55,
  mare: 0.6,
  uccelli: 0.3,
  compleanno: 0.27,
  morse: 0.22,
};

/** Two seconds of white noise, made once for each context (with a seed: always the same). */
const noiseCache = new WeakMap<BaseAudioContext, AudioBuffer>();

function noise(context: BaseAudioContext): AudioBuffer {
  let buffer = noiseCache.get(context);
  if (buffer) return buffer;
  buffer = context.createBuffer(1, Math.round(context.sampleRate * 2), context.sampleRate);
  const data = buffer.getChannelData(0);
  const random = seeded(440);
  for (let i = 0; i < data.length; i++) data[i] = random() * 2 - 1;
  noiseCache.set(context, buffer);
  return buffer;
}

interface Voice {
  readonly sources: AudioScheduledSourceNode[];
}

function oscillator(context: BaseAudioContext, voice: Voice, type: OscillatorType, start: number, stop: number): OscillatorNode {
  const node = context.createOscillator();
  node.type = type;
  node.start(start);
  node.stop(stop);
  voice.sources.push(node);
  return node;
}

function gainNode(context: BaseAudioContext, value = 0): GainNode {
  const node = context.createGain();
  node.gain.value = value;
  return node;
}

/** A gain that jumps up in `attack` seconds and then fades with time constant `tau`. */
function strike(context: BaseAudioContext, at: number, peak: number, attack: number, tau: number): GainNode {
  const node = gainNode(context);
  node.gain.setValueAtTime(0, at);
  node.gain.linearRampToValueAtTime(peak, at + attack);
  node.gain.setTargetAtTime(0, at + attack, tau);
  return node;
}

function playEvent(context: BaseAudioContext, bus: AudioNode, voice: Voice, event: SoundEvent, t0: number): void {
  const at = t0 + event.at;
  switch (event.kind) {
    case 'thump': {
      // The knock itself, very low, falling in pitch…
      const end = at + event.dur * 1.8;
      const low = oscillator(context, voice, 'sine', at, end);
      low.frequency.setValueAtTime(event.freq * 1.7, at);
      low.frequency.exponentialRampToValueAtTime(event.freq, at + 0.035);
      low.frequency.exponentialRampToValueAtTime(event.freq * 0.75, at + event.dur);
      low.connect(strike(context, at, event.gain * 0.62, 0.004, event.dur / 3)).connect(bus);
      // …with its overtones and a soft thud of noise, so that a tablet's small speakers,
      // which cannot play the lowest notes, still let it be heard.
      const over = oscillator(context, voice, 'triangle', at, end);
      over.frequency.setValueAtTime(event.freq * 4, at);
      over.frequency.exponentialRampToValueAtTime(event.freq * 2.8, at + event.dur);
      over.connect(strike(context, at, event.gain * 1.05, 0.004, event.dur / 4)).connect(bus);
      const thud = context.createBufferSource();
      thud.buffer = noise(context);
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 650;
      thud.connect(filter).connect(strike(context, at, event.gain * 0.85, 0.003, 0.028)).connect(bus);
      thud.start(at, (event.at * 7.31) % 1.5, 0.15);
      voice.sources.push(thud);
      break;
    }
    case 'tone': {
      const tone = oscillator(context, voice, 'sine', at, at + event.dur + 0.02);
      tone.frequency.value = event.freq;
      const envelope = gainNode(context);
      envelope.gain.setValueAtTime(0, at);
      envelope.gain.linearRampToValueAtTime(event.gain, at + 0.005);
      envelope.gain.setValueAtTime(event.gain, at + event.dur - 0.005);
      envelope.gain.linearRampToValueAtTime(0, at + event.dur);
      tone.connect(envelope).connect(bus);
      break;
    }
    case 'bell': {
      // A music box: a few partials, the higher ones fading sooner.
      const partials: readonly [number, number, number][] = [
        [1, 1, 1],
        [2, 0.3, 0.55],
        [3, 0.1, 0.35],
        [4.2, 0.05, 0.22],
      ];
      for (const [ratio, level, decay] of partials) {
        const tau = event.decay * decay;
        const note = oscillator(context, voice, 'sine', at, at + tau * 7 + 0.05);
        note.frequency.value = event.freq * ratio;
        note.connect(strike(context, at, event.gain * level, 0.003, tau)).connect(bus);
      }
      break;
    }
    case 'chirp': {
      const chirp = oscillator(context, voice, 'sine', at, at + event.dur + 0.01);
      chirp.frequency.setValueAtTime(event.from, at);
      chirp.frequency.exponentialRampToValueAtTime(event.to, at + event.dur);
      const envelope = gainNode(context);
      envelope.gain.setValueAtTime(0, at);
      envelope.gain.linearRampToValueAtTime(event.gain, at + event.dur * 0.3);
      envelope.gain.linearRampToValueAtTime(0, at + event.dur);
      chirp.connect(envelope).connect(bus);
      break;
    }
    case 'drop': {
      const drop = context.createBufferSource();
      drop.buffer = noise(context);
      const filter = context.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = event.freq;
      filter.Q.value = 2.2;
      drop.connect(filter).connect(strike(context, at, event.gain * 1.6, 0.001, 0.012)).connect(bus);
      drop.start(at, (event.freq * 0.000731) % 1.8, 0.09);
      voice.sources.push(drop);
      break;
    }
    case 'plink': {
      const plink = oscillator(context, voice, 'sine', at, at + 0.3);
      plink.frequency.setValueAtTime(event.freq * 1.18, at);
      plink.frequency.exponentialRampToValueAtTime(event.freq, at + 0.04);
      plink.connect(strike(context, at, event.gain * 0.45, 0.001, 0.035)).connect(bus);
      break;
    }
  }
}

function playBed(context: BaseAudioContext, bus: AudioNode, voice: Voice, bed: NoiseBed, t0: number, duration: number): void {
  const source = context.createBufferSource();
  source.buffer = noise(context);
  source.loop = true;
  const high = context.createBiquadFilter();
  high.type = 'highpass';
  high.frequency.value = bed.highpass;
  const low = context.createBiquadFilter();
  low.type = 'lowpass';
  low.Q.value = 0.5;
  const level = gainNode(context);
  bed.gain.forEach((value, i) => {
    const t = t0 + i / bed.rate;
    if (i === 0) level.gain.setValueAtTime(value, t);
    else level.gain.linearRampToValueAtTime(value, t);
  });
  bed.cutoff.forEach((value, i) => {
    const t = t0 + i / bed.rate;
    if (i === 0) low.frequency.setValueAtTime(value, t);
    else low.frequency.linearRampToValueAtTime(value, t);
  });
  source.connect(high).connect(low).connect(level).connect(bus);
  source.start(t0);
  source.stop(t0 + duration + 0.05);
  voice.sources.push(source);
}

export interface Rendering {
  /** The gain every part of the sound goes through. */
  readonly bus: GainNode;
  readonly sources: readonly AudioScheduledSourceNode[];
}

/** Schedules a whole score on `context`, starting at its time `when`. */
export function renderScore(score: Score, context: BaseAudioContext, output: AudioNode, when: number): Rendering {
  const bus = gainNode(context, LEVEL[score.id]);
  bus.connect(output);
  const voice: Voice = { sources: [] };
  if (score.bed) playBed(context, bus, voice, score.bed, when, score.duration);
  for (const event of score.events) playEvent(context, bus, voice, event, when);
  return { bus, sources: voice.sources };
}

export interface Playing {
  readonly id: SoundId;
  readonly duration: number;
  /** Seconds since the sound started, from the audio clock (it may start a moment late). */
  elapsed(): number;
  /** Fades out in a few hundredths of a second. Safe to call more than once. */
  stop(): void;
  /** Resolves when the sound ends or is stopped. */
  readonly ended: Promise<void>;
}

/** Plays a sound now. Call it from a tap. Null where there is no Web Audio. */
export function playSound(id: SoundId): Playing | null {
  const out = audio();
  if (!out) return null;
  const { context, output } = out;
  const score = SCORES[id];
  const startsAt = context.currentTime + 0.03;
  const { bus, sources } = renderScore(score, context, output, startsAt);
  let done = false;
  let finish: () => void = () => undefined;
  const ended = new Promise<void>((resolve) => (finish = resolve));
  const timer = window.setTimeout(() => end(), (score.duration + 0.1) * 1000);
  const end = (): void => {
    if (done) return;
    done = true;
    window.clearTimeout(timer);
    finish();
  };
  return {
    id,
    duration: score.duration,
    elapsed: () => Math.max(0, context.currentTime - startsAt),
    stop: () => {
      if (done) return;
      const now = context.currentTime;
      bus.gain.cancelScheduledValues(now);
      bus.gain.setValueAtTime(bus.gain.value, now);
      bus.gain.linearRampToValueAtTime(0, now + 0.06);
      for (const source of sources) {
        try {
          source.stop(now + 0.08);
        } catch {
          // Already stopped.
        }
      }
      window.setTimeout(() => bus.disconnect(), 200);
      end();
    },
    ended,
  };
}
