/**
 * The opening: a black screen and one star (the warm dot, which will turn out to be her).
 * The lines appear one at a time, then the button «Inizia il viaggio».
 *
 * With #nome= in the link the greeting comes first. The first line depends on the date
 * (#nata=): it is chosen by personalization.ts so that it is never false.
 */
import { UI } from '../content/ui.ts';
import type { FirstLineKey } from '../personalization.ts';
import { fillName } from '../personalization.ts';
import { button, el } from './dom.ts';
import { Reveal } from './reveal.ts';
import { setRich, typeset } from './rich-text.ts';

export interface IntroOptions {
  readonly name: string | null;
  readonly firstLine: FirstLineKey;
  readonly animated: boolean;
  readonly onStart: () => void;
  /** Under «Inizia il viaggio», and arriving with it: the switch of the sound. */
  readonly extra?: HTMLElement;
}

export class Intro {
  readonly element = el('section', 'view intro');
  /** The empty cell around the star: the free area of the scene during the opening. */
  readonly star = el('div', 'intro__star');
  private readonly reveal: Reveal;
  private readonly start = button('cta intro__start');
  private opacity = -1;

  constructor(options: IntroOptions) {
    const lines: string[] = [];
    if (options.name) lines.push(fillName(UI.intro.greeting, options.name));
    lines.push(UI.intro.firstLine[options.firstLine], ...UI.intro.lines.slice(1));

    const text = el('div', 'intro__text');
    const items: HTMLElement[] = [];
    lines.forEach((line, index) => {
      // The greeting, when the link has her name: in the warm light of the star, which is her.
      const p = el('p', options.name && index === 0 ? 'intro__line intro__line--greeting' : 'intro__line');
      setRich(p, typeset(line));
      text.append(p);
      items.push(p);
    });
    this.start.textContent = UI.intro.start;
    this.start.addEventListener('click', (event) => {
      event.stopPropagation();
      options.onStart();
    });
    // Reached with the keyboard before its turn: everything comes in, nothing stays invisible.
    this.start.addEventListener('focus', () => this.reveal.finish());
    const actions = el('div', 'intro__actions');
    actions.append(this.start);
    if (options.extra) {
      actions.append(options.extra);
      options.extra.addEventListener('focusin', () => this.reveal.finish());
    }
    items.push(actions);
    this.reveal = new Reveal(items, { animated: options.animated, first: 900, step: 2300 });

    // A tap anywhere brings in the lines that are still to come.
    this.element.addEventListener('click', () => this.reveal.finish());
    this.element.append(this.star, text, actions);
  }

  /** Starts the lines (again, after «Rifai il viaggio»). */
  begin(): void {
    this.reveal.reset();
    this.reveal.start();
  }

  setOpacity(value: number): void {
    const opacity = Math.round(value * 100) / 100;
    if (opacity === this.opacity) return;
    this.opacity = opacity;
    this.element.style.opacity = String(opacity);
    // Not `hidden`: the layout must stay, because the empty cell is measured as free area.
    this.element.style.visibility = opacity <= 0 ? 'hidden' : 'visible';
    this.element.inert = opacity < 0.9;
  }
}
