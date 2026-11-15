/**
 * Content types for "Dieci".
 *
 * All user-facing text lives in src/content/*.ts and is written in Italian.
 * The texts were written and fact-checked before development started:
 * do not rewrite them without asking Nicola (typo fixes are fine).
 */

export interface Source {
  /** Short human-readable title of the source. */
  title: string;
  url: string;
}

/**
 * - `space`: a physical scale. `exponent` is log10 of the width of the view in metres.
 * - `number`: past the observable universe, the counter stops measuring metres
 *   and starts counting pure numbers. `exponent` is log10 of the number shown.
 */
export type StopKind = 'space' | 'number';

/** Stops with dedicated interactions beyond the standard caption panel. */
export type SpecialStop = 'voyager' | 'bubble';

export interface Stop {
  /** Stable id, used in URLs (?stop=<id>) and in commit messages. */
  id: string;
  kind: StopKind;
  /** log10 of the view width in metres (`space`) or of the number (`number`). */
  exponent: number;
  /** Overrides the counter text when the exponent can't be written normally (googolplex). */
  exponentLabel?: string;
  /** Title, max ~6 words. */
  title: string;
  /** Always-visible caption, 1-3 short sentences. */
  text: string;
  /** Optional deeper dive, shown behind "Tocca per saperne di più". */
  more?: string;
  /** Optional "how do we know?" box: the method behind the fact. */
  howWeKnow?: string;
  /** Short line shown under the scale counter, e.g. "lungo come un autobus". */
  counterLine: string;
  /** Developer notes describing what the scene should show. Never shown to the user. */
  visual: string;
  /** Where the facts in this stop come from. Shown on the "Fonti" page. */
  sources: Source[];
  special?: SpecialStop;
}
