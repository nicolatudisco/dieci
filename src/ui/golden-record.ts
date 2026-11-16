/**
 * The Golden Record. In M1 only the story (`GOLDEN_RECORD.intro`) with a way back to the
 * journey: M4 gives the story its scene, M7 adds the lab («Crea il tuo Disco d'oro»).
 * Until the lab exists the epilogue does not offer it: see `GOLDEN_RECORD_LAB_READY`.
 */
import { GOLDEN_RECORD } from '../content/golden-record.ts';
import { button, el, icon } from './dom.ts';
import type { OverlayPage } from './overlay.ts';
import { setRich, typeset } from './rich-text.ts';

/** M7 sets this to true when the lab can really make a disc. */
export const GOLDEN_RECORD_LAB_READY = false;

export function buildGoldenRecord(titleId: string, close: () => void): OverlayPage {
  const page = el('article', 'sheet record');
  // The disc: grooves and a label in the middle, drawn with CSS.
  const disc = el('div', 'record__disc');
  disc.setAttribute('aria-hidden', 'true');
  const title = el('h1', 'sheet__title', GOLDEN_RECORD.title);
  title.id = titleId;
  const story = el('p', 'sheet__intro');
  setRich(story, typeset(GOLDEN_RECORD.intro));
  const back = button('cta sheet__back');
  back.append(icon('back'), el('span', undefined, GOLDEN_RECORD.actions.back));
  back.addEventListener('click', close);
  page.append(disc, title, story, back);
  return { element: page };
}
