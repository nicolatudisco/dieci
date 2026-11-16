/**
 * Adaptive quality: when the device cannot keep up, draw less instead of stuttering.
 *
 * It watches a moving average of the frame time and moves along a short ladder: fewer
 * device pixels first, then fewer particles too. It goes down quickly (a second and a half
 * of slow frames) and comes back up slowly and carefully; if a step up turns out to be too
 * much it gives it up for a long while, so the picture never flickers between two levels.
 *
 * Pure logic, no DOM: the engine feeds it the time of every frame.
 */
export interface QualityLevel {
  /** Multiplier of the device pixel ratio. */
  readonly pixelRatio: number;
  /** Share of particles the levels should draw. */
  readonly particles: number;
}

export const QUALITY_LADDER: readonly QualityLevel[] = [
  { pixelRatio: 1, particles: 1 },
  { pixelRatio: 0.8, particles: 1 },
  { pixelRatio: 0.66, particles: 0.7 },
  { pixelRatio: 0.5, particles: 0.45 },
];

/** Seconds over which the frame time is averaged. */
const AVERAGE_TAU = 0.8;
/** Slower than this (about 43 fps) for `DOWN_AFTER` seconds: one step down. */
const SLOW_FRAME = 0.0232;
const DOWN_AFTER = 1.5;
/** Faster than this (about 58 fps) for `UP_AFTER` seconds: try one step up. */
const FAST_FRAME = 0.0172;
const UP_AFTER = 8;
/** After a step up that had to be undone, do not try again for this long. */
const GIVE_UP_FOR = 90;
/** After any change, seconds to wait before judging again: the frames around a resize do not count. */
const SETTLE = 1;
/** Frames longer than this are pauses (a hidden tab, a page load), not slowness. */
const PAUSE = 0.09;

export class AdaptiveQuality {
  /** Index in the ladder: 0 is the best. */
  level = 0;
  private average = 1 / 60;
  private slowFor = 0;
  private fastFor = 0;
  private noUpFor = 0;
  private sinceUp = Infinity;
  private settling = 0;

  get current(): QualityLevel {
    return QUALITY_LADDER[this.level] ?? { pixelRatio: 1, particles: 1 };
  }

  /** Feeds the time of one frame, in seconds. Returns true when the level has changed. */
  step(dt: number): boolean {
    if (dt <= 0 || dt >= PAUSE) return false;
    const k = 1 - Math.exp(-dt / AVERAGE_TAU);
    this.average += (dt - this.average) * k;
    this.noUpFor = Math.max(0, this.noUpFor - dt);
    this.sinceUp += dt;
    if (this.settling > 0) {
      this.settling -= dt;
      return false;
    }

    this.slowFor = this.average > SLOW_FRAME ? this.slowFor + dt : 0;
    this.fastFor = this.average < FAST_FRAME ? this.fastFor + dt : 0;

    if (this.slowFor >= DOWN_AFTER && this.level < QUALITY_LADDER.length - 1) {
      this.level++;
      // Slow again right after a step up: that step was too much.
      if (this.sinceUp < 2 * DOWN_AFTER + SETTLE + 2) this.noUpFor = GIVE_UP_FOR;
      this.reset();
      return true;
    }
    if (this.fastFor >= UP_AFTER && this.level > 0 && this.noUpFor === 0) {
      this.level--;
      this.sinceUp = 0;
      this.reset();
      return true;
    }
    return false;
  }

  /** After a change the measure starts again. */
  private reset(): void {
    this.slowFor = 0;
    this.fastFor = 0;
    this.average = 1 / 60;
    this.settling = SETTLE;
  }
}
