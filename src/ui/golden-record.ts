/**
 * The Golden Record: the story (`GOLDEN_RECORD.intro`), with the disc turning above it. It
 * opens from the Voyager stop («Che cosa porta con sé?») and from the epilogue, and gives
 * the journey back where it was.
 *
 * M7 adds the lab under the story («Adesso tocca a te», `GOLDEN_RECORD.yourTurn` and the
 * rest): append it to `text`, before the button, and set `GOLDEN_RECORD_LAB_READY`, which
 * also turns the button of the epilogue into «Crea il tuo Disco d'oro».
 */
import { GOLDEN_RECORD } from '../content/golden-record.ts';
import { button, el, icon } from './dom.ts';
import type { OverlayPage } from './overlay.ts';
import { RecordDisc } from './record-disc.ts';
import { Reveal } from './reveal.ts';
import { setRich, typeset } from './rich-text.ts';

/** M7 sets this to true when the lab can really make a disc. */
export const GOLDEN_RECORD_LAB_READY = false;

export interface GoldenRecordOptions {
  /** False with ?static=1: everything is there at once, and nothing moves. */
  readonly animated: boolean;
  readonly reducedMotion: boolean;
}

/**
 * The last sentence of the story is its closing line, shown on its own (it is the one
 * about her). The words are not changed: `body + ' ' + closing` is the text.
 */
export function splitClosing(text: string): { readonly body: string; readonly closing: string } {
  const match = /^([\s\S]*[.!?»])\s+([^.!?]+[.!?])\s*$/.exec(text.trim());
  return match ? { body: match[1] ?? '', closing: match[2] ?? '' } : { body: text.trim(), closing: '' };
}

/** The text cut around what is said aloud on the record, «between guillemets»: odd parts are the quotes. */
export function quoteParts(text: string): string[] {
  return text.split(/(«[^»]*»)/);
}

export function buildGoldenRecord(titleId: string, close: () => void, options: GoldenRecordOptions): OverlayPage {
  const page = el('article', 'sheet record');
  const disc = new RecordDisc({ spinning: options.animated && !options.reducedMotion });

  const text = el('div', 'record__text');
  const title = el('h1', 'sheet__title record__title');
  setRich(title, typeset(GOLDEN_RECORD.title));
  title.id = titleId;
  const { body, closing } = splitClosing(GOLDEN_RECORD.intro);
  const story = el('p', 'record__story');
  quoteParts(body).forEach((part, index) => {
    if (!part) return;
    const span = el('span', index % 2 === 1 ? 'record__quote' : undefined);
    setRich(span, typeset(part));
    story.append(span);
  });
  const end = el('p', 'record__closing');
  setRich(end, typeset(closing));
  const back = button('cta sheet__back');
  back.append(icon('back'), el('span', undefined, GOLDEN_RECORD.actions.back));
  back.addEventListener('click', close);
  text.append(title, story);
  if (closing) text.append(end);
  text.append(back);
  page.append(disc.element, text);

  // The disc first, then the story, then the line about her. A tap brings everything in.
  const reveal = new Reveal(closing ? [disc.element, title, story, end] : [disc.element, title, story], {
    animated: options.animated,
    first: 120,
    step: 750,
  });
  page.addEventListener('click', () => reveal.finish());

  return {
    element: page,
    shown: () => {
      reveal.reset();
      reveal.start();
      disc.start();
    },
    hidden: () => disc.stop(),
  };
}
