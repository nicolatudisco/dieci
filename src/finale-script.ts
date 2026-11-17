/**
 * The script of the finale: what is said, in which order, and when.
 *
 * The words are Nicola's (content/finale.ts) and are never changed here. The message is cut
 * where he cut it: an empty line separates two stanzas, a single line break stays a line
 * break. Every line arrives on its own beat, with a generous time to read it; the two
 * bridge sentences come first and then leave the place to the message, which stays.
 *
 * One timeline (seconds since the journey stopped on the finale) moves both the text
 * (ui/finale.ts) and the scene (levels/finale.ts), so they can never fall out of step.
 * Pure: no DOM. The timeline is ticked by whoever owns the frame loop.
 */
import { FINALE } from './content/finale.ts';

export interface ScriptLine {
  readonly text: string;
  /** Which stanza the line belongs to. */
  readonly stanza: number;
  /** A line said under one's breath: it is written in brackets. */
  readonly aside: boolean;
  /** The last line of the message, when it stands alone: what the whole finale is for. */
  readonly closing: boolean;
}

export interface FinaleScript {
  readonly bridge: readonly string[];
  readonly lines: readonly ScriptLine[];
  /** Seconds at which each bridge sentence appears, and at which they all leave. */
  readonly bridgeAt: readonly number[];
  readonly bridgeOut: number;
  /** Seconds at which each line of the message appears. */
  readonly lineAt: readonly number[];
  /** Everything has been said: the way on appears. */
  readonly end: number;
  /**
   * What the scene does, and when (seconds; Infinity when the message has no such line):
   * the circles open, their numbers slip away, the lens opens on the warm dot, the stars
   * come out, a shooting star crosses, the wave of light leaves the dot.
   */
  readonly cues: {
    readonly circles: number;
    readonly numbersAway: number;
    readonly dot: number;
    readonly stars: number;
    readonly aside: number;
    readonly wave: number;
  };
}

/** Seconds before the first words: the warm dot alone in the dark. */
const SILENCE = 1.5;
/** Seconds the bridge sentences take to leave, before the message starts. */
const BRIDGE_LEAVES = 1.3;
/** Seconds after the last line before the way on appears. */
const AFTER_LAST = 3.4;

/** The message as Nicola cut it: stanzas, and lines inside each stanza. Nothing is dropped. */
export function stanzasOf(message: string): string[][] {
  return message
    .replace(/\r\n?/g, '\n')
    .split(/\n[ \t]*\n+/)
    .map((stanza) => stanza.split('\n').filter((line) => line.trim().length > 0))
    .filter((stanza) => stanza.length > 0);
}

/** A generous time to read a text, in seconds, for a reader who is ten. */
export function readingSeconds(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.min(18, 1.7 + 0.48 * words);
}

export function buildScript(bridge: readonly string[], message: string): FinaleScript {
  const stanzas = stanzasOf(message);
  const total = stanzas.reduce((sum, stanza) => sum + stanza.length, 0);
  const lines: ScriptLine[] = [];
  stanzas.forEach((stanza, s) => {
    stanza.forEach((text) => {
      const isLast = lines.length === total - 1;
      lines.push({ text, stanza: s, aside: /^\s*\(.*\)\s*$/.test(text), closing: isLast && stanza.length === 1 && total > 1 });
    });
  });

  let t = SILENCE;
  const bridgeAt = bridge.map((sentence) => {
    const at = t;
    t += readingSeconds(sentence);
    return at;
  });
  const bridgeOut = t;
  if (bridge.length > 0) t += BRIDGE_LEAVES;
  const lineAt = lines.map((line, i) => {
    const at = t;
    // A breath more between two stanzas.
    t += readingSeconds(line.text) + (lines[i + 1] && lines[i + 1]?.stanza !== line.stanza ? 0.7 : 0);
    return at;
  });
  const lastAt = lineAt[lineAt.length - 1];
  const end = lastAt === undefined ? bridgeOut + 1 : lastAt + AFTER_LAST;

  const when = (index: number): number => lineAt[index] ?? Infinity;
  const dot = lines.findIndex((line) => /pallino/i.test(line.text));
  const aside = lines.findIndex((line) => line.aside);
  const stars = dot >= 0 ? lines.findIndex((line, i) => i > dot && line.stanza !== lines[dot]?.stanza) : -1;
  return {
    bridge,
    lines,
    bridgeAt,
    bridgeOut,
    lineAt,
    end,
    cues: {
      circles: bridgeAt[0] ?? SILENCE,
      numbersAway: bridgeAt[1] ?? (bridgeAt[0] ?? SILENCE) + 3,
      dot: when(dot),
      stars: when(stars),
      aside: when(aside),
      wave: lines.length > 0 ? when(lines.length - 1) : Infinity,
    },
  };
}

export class FinaleTimeline {
  readonly script: FinaleScript;
  /** Seconds since the journey stopped on the finale. */
  t = 0;
  private running = false;
  private frozen = false;

  constructor(script: FinaleScript) {
    this.script = script;
  }

  /**
   * Time stands still (?static=1): the finale is shown with everything said, or, for the
   * screenshots of what happens on the way, at second `at` of its sequence.
   */
  freeze(at?: number): void {
    this.frozen = true;
    this.running = false;
    this.t = at ?? this.script.end + 60;
  }

  get complete(): boolean {
    return this.t >= this.script.end;
  }

  /** The journey stands on the finale: the sequence starts, or goes on. */
  arrive(): void {
    if (!this.frozen) this.running = true;
  }

  /** The journey is back among the stops: next time the finale starts again. */
  leave(): void {
    if (this.frozen) return;
    this.running = false;
    this.t = 0;
  }

  tick(dt: number): void {
    if (this.running && dt > 0) this.t = Math.min(this.t + dt, this.script.end + 60);
  }

  /** The reader does not want to wait: the next words come now. False when all has been said. */
  advance(): boolean {
    if (this.frozen || this.complete) return false;
    const { bridgeAt, lineAt, end } = this.script;
    const next = [...bridgeAt, ...lineAt, end].find((at) => at > this.t + 0.05);
    this.t = next ?? end;
    this.running = true;
    return true;
  }
}

/** The one timeline of the finale, shared by its text and its scene. */
export const finaleTimeline = new FinaleTimeline(buildScript(FINALE.bridge, FINALE.message));
