/**
 * «Il cielo che respira», played: the background, the chimes of the powers of ten, the
 * warm chord of the bubble, and at the finale the chord that opens when the wave of light
 * leaves the dot (src/audio/soundscape.ts says what they are). Everything is synthesised,
 * the large space too: a reverb whose echo is made in the browser. Nothing plays until she
 * turns the sound on with a tap, and it goes quiet when the tab is hidden or the Golden
 * Record is open.
 *
 * `buildGraph` works on any context, so the same code can be rendered offline (that is how
 * its levels were checked, and how the previews were made); `Soundscape` plays it on the
 * shared context of src/audio/context.ts.
 */
import { seeded } from '../golden-record/random.ts';
import { audio } from './context.ts';
import { BLOOM_CHORD, BUBBLE_CHORD, REGIONS, ROOT, SOUNDS, chimeNote, regionWeights, tickAt, type Region } from './soundscape.ts';

/**
 * How a power of ten sounds: `glass`, a soft struck note; `breath`, a note of the chord
 * that swells and fades; `none`, only the background changing colour.
 */
export type ChimeStyle = 'glass' | 'breath' | 'none';
export const CHIME_STYLE: ChimeStyle = 'glass';

/** How loud each part is: low. It is a breath under the journey, not music to listen to. */
const PAD = 0.16;
const CHIME = 0.024;
const BUBBLE = 0.09;
const BLOOM = 0.14;
/** While the Golden Record is open its own sounds must be heard: the journey almost stops. */
const DUCKED = 0.1;
/** The large space: how long its echo lasts, in seconds. */
const ECHO = 3.4;

export interface Graph {
  readonly context: BaseAudioContext;
  /** Everything goes through it: on and off, the ducking. */
  readonly master: GainNode;
  readonly regions: Readonly<Record<Region, GainNode>>;
  /** How much of the background goes into the large space. */
  readonly padSpace: GainNode;
  readonly padNear: GainNode;
  readonly bubble: GainNode;
  readonly bloom: GainNode;
  /** The chimes, near and in the space. */
  readonly chimes: GainNode;
  /** What plays all the time (the breaths, the chords of the bubble and of the finale). */
  readonly sources: AudioScheduledSourceNode[];
  /** Starts the voices of a region (at time `at`), if they are not playing. */
  wake(region: Region, at: number): void;
  /** Stops the voices of a region: it must be silent already. */
  sleep(region: Region): void;
  /** Stops everything. */
  stopAll(): void;
}

function gainNode(context: BaseAudioContext, value: number): GainNode {
  const node = context.createGain();
  node.gain.value = value;
  return node;
}

function oscillator(context: BaseAudioContext, sources: AudioScheduledSourceNode[], type: OscillatorType, freq: number, detune = 0): OscillatorNode {
  const node = context.createOscillator();
  node.type = type;
  node.frequency.value = freq;
  node.detune.value = detune;
  sources.push(node);
  return node;
}

function panner(context: BaseAudioContext, pan: number): AudioNode {
  if (typeof context.createStereoPanner !== 'function') return gainNode(context, 1);
  const node = context.createStereoPanner();
  node.pan.value = pan;
  return node;
}

/**
 * The echo of a large dark space: two channels of decaying noise, a little different from
 * each other (the space is wide), duller as they fade (high notes die first). Convolved
 * with the voices it gives a smooth reverb, not a hiss: the noise is only its shape.
 */
function spaceEcho(context: BaseAudioContext): AudioBuffer {
  const rate = context.sampleRate;
  const length = Math.round(rate * ECHO);
  const buffer = context.createBuffer(2, length, rate);
  const random = seeded(1977);
  for (let c = 0; c < 2; c++) {
    const data = buffer.getChannelData(c);
    let smooth = 0;
    for (let i = 0; i < length; i++) {
      const t = i / rate;
      // A soft start (no click), then the fade; the filter closes as the echo goes on.
      const level = Math.min(1, t / 0.03) * Math.exp(-t / 1.15);
      const close = 0.25 + 0.7 * Math.min(1, t / ECHO);
      smooth = smooth * close + (random() * 2 - 1) * (1 - close);
      data[i] = smooth * level;
    }
  }
  return buffer;
}

/** The background and its buses, silent, ready to start at `when`. */
export function buildGraph(context: BaseAudioContext, output: AudioNode, when = context.currentTime): Graph {
  const sources: AudioScheduledSourceNode[] = [];
  const random = seeded(17);
  const master = gainNode(context, 0);
  master.connect(output);

  // The large space, shared by everything.
  const space = context.createConvolver();
  space.normalize = true;
  space.buffer = spaceEcho(context);
  space.connect(gainNode(context, 0.9)).connect(master);

  // The background: near (dry) and in the space, in a proportion that follows the journey.
  const pad = gainNode(context, 1);
  const padNear = gainNode(context, 0.6);
  const padSpace = gainNode(context, 0.6);
  pad.connect(padNear).connect(master);
  pad.connect(padSpace).connect(space);

  // Three slow breaths, shared by the voices: each voice swells and settles at its own pace.
  const breaths = [0.043, 0.067, 0.091].map((rate) => oscillator(context, sources, 'sine', rate));

  const regions = {} as Record<Region, GainNode>;
  for (const region of REGIONS) {
    const level = gainNode(context, 0);
    const colour = context.createBiquadFilter();
    colour.type = 'lowpass';
    colour.frequency.value = SOUNDS[region].cutoff;
    colour.Q.value = 0.3;
    level.connect(colour).connect(pad);
    regions[region] = level;
  }

  // The voices of a region play only while it can be heard (a tablet has little to spare
  // for sound): `wake` starts them, `sleep` stops them.
  const playing = new Map<Region, { voices: AudioScheduledSourceNode[]; nodes: AudioNode[] }>();
  const wake = (region: Region, at: number): void => {
    if (playing.has(region)) return;
    const voices: AudioScheduledSourceNode[] = [];
    const nodes: AudioNode[] = [];
    SOUNDS[region].voices.forEach((voice, k) => {
      const freq = ROOT * 2 ** (voice.semitones / 12);
      // Two oscillators a few cents apart: the note breathes instead of buzzing.
      const body = gainNode(context, voice.level * 0.5 * 0.75);
      const depth = gainNode(context, voice.level * 0.5 * 0.25);
      breaths[k % breaths.length]?.connect(depth).connect(body.gain);
      for (const cents of [-5, 5]) {
        const tone = oscillator(context, voices, voice.type, freq, cents + (random() - 0.5) * 3);
        tone.connect(body);
        tone.start(Math.max(at, context.currentTime));
      }
      const place = panner(context, voice.pan);
      body.connect(place).connect(regions[region]);
      nodes.push(body, depth, place);
    });
    playing.set(region, { voices, nodes });
  };
  const sleep = (region: Region): void => {
    const asleep = playing.get(region);
    if (!asleep) return;
    playing.delete(region);
    for (const voice of asleep.voices) {
      voice.stop();
      voice.disconnect();
    }
    for (const node of asleep.nodes) node.disconnect();
  };

  // The warm chord of the bubble, and the notes that open the chord of the finale.
  const bubble = gainNode(context, 0);
  bubble.connect(pad);
  BUBBLE_CHORD.forEach((semitones, i) => {
    oscillator(context, sources, 'sine', ROOT * 2 ** (semitones / 12), (i % 2 ? 4 : -4)).connect(gainNode(context, 0.25)).connect(panner(context, i % 2 ? 0.4 : -0.4)).connect(bubble);
  });
  const bloom = gainNode(context, 0);
  bloom.connect(pad);
  BLOOM_CHORD.forEach((semitones, i) => {
    oscillator(context, sources, 'sine', ROOT * 2 ** (semitones / 12), (i % 2 ? 3 : -3)).connect(gainNode(context, 0.25)).connect(panner(context, [-0.5, 0.5, -0.2, 0.3][i] ?? 0)).connect(bloom);
  });

  // The chimes: a little near, mostly in the space.
  const chimes = gainNode(context, 1);
  chimes.connect(gainNode(context, 0.35)).connect(master);
  chimes.connect(gainNode(context, 0.9)).connect(space);

  for (const source of sources) source.start(when);
  return {
    context,
    master,
    regions,
    padSpace,
    padNear,
    bubble,
    bloom,
    chimes,
    sources,
    wake,
    sleep,
    stopAll: () => {
      for (const region of REGIONS) sleep(region);
      for (const source of sources) source.stop();
      master.disconnect();
    },
  };
}

/** The colour of the background for a point of the journey, reached in about `ease` seconds. */
export function setColour(graph: Graph, u: number, at: number, ease = 1): void {
  const weights = regionWeights(u);
  let space = 0;
  for (const region of REGIONS) {
    const sound = SOUNDS[region];
    const weight = weights[region];
    if (weight > 0) graph.wake(region, at);
    graph.regions[region].gain.setTargetAtTime(PAD * sound.level * weight, at, ease);
    space += sound.space * weight;
  }
  // Farther out, more of the sound is in the large space and less of it is near.
  graph.padSpace.gain.setTargetAtTime(0.25 + 0.75 * space, at, ease * 2);
  graph.padNear.gain.setTargetAtTime(0.85 - 0.45 * space, at, ease * 2);
}

/** The chime of a power of ten, in the style chosen. */
export function chime(graph: Graph, index: number, at: number, loudness = 1, style: ChimeStyle = CHIME_STYLE): void {
  if (style === 'none') return;
  const { context } = graph;
  const freq = chimeNote(index);
  // A struck glass: a soft mallet (no click), the note, and two faint higher partials that
  // die first. A breath: only the note, swelling and fading like the background.
  const partials: readonly [number, number, number][] = style === 'glass'
    ? [
        [1, 1, 1.3],
        [2.76, 0.1, 0.32],
        [5.4, 0.03, 0.14],
      ]
    : [[1, 1, 1.1]];
  const attack = style === 'glass' ? 0.012 : 0.45;
  for (const [ratio, level, decay] of partials) {
    const tone = context.createOscillator();
    tone.type = 'sine';
    tone.frequency.value = freq * ratio;
    const envelope = gainNode(context, 0);
    envelope.gain.setValueAtTime(0, at);
    envelope.gain.linearRampToValueAtTime(CHIME * loudness * level, at + attack);
    envelope.gain.setTargetAtTime(0, at + attack, decay);
    tone.connect(envelope).connect(graph.chimes);
    tone.start(at);
    tone.stop(at + attack + decay * 8);
  }
}

/** The bubble of her light grows: the warm chord swells over the same `seconds`. */
export function swellBubble(graph: Graph, at: number, seconds: number): void {
  const level = graph.bubble.gain;
  level.cancelScheduledValues(at);
  level.setValueAtTime(level.value, at);
  level.linearRampToValueAtTime(BUBBLE, at + Math.max(1, seconds));
}

export function fadeBubble(graph: Graph, at: number): void {
  graph.bubble.gain.cancelScheduledValues(at);
  graph.bubble.gain.setTargetAtTime(0, at, 1.2);
}

/** The wave of light leaves the dot: the chord of the finale opens, then settles a little. */
export function bloomFinale(graph: Graph, at: number): void {
  const level = graph.bloom.gain;
  level.cancelScheduledValues(at);
  level.setValueAtTime(level.value, at);
  level.linearRampToValueAtTime(BLOOM, at + 3);
  level.setTargetAtTime(BLOOM * 0.45, at + 6, 4);
}

export function closeBloom(graph: Graph, at: number): void {
  graph.bloom.gain.cancelScheduledValues(at);
  graph.bloom.gain.setTargetAtTime(0, at, 1.5);
}

export interface JourneyMoment {
  readonly u: number;
  /** The node the journey rests on, if any. */
  readonly atNode: string | null;
  /** Seconds into the finale (finaleTimeline.t). */
  readonly finaleTime: number;
  /** A page is open on top (the Golden Record): the journey almost goes quiet. */
  readonly covered: boolean;
}

export interface SoundscapeOptions {
  /** Seconds the bubble takes to grow (its radius in light-years: about one a second). */
  readonly bubbleSeconds: () => number;
  /** When the wave of light leaves the dot in the finale (the last line). */
  readonly finaleWave: number;
}

/** The sound of the journey, on the shared context. Turned on and off by a tap. */
export class Soundscape {
  private readonly options: SoundscapeOptions;
  private graph: Graph | null = null;
  private on = false;
  private lastTick: number | null = null;
  private lastFinale = 0;
  private colourU = Number.NaN;
  private atBubble = false;
  private bloomed = false;
  private covered = false;
  private release = 0;
  /** When each region was last heard, by the audio clock. */
  private readonly heard = new Map<Region, number>();

  constructor(options: SoundscapeOptions) {
    this.options = options;
    document.addEventListener('visibilitychange', () => this.level());
  }

  get enabled(): boolean {
    return this.on;
  }

  /** Call it from a tap: browsers let sound start only from one. */
  setEnabled(on: boolean, u: number): void {
    if (on === this.on) return;
    this.on = on;
    window.clearTimeout(this.release);
    if (on) {
      const out = audio();
      if (!out) {
        this.on = false;
        return;
      }
      if (!this.graph) this.graph = buildGraph(out.context, out.output);
      // The colour of here, at once; then it fades in.
      setColour(this.graph, u, out.context.currentTime, 0.05);
      this.colourU = u;
      this.level();
      return;
    }
    this.level();
    // Once it has faded, everything stops: nothing runs while the sound is off.
    const graph = this.graph;
    this.release = window.setTimeout(() => {
      if (this.on || !graph) return;
      graph.stopAll();
      if (this.graph === graph) this.graph = null;
      this.atBubble = false;
      this.bloomed = false;
    }, 1500);
  }

  /** Every frame of the journey. */
  update(moment: JourneyMoment): void {
    const tick = tickAt(moment.u);
    const crossedWave = this.lastFinale < this.options.finaleWave && moment.finaleTime >= this.options.finaleWave;
    const previous = this.lastTick;
    this.lastTick = tick;
    this.lastFinale = moment.finaleTime;
    if (moment.covered !== this.covered) {
      this.covered = moment.covered;
      this.level();
    }
    const graph = this.graph;
    if (!this.on || !graph) return;
    const now = graph.context.currentTime;

    // A chime for every power the counter ticks through.
    if (previous !== null && tick >= 0 && tick !== previous) {
      // A jump of many powers at once (a fade through night): one quiet chime, not a crowd.
      chime(graph, tick, now, Math.abs(tick - previous) > 2 ? 0.5 : 1);
    }
    if (!(Math.abs(moment.u - this.colourU) < 0.02)) {
      setColour(graph, moment.u, now);
      this.colourU = moment.u;
    }
    // A region silent for a while stops its voices (its fade is long over).
    const weights = regionWeights(moment.u);
    for (const region of REGIONS) {
      if (weights[region] > 0) this.heard.set(region, now);
      else if (now - (this.heard.get(region) ?? -Infinity) > 6) graph.sleep(region);
    }
    const atBubble = moment.atNode === 'bolla';
    if (atBubble && !this.atBubble) swellBubble(graph, now, this.options.bubbleSeconds());
    if (!atBubble && this.atBubble) fadeBubble(graph, now);
    this.atBubble = atBubble;
    if (crossedWave && !this.bloomed) {
      bloomFinale(graph, now + 0.05);
      this.bloomed = true;
    }
    // Back among the stops, the finale will open again next time.
    if (this.bloomed && moment.u < 36) {
      closeBloom(graph, now);
      this.bloomed = false;
    }
  }

  /** How loud everything is: off, hidden, under the Golden Record, or on. */
  private level(): void {
    const graph = this.graph;
    if (!graph) return;
    const target = !this.on || document.hidden ? 0 : this.covered ? DUCKED : 1;
    graph.master.gain.setTargetAtTime(target, graph.context.currentTime, target > 0 ? 0.6 : 0.15);
  }
}
