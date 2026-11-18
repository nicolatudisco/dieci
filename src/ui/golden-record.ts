/**
 * The Golden Record: the story (`GOLDEN_RECORD.intro`), with the disc turning above it,
 * then the lab, «Crea il tuo Disco d'oro» (src/golden-record/lab.ts). It opens from the
 * Voyager stop («Che cosa porta con sé?», at the story) and from the epilogue (at the lab),
 * and gives the journey back where it was.
 */
import { GOLDEN_RECORD } from '../content/golden-record.ts';
import { UI } from '../content/ui.ts';
import { Lab } from '../golden-record/lab.ts';
import type { CivilDate } from '../personalization.ts';
import { button, el, icon } from './dom.ts';
import type { OverlayPage } from './overlay.ts';
import { RecordDisc } from './record-disc.ts';
import { Reveal } from './reveal.ts';
import { setRich, typeset } from './rich-text.ts';

/**
 * True once the lab can really make a disc: the button of the epilogue becomes «Crea il tuo
 * Disco d'oro» and opens the page at the lab.
 */
export const GOLDEN_RECORD_LAB_READY = true;

/** The part of the page that `?disco=` and the epilogue can open at. */
export const LAB_PART = 'laboratorio';
/** `?disco=fatto`: the lab with a disc already made (for the screenshots). */
export const DEMO_PART = 'fatto';

export interface GoldenRecordOptions {
  /** False with ?static=1: everything is there at once, and nothing moves. */
  readonly animated: boolean;
  readonly reducedMotion: boolean;
  /** Today, from the clock of the site. */
  readonly now: () => Date;
  /** From the link fragment only. */
  readonly name: string | null;
  readonly birth: CivilDate | null;
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

function backButton(close: () => void, className: string): HTMLButtonElement {
  const back = button(className);
  back.append(icon('back'), el('span', undefined, GOLDEN_RECORD.actions.back));
  back.addEventListener('click', close);
  return back;
}

export function buildGoldenRecord(titleId: string, close: () => void, options: GoldenRecordOptions): OverlayPage {
  const page = el('article', 'record-page');
  const story = el('div', 'sheet record');
  const disc = new RecordDisc({ spinning: options.animated && !options.reducedMotion });

  const text = el('div', 'record__text');
  const title = el('h1', 'sheet__title record__title');
  setRich(title, typeset(GOLDEN_RECORD.title));
  title.id = titleId;
  const { body, closing } = splitClosing(GOLDEN_RECORD.intro);
  const words = el('p', 'record__story');
  quoteParts(body).forEach((part, index) => {
    if (!part) return;
    const span = el('span', index % 2 === 1 ? 'record__quote' : undefined);
    setRich(span, typeset(part));
    words.append(span);
  });
  const end = el('p', 'record__closing');
  setRich(end, typeset(closing));

  const lab = new Lab(
    {
      motion: !options.animated ? 'none' : options.reducedMotion ? 'reduced' : 'full',
      now: options.now,
      name: options.name,
      birth: options.birth,
    },
    backButton(close, 'choice sheet__back lab__back'),
  );
  const toLab = (): void => {
    lab.heading.scrollIntoView({ behavior: options.animated && !options.reducedMotion ? 'smooth' : 'auto', block: 'start' });
    lab.heading.setAttribute('tabindex', '-1');
    lab.heading.focus({ preventScroll: true });
  };

  // Under the story: on to the lab, or back to the journey.
  const buttons = el('div', 'record__buttons');
  const make = button('cta record__make');
  setRich(make, typeset(UI.end.goldenRecord));
  make.addEventListener('click', toLab);
  buttons.append(make, backButton(close, 'choice'));

  text.append(title, words);
  if (closing) text.append(end);
  text.append(buttons);
  story.append(disc.element, text);
  page.append(story, lab.element);

  // The disc first, then the story, then the line about her. A tap brings everything in.
  const reveal = new Reveal(closing ? [disc.element, title, words, end] : [disc.element, title, words], {
    animated: options.animated,
    first: 120,
    step: 750,
  });
  story.addEventListener('click', () => reveal.finish());

  return {
    element: page,
    shown: (at) => {
      reveal.reset();
      disc.start();
      lab.shown();
      if (at !== LAB_PART && at !== DEMO_PART) {
        reveal.start();
        return;
      }
      // Straight to the lab: the story is all there for whoever scrolls up.
      reveal.finish();
      if (at === DEMO_PART) lab.demo();
      lab.heading.scrollIntoView({ block: 'start' });
      return lab.heading;
    },
    hidden: () => {
      disc.stop();
      lab.hidden();
    },
  };
}
