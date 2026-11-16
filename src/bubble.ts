/**
 * The bubble of her light: the one model behind the scene of the stop `bolla` and its
 * texts, so that picture and words never disagree.
 *
 * The light that left the Earth on the day she was born has travelled, in every direction,
 * for as long as she has lived: the radius of the bubble in light-years is her age in years.
 * With `#nata=` in the link that age is the real one, today; without it the bubble is the
 * bubble of a tenth birthday, ten light-years, and the texts are the ones in levels.ts.
 *
 * Pure: no DOM, no three.js.
 */
import { NEARBY_STARS, type NearbyStar } from './content/data.ts';
import type { Stop } from './content/types.ts';
import { UI } from './content/ui.ts';
import { birthdayAfter, type CivilDate } from './personalization.ts';
import { formatNumber } from './ui/format.ts';

/** The bubble this site was made for. */
const TEN = 10;
/**
 * A date that makes her much younger than ten is not the date of this gift (a typo, a
 * test): the bubble falls back to the ten light-years of the texts as written.
 */
const YOUNGEST = 9.5;

export interface BubbleStar {
  readonly star: NearbyStar;
  /** True when the light of her birthday has reached it. */
  readonly reached: boolean;
}

export interface Bubble {
  /** Radius in light-years: her age in years today, or 10 without a date. */
  readonly radius: number;
  /** True when the radius comes from her date of birth. */
  readonly exact: boolean;
  /** Her age in whole years (10 without a date). */
  readonly years: number;
  /** The radius with one decimal, cut and never rounded up: the light has really got there. */
  readonly tenths: number;
  /**
   * `before` her tenth birthday, `birthday` on a birthday and in the weeks after it (while
   * the radius still reads as a whole number), `after` for the rest of the year.
   */
  readonly phase: 'before' | 'birthday' | 'after';
  /** The stars of data.ts, nearest first. */
  readonly stars: readonly BubbleStar[];
}

function localMidnight(date: CivilDate): number {
  return new Date(date.year, date.month - 1, date.day).getTime();
}

/**
 * Age in years at `now`: the birthdays passed, plus the share of the year since the last
 * one. Counted on the calendar, so that on a birthday it is a whole number exactly (ten
 * calendar years are a day or two short of ten light-years' worth of days: far less than
 * anything shown here).
 */
export function ageInYears(birth: CivilDate, now: Date): number {
  const ms = now.getTime();
  let years = now.getFullYear() - birth.year;
  if (localMidnight(birthdayAfter(birth, years)) > ms) years--;
  const last = localMidnight(birthdayAfter(birth, years));
  const next = localMidnight(birthdayAfter(birth, years + 1));
  return years + (ms - last) / (next - last);
}

export function bubbleAt(birth: CivilDate | null, now: Date): Bubble {
  const age = birth ? ageInYears(birth, now) : TEN;
  const exact = birth !== null && age >= YOUNGEST;
  const radius = exact ? age : TEN;
  const years = Math.floor(radius);
  // A hair of tolerance, so that 10.3 computed as 10.299999 still reads «10,3».
  const tenths = Math.floor(radius * 10 + 1e-9) / 10;
  const phase = radius < TEN ? 'before' : tenths === years ? 'birthday' : 'after';
  const stars = [...NEARBY_STARS].sort((a, b) => a.ly - b.ly).map((star) => ({ star, reached: star.ly <= radius }));
  return { radius, exact, years, tenths, phase, stars };
}

/** The radius as the texts write it: «10», «10,3». */
export function formatRadius(bubble: Bubble): string {
  return formatNumber(bubble.tenths, 1);
}

/** `UI.bubble.exactRadius`, filled; null when the link has no date. */
export function exactRadiusLine(bubble: Bubble): string | null {
  return bubble.exact ? UI.bubble.exactRadius.replace('{al}', formatRadius(bubble)) : null;
}

/**
 * The words of the stop `bolla` in levels.ts that depend on her age. `bubbleStop` replaces
 * them; tests/bubble.test.ts checks that each is still there, so that an edit of the texts
 * cannot silently switch a variant off.
 */
export const BUBBLE_ANCHORS = {
  title: `10 anni`,
  travelling: `viaggia da 10 anni`,
  radius: `un raggio di 10 anni-luce`,
  epsilonLater: `Quando avrai 10 anni e mezzo, la tua luce raggiungerà Epsilon Eridani, una stella più giovane del Sole.`,
  cygniOutside: `Appena fuori dalla tua bolla.`,
} as const;

function distanceOf(name: string): number {
  const star = NEARBY_STARS.find((s) => s.name === name);
  if (!star) throw new Error(`No star called "${name}" in data.ts`);
  return star.ly;
}

/**
 * The stop `bolla` with the texts that are true today. Without a date of birth the stop is
 * returned as it is.
 */
export function bubbleStop(stop: Stop, bubble: Bubble): Stop {
  if (!bubble.exact) return stop;
  const variants = UI.bubble.variants;
  const years = String(Math.max(TEN, bubble.years));
  const span = variants.span[bubble.phase].replace('{anni}', years);
  const title = bubble.years > TEN ? stop.title.replace(BUBBLE_ANCHORS.title, variants.titleYears.replace('{anni}', years)) : stop.title;
  const text = stop.text
    .replace(BUBBLE_ANCHORS.travelling, BUBBLE_ANCHORS.travelling.replace('10', span))
    .replace(BUBBLE_ANCHORS.radius, BUBBLE_ANCHORS.radius.replace('10', span));
  const more = bubble.radius >= distanceOf('Epsilon Eridani') ? stop.more?.replace(BUBBLE_ANCHORS.epsilonLater, variants.epsilonReached) : stop.more;
  const howWeKnow = bubble.radius >= distanceOf('61 Cygni') ? stop.howWeKnow?.replace(BUBBLE_ANCHORS.cygniOutside, variants.cygniReached) : stop.howWeKnow;
  return { ...stop, title, text, more, howWeKnow, counterLine: variants.counterLine.replace('{al}', formatRadius(bubble)) };
}
