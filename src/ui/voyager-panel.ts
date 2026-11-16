/**
 * The live panel of the Voyager stop, under the caption: how far the probe is at this very
 * moment, how much that changed since the page was opened, the light-day milestone, and
 * the button that opens the Golden Record.
 *
 * Every number comes from src/voyager.ts, the same model that places the probe in the
 * scene. The distance is the one from the Earth: for about three months a year it shrinks
 * (the Earth runs after the probe faster than the probe runs away), and then the second
 * sentence says so instead of saying something false.
 */
import { UI } from '../content/ui.ts';
import { voyagerDistanceKm, voyagerMilestone } from '../voyager.ts';
import { button, el } from './dom.ts';
import { formatNumber } from './format.ts';
import { typeset } from './rich-text.ts';

export interface VoyagerPanelOptions {
  /** «Now», from the one clock of the site (fixed with ?static=1). */
  readonly now: () => Date;
  /** When the page was opened. */
  readonly openedAt: Date;
  readonly openGoldenRecord: () => void;
}

/**
 * A sentence with a number in it: the text before `{km}`, the number, the text after.
 *
 * With `boxed`, every character of the number sits in a box of its own: the display
 * typeface has no digits of equal width, and a number that runs must not tremble.
 */
function sentence(className: string, boxed = false): { root: HTMLParagraphElement; set: (template: string, km: number) => void } {
  const root = el('p', className);
  const before = el('span');
  const figure = el('span', 'live__figure');
  const after = el('span');
  root.append(before, figure, after);
  // Boxed digits would be read aloud one by one: the number is also there as plain text.
  const spoken = boxed ? el('span', 'sr-only') : null;
  if (spoken) {
    figure.setAttribute('aria-hidden', 'true');
    figure.after(spoken);
  }
  let shown = '';
  let number = '';
  return {
    root,
    set(template, km) {
      if (template !== shown) {
        shown = template;
        const [head = '', tail = ''] = typeset(template).split('{km}');
        before.textContent = head;
        after.textContent = tail;
      }
      const text = formatNumber(Math.floor(km));
      if (text === number) return;
      number = text;
      if (!boxed) {
        figure.textContent = text;
        return;
      }
      if (spoken) spoken.textContent = text;
      while (figure.childElementCount > text.length) figure.lastElementChild?.remove();
      while (figure.childElementCount < text.length) figure.append(el('span'));
      [...text].forEach((character, index) => {
        const box = figure.children[index];
        if (!box || box.textContent === character) return;
        box.textContent = character;
        box.className = character >= '0' && character <= '9' ? 'live__digit' : 'live__dot';
      });
    },
  };
}

export function buildVoyagerPanel(options: VoyagerPanelOptions): HTMLElement {
  const root = el('div', 'live');
  const distance = sentence('live__distance', true);
  const since = sentence('live__since');
  const milestone = el('p', 'live__milestone');
  const facts = el('div', 'live__facts');
  facts.append(distance.root, since.root, milestone);

  const open = button('choice live__open');
  open.textContent = UI.voyager.openGoldenRecord;
  open.addEventListener('click', options.openGoldenRecord);
  // The button first: it must be in sight without scrolling, the facts may run below.
  root.append(open, facts);

  const atOpening = voyagerDistanceKm(options.openedAt);
  let milestoneShown = '';

  const refresh = (): void => {
    const now = options.now();
    const km = voyagerDistanceKm(now);
    distance.set(UI.voyager.liveDistance, km);
    const change = km - atOpening;
    since.set(change >= 0 ? UI.voyager.sincePageOpened : UI.voyager.sincePageOpenedCloser, Math.abs(change));
    const text = voyagerMilestone(now) === 'before' ? UI.voyager.milestoneBefore : UI.voyager.milestoneAfter;
    if (text !== milestoneShown) {
      milestoneShown = text;
      milestone.textContent = typeset(text);
    }
  };
  refresh();

  // The numbers run while the panel is on the page; the loop ends with it.
  let frames = 0;
  const loop = (): void => {
    // The page mounts the panel right after building it: give it a moment to get there.
    if (!root.isConnected && frames++ > 30) return;
    if (root.isConnected) {
      frames = 31;
      refresh();
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  return root;
}
