/**
 * Her Golden Record, as data: which picture, which sound, which message, and the words
 * engraved on the label. Pure, with tests (tests/golden-record-lab.test.ts).
 *
 * The engraving follows the link (CLAUDE.md, «Testi legati alla data»): her age comes from
 * the same model as the bubble (src/bubble.ts), so the disc and the bubble never disagree,
 * and her name is in it only when the link has `#nome=`. Nothing here is stored anywhere:
 * the name ends up only in the PNG she saves.
 */
import { bubbleAt } from '../bubble.ts';
import { GOLDEN_RECORD } from '../content/golden-record.ts';
import type { CivilDate } from '../personalization.ts';

export type PictureId = (typeof GOLDEN_RECORD.images)[number]['id'];
export type SoundId = (typeof GOLDEN_RECORD.sounds)[number]['id'];

export const PICTURE_IDS: readonly PictureId[] = GOLDEN_RECORD.images.map((image) => image.id);
export const SOUND_IDS: readonly SoundId[] = GOLDEN_RECORD.sounds.map((sound) => sound.id);

export interface DiscDesign {
  readonly picture: PictureId | null;
  readonly sound: SoundId | null;
  /** As she typed it (at most `MESSAGE_MAX` characters). */
  readonly message: string;
  /** True once she has pressed «Crea il mio disco»: the grooves are cut. */
  readonly made: boolean;
  /** The words engraved on the label: null until they are written, after the grooves. */
  readonly engraving: string | null;
}

export const EMPTY_DESIGN: DiscDesign = { picture: null, sound: null, message: '', made: false, engraving: null };

export const MESSAGE_MAX = GOLDEN_RECORD.message.maxLength;

/**
 * The pieces of `GOLDEN_RECORD.engraving` that the variants replace. If one of them is
 * edited away, the test fails instead of a variant silently switching off.
 */
export const ENGRAVING_ANCHORS = {
  name: 'di una scienziata',
  age: '10 anni',
} as const;

const DATE_FORMAT = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });

/** «18 novembre 2026»: the day on her device. */
export function engravingDate(now: Date): string {
  return DATE_FORMAT.format(now);
}

/** Replaces the first `piece` of `text` with `value`, taken literally (a name may contain `$`). */
function replaceOnce(text: string, piece: string, value: string): string {
  return text.replace(piece, () => value);
}

/**
 * The words engraved on her disc today: her age as the bubble counts it (only with a date
 * that the bubble trusts), her name if the link has one, and the date.
 */
export function engravingFor(now: Date, birth: CivilDate | null, name: string | null): string {
  const variants = GOLDEN_RECORD.engravingVariants;
  let text: string = GOLDEN_RECORD.engraving;
  const bubble = bubbleAt(birth, now);
  if (bubble.exact) {
    const age = bubble.years < 10 ? variants.ageBefore : variants.ageYears.replace('{anni}', String(bubble.years));
    text = replaceOnce(text, ENGRAVING_ANCHORS.age, age);
  }
  text = replaceOnce(text, '{data}', engravingDate(now));
  // The name last, so that nothing after it can touch what it says.
  if (name) text = replaceOnce(text, ENGRAVING_ANCHORS.name, variants.named.replace('{nome}', () => name));
  return text;
}

/**
 * The engraving on two arcs of the label: up to the first « · » along the top, the rest
 * along the bottom. The words are not changed: `top + ' · ' + bottom` is the text.
 */
export function splitEngraving(text: string): { readonly top: string; readonly bottom: string } {
  const at = text.indexOf(' · ');
  return at < 0 ? { top: text, bottom: '' } : { top: text.slice(0, at), bottom: text.slice(at + 3) };
}

const SEGMENTER = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('it', { granularity: 'grapheme' }) : null;

/** The characters as she sees them: an emoji, or a letter with its accent, is one. */
export function characters(text: string): string[] {
  return SEGMENTER ? Array.from(SEGMENTER.segment(text), (part) => part.segment) : Array.from(text);
}

export function countCharacters(text: string): number {
  return characters(text).length;
}

/** The message cut at `max` characters (as she counts them). */
export function clampMessage(text: string, max = MESSAGE_MAX): string {
  const parts = characters(text);
  return parts.length <= max ? text : parts.slice(0, max).join('');
}

/** «1 carattere su 140», «23 caratteri su 140». */
export function counterText(count: number): string {
  return count === 1 ? GOLDEN_RECORD.message.counterOne : GOLDEN_RECORD.message.counter.replace('{n}', String(count));
}

/** The message as it is engraved around the edge: one line, single spaces. */
export function ringText(message: string): string {
  return message.replace(/\s+/g, ' ').trim();
}
