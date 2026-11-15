/**
 * Personalisation from the link fragment: `#nome=Nome&nata=AAAA-MM-GG`.
 *
 * The fragment is never sent to the server. It is read once at start-up, validated,
 * kept in memory only and never stored anywhere. Without it everything still works:
 * the greeting is skipped and `{nome}` disappears from the texts.
 *
 * Every text that depends on the day is derived from the same date that drives the
 * scenes, so text and scene can never contradict each other.
 */

/** A calendar date with no time zone. `month` is 1-12. */
export interface CivilDate {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

export interface Personalization {
  readonly name: string | null;
  readonly birth: CivilDate | null;
}

const NAME_MAX_LENGTH = 24;

function cleanName(raw: string | null): string | null {
  if (!raw) return null;
  const name = raw
    .replace(/[\p{Cc}\p{Cf}<>{}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NAME_MAX_LENGTH)
    .trim();
  return /\p{L}/u.test(name) ? name : null;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Parses `AAAA-MM-GG`; returns null unless it is a real calendar date. */
export function parseCivilDate(raw: string | null): CivilDate | null {
  const match = raw ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim()) : null;
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1900 || year > 2200 || month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

/** Reads `location.hash` (with or without the leading `#`). */
export function parseHash(hash: string): Personalization {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  return { name: cleanName(params.get('nome')), birth: parseCivilDate(params.get('nata')) };
}

/** The calendar date of a `Date`, in the time zone of the device. */
export function civilDateOf(date: Date): CivilDate {
  return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() };
}

export function compareCivil(a: CivilDate, b: CivilDate): number {
  return a.year - b.year || a.month - b.month || a.day - b.day;
}

/**
 * The day someone born on `birth` turns `years`. A 29 February birthday falls on the last
 * day of February in years that have no 29th.
 */
export function birthdayAfter(birth: CivilDate, years: number): CivilDate {
  const year = birth.year + years;
  return { year, month: birth.month, day: Math.min(birth.day, daysInMonth(year, birth.month)) };
}

export type FirstLineKey = 'birthday' | 'before' | 'after' | 'unknown';

/**
 * Which variant of the first line of the opening is true today:
 * `birthday` only on the day she turns 10, `before` / `after` on any other day,
 * `unknown` when the link has no date.
 */
export function firstLineKey(birth: CivilDate | null, today: CivilDate): FirstLineKey {
  if (!birth) return 'unknown';
  const order = compareCivil(today, birthdayAfter(birth, 10));
  return order === 0 ? 'birthday' : order < 0 ? 'before' : 'after';
}

/**
 * Fills `{nome}` in a text. Without a name (and without a fallback) the placeholder is
 * removed together with the comma and the space that introduced it:
 * «Buon viaggio, {nome}!» becomes «Buon viaggio!».
 */
export function fillName(template: string, name: string | null, fallback = ''): string {
  const value = name ?? fallback;
  if (value) return template.replaceAll('{nome}', value);
  if (!template.includes('{nome}')) return template;
  const leading = /^\s*\{nome\}\s*[,:]?\s*/u;
  let text = template;
  if (leading.test(text)) {
    text = text.replace(leading, '');
    text = text.charAt(0).toLocaleUpperCase('it') + text.slice(1);
  }
  return text
    .replace(/\s*,?\s*\{nome\}/gu, '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}
