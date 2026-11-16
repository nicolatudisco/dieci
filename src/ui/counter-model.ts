/**
 * What the counter shows at a position of the journey. Pure, so it can be tested.
 *
 * Act I: «10ⁿ metri», with n the exponent rounded to the nearest integer, so the number
 * ticks once for every power of ten crossed (half-way between two powers), then the precise
 * width in friendly units. Past the observable universe the counter stops measuring: it
 * shows the number of the nearest stop of Act II, never an interpolated one.
 */
import type { Stop } from '../content/types.ts';
import { UI } from '../content/ui.ts';
import { exponentAt, nearestStop } from '../engine/journey.ts';
import { formatWidth } from './format.ts';

export interface CounterState {
  readonly mode: 'space' | 'number';
  readonly label: string;
  /** What goes in superscript after «10»: `7`, `30`, `googol`. */
  readonly exponent: string;
  /** Grows along the journey: tells the tick which way to roll. */
  readonly order: number;
  /** The width of the view in friendly units; null when the counter only counts. */
  readonly width: string | null;
  /** The line of the nearest stop, e.g. «lungo come un autobus». */
  readonly line: string;
}

/**
 * The texts of a stop as they must be shown today: a stop whose words depend on the date
 * (the bubble of her light) is handed over with the words that are true now.
 */
export type ResolveStop = (stop: Stop) => Stop;

export function counterAt(u: number, resolve: ResolveStop = (stop) => stop): CounterState {
  const node = nearestStop(u);
  const stop = node.stop ? resolve(node.stop) : null;
  if (stop?.kind === 'number') {
    return {
      mode: 'number',
      label: UI.counter.numberLabel,
      exponent: stop.exponentLabel ? stop.exponentLabel.replace(/^10\^/, '') : String(stop.exponent),
      order: 1000 + node.index,
      width: null,
      line: stop.counterLine,
    };
  }
  const e = exponentAt(u);
  const n = Math.round(e);
  return {
    mode: 'space',
    label: UI.counter.spaceLabel,
    exponent: String(n),
    order: n,
    width: formatWidth(10 ** e),
    line: stop?.counterLine ?? '',
  };
}
