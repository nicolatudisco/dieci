/**
 * The only source of time.
 *
 * - `time` / `dt` drive animations. With ?static=1 they stay at zero, so every
 *   time-based effect is frozen and screenshots are reproducible.
 * - `now()` is "today" for everything that depends on the date (the first line of the
 *   opening, the Voyager counter, the bubble). With ?static=1 it is the fixed moment
 *   VOYAGER_1.lightDayDateUTC. Texts and scenes must all read the date from here.
 */
import { VOYAGER_1 } from '../content/data.ts';

/** Longest step the simulation accepts, in seconds (a hidden tab resumes without a jump). */
const MAX_DT = 0.1;

export class Clock {
  readonly isStatic: boolean;
  /** Seconds of animation time since the start. */
  time = 0;
  /** Seconds since the previous frame. */
  dt = 0;
  private last: number | null = null;

  constructor(isStatic: boolean) {
    this.isStatic = isStatic;
  }

  /** Call once per frame with the `requestAnimationFrame` timestamp. */
  tick(timestampMs: number): void {
    if (this.isStatic) return;
    this.dt = this.last === null ? 0 : Math.min(MAX_DT, Math.max(0, (timestampMs - this.last) / 1000));
    this.last = timestampMs;
    this.time += this.dt;
  }

  now(): Date {
    return this.isStatic ? new Date(VOYAGER_1.lightDayDateUTC) : new Date();
  }
}
