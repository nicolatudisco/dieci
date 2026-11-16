/**
 * The finale. The bridge sentences appear one at a time, then the message that Nicola
 * writes in content/finale.ts, then his signature.
 *
 * PLACEHOLDER (M1): until the message exists, a box that cannot be missed says
 * «TODO: messaggio di Nicola». The message is never invented here. M6 turns this view
 * into the most beautiful scene of the site.
 */
import { FINALE, FINALE_IS_PLACEHOLDER } from '../content/finale.ts';
import { LABELS } from '../content/labels.ts';
import { fillName } from '../personalization.ts';
import { button, el, icon } from './dom.ts';
import { Reveal } from './reveal.ts';
import { setRich, typeset } from './rich-text.ts';

export interface FinaleOptions {
  readonly name: string | null;
  readonly animated: boolean;
  readonly go: (dir: 1 | -1) => void;
}

export class Finale {
  readonly element = el('section', 'view finale');
  /** The empty cell where the warm dot comes back: the free area during the finale. */
  readonly star = el('div', 'finale__star');
  private readonly reveal: Reveal;
  private opacity = -1;

  constructor(options: FinaleOptions) {
    const text = el('div', 'finale__text');
    const items: HTMLElement[] = [];
    for (const sentence of FINALE.bridge) {
      const p = el('p', 'finale__bridge');
      setRich(p, typeset(fillName(sentence, options.name, FINALE.nameFallback)));
      text.append(p);
      items.push(p);
    }

    const message = el('div', 'finale__message');
    if (FINALE_IS_PLACEHOLDER) {
      message.classList.add('finale__message--todo');
      message.textContent = 'TODO: messaggio di Nicola';
    } else {
      for (const paragraph of fillName(FINALE.message, options.name, FINALE.nameFallback).split(/\n+/)) {
        if (!paragraph.trim()) continue;
        const p = el('p');
        setRich(p, typeset(paragraph.trim()));
        message.append(p);
      }
      const signature = FINALE.signature.trim();
      if (signature) message.append(el('p', 'finale__signature', signature));
    }
    text.append(message);
    items.push(message);

    const nav = el('nav', 'view__nav');
    const back = button('ghost', LABELS.back);
    back.append(icon('back'));
    back.addEventListener('click', () => options.go(-1));
    const next = button('cta');
    next.append(el('span', undefined, LABELS.continue), icon('forward'));
    next.addEventListener('click', () => options.go(1));
    nav.append(back, next);
    items.push(nav);

    this.reveal = new Reveal(items, { animated: options.animated, first: 700, step: 2600 });
    this.element.append(this.star, text, nav);
  }

  /** Called when the journey stands on the finale: the sentences start to appear. */
  arrive(): void {
    this.reveal.start();
  }

  /** Called when the journey is back among the stops: next time the sentences start again. */
  leave(): void {
    this.reveal.reset();
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
