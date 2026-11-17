/**
 * The finale: the words. The two bridge sentences appear one at a time and then leave the
 * place to the message that Nicola wrote in content/finale.ts, which arrives line by line,
 * stanza by stanza, and STAYS: at the end the whole message is on the screen, complete and
 * readable. The scene around it (levels/finale.ts) accompanies the lines, it never
 * replaces them.
 *
 * When each thing appears is decided by the one timeline of the finale (finale-script.ts).
 * A tap on the words, ▶ or a push forward brings the next line at once; the way on
 * («Continua») appears only when everything has been said.
 *
 * The whole message is in the page from the start, so a screen reader reads it in one go.
 * The message is never invented here: until it exists, a box that cannot be missed says so.
 */
import { FINALE, FINALE_IS_PLACEHOLDER } from '../content/finale.ts';
import { LABELS } from '../content/labels.ts';
import type { FinaleTimeline } from '../finale-script.ts';
import { fillName } from '../personalization.ts';
import { button, el, icon } from './dom.ts';
import { setRich, typeset } from './rich-text.ts';

export interface FinaleOptions {
  readonly name: string | null;
  readonly timeline: FinaleTimeline;
  readonly go: (dir: 1 | -1) => void;
}

/** Milliseconds within which a second push forward is the same push (a wheel, a double tap). */
const SAME_PUSH = 450;

export class Finale {
  readonly element = el('section', 'view finale');
  /** The empty cell around the warm dot: the free area during the finale. */
  readonly star = el('div', 'finale__star');
  private readonly timeline: FinaleTimeline;
  private readonly bridges: HTMLElement[] = [];
  private readonly lines: HTMLElement[] = [];
  /** What comes with the last line: the signature, or the placeholder of the message. */
  private readonly closing: HTMLElement[] = [];
  private readonly next: HTMLButtonElement;
  private shown = '';
  private pushedAt = -Infinity;
  private opacity = -1;

  constructor(options: FinaleOptions) {
    this.timeline = options.timeline;
    const { script } = this.timeline;
    const say = (text: string): string => typeset(fillName(text, options.name, FINALE.nameFallback));

    const text = el('div', 'finale__text');
    const bridge = el('div', 'finale__bridges');
    for (const sentence of script.bridge) {
      const p = el('p', 'finale__bridge');
      setRich(p, say(sentence));
      bridge.append(p);
      this.bridges.push(p);
    }

    const message = el('div', 'finale__message');
    if (FINALE_IS_PLACEHOLDER) {
      const todo = el('p', 'finale__line finale__message--todo', 'TODO: messaggio di Nicola');
      message.append(todo);
      this.closing.push(todo);
    } else {
      let stanza: HTMLElement | null = null;
      let current = -1;
      for (const line of script.lines) {
        if (line.stanza !== current || !stanza) {
          current = line.stanza;
          stanza = el('div', 'finale__stanza');
          message.append(stanza);
        }
        const p = el('p', 'finale__line');
        if (line.aside) p.classList.add('finale__line--aside');
        if (line.closing) p.classList.add('finale__line--closing');
        setRich(p, say(line.text));
        stanza.append(p);
        this.lines.push(p);
      }
      const signature = FINALE.signature.trim();
      if (signature) {
        const p = el('p', 'finale__line finale__signature', typeset(signature));
        message.append(p);
        this.closing.push(p);
      }
    }
    text.append(bridge, message);
    // A tap on the words: the next ones, now.
    text.addEventListener('click', () => this.advance());

    const nav = el('nav', 'view__nav');
    const back = button('ghost', LABELS.back);
    back.append(icon('back'));
    back.addEventListener('click', () => options.go(-1));
    this.next = button('cta finale__next');
    this.next.append(el('span', undefined, LABELS.continue), icon('forward'));
    this.next.addEventListener('click', () => options.go(1));
    nav.append(back, this.next);

    this.element.append(this.star, text, nav);
    this.apply();
  }

  /** Called when the journey stands on the finale: the sequence starts, or goes on. */
  arrive(): void {
    this.timeline.arrive();
  }

  /** Called when the journey is back among the stops: next time the finale starts again. */
  leave(): void {
    this.timeline.leave();
    this.apply();
  }

  /** Every frame: time passes, and what is due appears. */
  update(dt: number): void {
    this.timeline.tick(dt);
    this.apply();
  }

  /** The reader pushes forward: the next line comes now. False when everything has been said. */
  advance(): boolean {
    if (this.timeline.complete) return false;
    const now = performance.now();
    if (now - this.pushedAt < SAME_PUSH) return true;
    this.pushedAt = now;
    this.timeline.advance();
    this.apply();
    return true;
  }

  private apply(): void {
    const { t, script, complete } = this.timeline;
    const bridges = script.bridgeAt.map((at) => t >= at && t < script.bridgeOut);
    const lines = script.lineAt.map((at) => t >= at);
    const last = lines.length > 0 ? (lines[lines.length - 1] ?? false) : complete;
    const key = `${bridges.join()}|${lines.join()}|${last}|${complete}`;
    if (key === this.shown) return;
    this.shown = key;
    this.bridges.forEach((p, i) => p.classList.toggle('is-on', bridges[i] ?? false));
    this.lines.forEach((p, i) => p.classList.toggle('is-on', lines[i] ?? false));
    for (const p of this.closing) p.classList.toggle('is-on', last);
    this.next.classList.toggle('is-on', complete);
    this.next.disabled = !complete;
    // For tests: everything has been said.
    this.element.dataset.complete = complete ? '1' : '0';
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
