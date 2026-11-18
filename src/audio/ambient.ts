/**
 * «Il cielo che respira», played: the background, the chimes of the powers of ten, the
 * warm chord of the bubble and the music box of the finale (src/audio/soundscape.ts says
 * what they are). Everything is synthesised; nothing plays until she turns the sound on
 * with a tap, and it goes quiet when the tab is hidden or the Golden Record is open.
 *
 * `buildGraph` works on any context, so the same code can be rendered offline (that is how
 * its levels were checked); `Soundscape` plays it on the shared context of
 * src/audio/context.ts.
 */
import { seeded } from '../golden-record/random.ts';
import { SCORES } from '../golden-record/scores.ts';
import { renderScore } from '../golden-record/synth.ts';
import { audio } from './context.ts';
import { BUBBLE_CHORD, REGIONS, ROOT, SOUNDS, regionWeights, tickAt, tickPartials, type Region } from './soundscape.ts';

/** How loud each part is: low. It is a breath under the journey, not music to listen to. */
const PAD = 0.075;
const AIR = 0.05;
const SHIMMER = 0.022;
const BUBBLE = 0.12;
const CHIME = 0.16;
/** The music box of the finale, over the levels of synth.ts. */
const CARILLON = 0.75;
/** While the Golden Record is open its own sounds must be heard: the journey almost stops. */
const DUCKED = 0.1;

export interface Graph {
  readonly context: BaseAudioContext;
  /** Everything goes through it: on and off, the ducking. */
  readonly master: GainNode;
  readonly regions: Readonly<Record<Region, GainNode>>;
  readonly air: GainNode;
  readonly shimmer: GainNode;
  readonly bubble: GainNode;
  readonly chimes: GainNode;
  readonly carillon: GainNode;
  readonly sources: AudioScheduledSourceNode[];
}

function gainNode(context: BaseAudioContext, value: number): GainNode {
  const node = context.createGain();
  node.gain.value = value;
  return node;
}

function oscillator(context: BaseAudioContext, sources: AudioScheduledSourceNode[], type: OscillatorType, freq: number): OscillatorNode {
  const node = context.createOscillator();
  node.type = type;
  node.frequency.value = freq;
  sources.push(node);
  return node;
}

/** The background and its buses, silent, ready to start at `when`. */
export function buildGraph(context: BaseAudioContext, output: AudioNode, when = context.currentTime): Graph {
  const sources: AudioScheduledSourceNode[] = [];
  const random = seeded(17);
  const master = gainNode(context, 0);
  master.connect(output);

  // The breath: the whole background swells and settles, very slowly.
  const pad = gainNode(context, 1);
  const breath = gainNode(context, 0.82);
  pad.connect(breath).connect(master);
  const lung = oscillator(context, sources, 'sine', 0.07);
  lung.connect(gainNode(context, 0.18)).connect(breath.gain);

  const regions = {} as Record<Region, GainNode>;
  for (const region of REGIONS) {
    const sound = SOUNDS[region];
    const level = gainNode(context, 0);
    const colour = context.createBiquadFilter();
    colour.type = 'lowpass';
    colour.frequency.value = sound.cutoff;
    colour.Q.value = 0.4;
    level.connect(colour).connect(pad);
    for (const voice of sound.voices) {
      // Each voice a few cents off true: the chord breathes instead of buzzing.
      const tone = oscillator(context, sources, voice.type, ROOT * 2 ** (voice.semitones / 12));
      tone.detune.value = (random() - 0.5) * 9;
      tone.connect(gainNode(context, voice.level)).connect(level);
    }
    regions[region] = level;
  }

  // The wind of the stars: noise through a band that wanders slowly.
  const noise = context.createBuffer(1, Math.round(context.sampleRate * 3), context.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = random() * 2 - 1;
  const wind = context.createBufferSource();
  wind.buffer = noise;
  wind.loop = true;
  sources.push(wind);
  const band = context.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 1800;
  band.Q.value = 0.7;
  const drift = oscillator(context, sources, 'sine', 0.031);
  drift.connect(gainNode(context, 700)).connect(band.frequency);
  const air = gainNode(context, 0);
  wind.connect(band).connect(air).connect(master);

  // High glints that tremble.
  const shimmer = gainNode(context, 0);
  const tremble = gainNode(context, 0.6);
  const flutter = oscillator(context, sources, 'sine', 0.8);
  flutter.connect(gainNode(context, 0.4)).connect(tremble.gain);
  tremble.connect(shimmer).connect(master);
  for (const semitones of [43, 48, 55]) oscillator(context, sources, 'sine', ROOT * 2 ** (semitones / 12)).connect(gainNode(context, 0.33)).connect(tremble);

  // The warm chord of the bubble.
  const bubble = gainNode(context, 0);
  bubble.connect(master);
  for (const semitones of BUBBLE_CHORD) oscillator(context, sources, 'sine', ROOT * 2 ** (semitones / 12)).connect(gainNode(context, 0.25)).connect(bubble);

  const chimes = gainNode(context, 1);
  chimes.connect(master);
  const carillon = gainNode(context, CARILLON);
  carillon.connect(master);

  for (const source of sources) source.start(when);
  return { context, master, regions, air, shimmer, bubble, chimes, carillon, sources };
}

/** The colour of the background for a point of the journey, reached in about `ease` seconds. */
export function setColour(graph: Graph, u: number, at: number, ease = 0.8): void {
  const weights = regionWeights(u);
  let air = 0;
  let shimmer = 0;
  for (const region of REGIONS) {
    const sound = SOUNDS[region];
    const weight = weights[region];
    graph.regions[region].gain.setTargetAtTime(PAD * sound.level * weight, at, ease);
    air += sound.air * weight;
    shimmer += sound.shimmer * weight;
  }
  graph.air.gain.setTargetAtTime(AIR * air, at, ease);
  graph.shimmer.gain.setTargetAtTime(SHIMMER * shimmer, at, ease);
}

/** A chime: the partials of `tickPartials`, struck like glass, ringing for a moment. */
export function chime(graph: Graph, index: number, at: number, loudness = 1): void {
  const { context } = graph;
  for (const partial of tickPartials(index)) {
    const tone = context.createOscillator();
    tone.type = 'sine';
    tone.frequency.value = partial.freq;
    const envelope = gainNode(context, 0);
    envelope.gain.setValueAtTime(0, at);
    envelope.gain.linearRampToValueAtTime(CHIME * loudness * partial.gain, at + 0.006);
    envelope.gain.setTargetAtTime(0, at + 0.006, 0.55);
    tone.connect(envelope).connect(graph.chimes);
    tone.start(at);
    tone.stop(at + 3.5);
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
  graph.bubble.gain.setTargetAtTime(0, at, 1.1);
}

/** «Tanti auguri» on the music box of the Golden Record. */
export function playCarillon(graph: Graph, at: number): void {
  renderScore(SCORES.compleanno, graph.context, graph.carillon, at);
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
  private covered = false;
  private release = 0;

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
      for (const source of graph.sources) source.stop();
      graph.master.disconnect();
      if (this.graph === graph) this.graph = null;
      this.atBubble = false;
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
    const atBubble = moment.atNode === 'bolla';
    if (atBubble && !this.atBubble) swellBubble(graph, now, this.options.bubbleSeconds());
    if (!atBubble && this.atBubble) fadeBubble(graph, now);
    this.atBubble = atBubble;
    if (crossedWave) playCarillon(graph, now + 0.05);
  }

  /** How loud everything is: off, hidden, under the Golden Record, or on. */
  private level(): void {
    const graph = this.graph;
    if (!graph) return;
    const target = !this.on || document.hidden ? 0 : this.covered ? DUCKED : 1;
    graph.master.gain.setTargetAtTime(target, graph.context.currentTime, target > 0 ? 0.6 : 0.15);
  }
}
