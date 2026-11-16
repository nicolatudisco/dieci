/**
 * The page: the caption of the current stop and the two big buttons that turn it.
 *
 * - On arrival at a stop the caption appears: title and text always, then «Tocca per
 *   saperne di più» and «Come lo sappiamo?» when the stop has them. They expand in place.
 * - While travelling the caption is hidden, but it already holds the text of the stop the
 *   trip is heading to, so the page (and with it the free area of the scene) takes its
 *   new size during the zoom and not after it.
 * - Standing between two stops there is no caption: only the buttons.
 * - In portrait the page is a sheet at the bottom that can be folded down to its title.
 *
 * Special stops can add their own content under the text through `extras`
 * (the Voyager stop adds the button that opens the Golden Record; M4 adds its live panel).
 */
import type { SpecialStop, Stop } from '../content/types.ts';
import { UI } from '../content/ui.ts';
import type { FrameInfo } from '../engine/engine.ts';
import { FIRST_STOP, type JourneyNode } from '../engine/journey.ts';
import type { ResolveStop } from './counter-model.ts';
import { button, el, icon } from './dom.ts';
import { setRich, typeset } from './rich-text.ts';

/** What a special stop adds under its text, if anything. It gets the stop as it is shown. */
export type PanelExtras = Partial<Record<SpecialStop, (stop: Stop) => HTMLElement | null>>;

export interface PanelOptions {
  readonly go: (dir: 1 | -1) => void;
  readonly extras?: PanelExtras;
  /** The texts of a stop as they are true today (see counter-model.ts). */
  readonly resolve?: ResolveStop;
  /** The hint shown at the first stop until the journey moves on. */
  readonly hint: string;
  /** False with ?static=1: states are final at once. */
  readonly animated: boolean;
}

interface Disclosure {
  readonly root: HTMLDivElement;
  readonly toggle: HTMLButtonElement;
  readonly content: HTMLDivElement;
  readonly text: HTMLParagraphElement;
}

let nextId = 0;

export class Panel {
  readonly element = el('aside', 'page');
  private readonly options: PanelOptions;
  private readonly scroll = el('div', 'page__scroll');
  private readonly caption = el('article', 'caption');
  private readonly title = el('h2', 'caption__title');
  private readonly fold = button('caption__fold', UI.panel.close);
  private readonly body = el('div', 'caption__body');
  private readonly text = el('p', 'caption__text');
  private readonly extra = el('div', 'caption__extra');
  private readonly more: Disclosure;
  private readonly how: Disclosure;
  private readonly hint = el('p', 'page__hint');
  private readonly back = button('nav-button nav-button--back');
  private readonly forward = button('nav-button nav-button--forward');

  private node: JourneyNode | null = null;
  private visible = false;
  private empty = true;
  private folded = false;
  private hintDone = false;
  private restFrames = 0;

  constructor(options: PanelOptions) {
    this.options = options;
    this.fold.append(icon('chevron'));
    this.fold.setAttribute('aria-expanded', 'true');
    this.fold.addEventListener('click', () => this.setFolded(!this.folded));
    const head = el('header', 'caption__head');
    head.append(this.title, this.fold);

    this.more = this.disclosure(UI.panel.more, 'disclosure');
    this.how = this.disclosure(UI.panel.howWeKnow, 'disclosure disclosure--how');
    const inner = el('div', 'caption__inner');
    inner.append(this.text, this.extra, this.more.root, this.how.root);
    this.body.append(inner);
    this.caption.append(head, this.body);
    this.scroll.append(this.caption);

    setRich(this.hint, options.hint);

    // The accessible name starts with the visible words, then says what the button does.
    this.back.append(icon('back'), el('span', undefined, UI.controls.back), el('span', 'sr-only', `. ${UI.controls.backAria}`));
    this.forward.append(el('span', undefined, UI.controls.forward), icon('forward'), el('span', 'sr-only', `. ${UI.controls.forwardAria}`));
    this.back.addEventListener('click', () => options.go(-1));
    this.forward.addEventListener('click', () => options.go(1));
    const nav = el('nav', 'page__nav');
    nav.append(this.back, this.forward);

    this.element.append(this.scroll, this.hint, nav);
    this.apply();

    // Tells the styles when there is more text above or below the visible part of the caption.
    const watch = (): void => {
      const { scrollTop, clientHeight, scrollHeight } = this.scroll;
      this.scroll.classList.toggle('has-less', scrollTop > 4);
      this.scroll.classList.toggle('has-more', scrollTop + clientHeight < scrollHeight - 4);
    };
    this.scroll.addEventListener('scroll', watch, { passive: true });
    const observer = new ResizeObserver(watch);
    observer.observe(this.scroll);
    observer.observe(this.caption);
  }

  /** True while an expansion is open: reading mode, the framing of the scene stays put. */
  get reading(): boolean {
    return this.isOpen(this.more) || this.isOpen(this.how);
  }

  update(info: FrameInfo): void {
    // The stop whose caption the page holds: where a trip is heading, or where we stand.
    const target = info.heading ?? info.atNode;
    if (target?.stop && target !== this.node) this.setStop(target);

    const visible = this.node !== null && info.atNode === this.node;
    // Standing still between two stops for a moment: no caption at all.
    this.restFrames = !info.moving && !info.atNode ? this.restFrames + 1 : 0;
    const empty = this.node === null || this.restFrames > (this.options.animated ? 20 : 0);
    if (info.moving && info.u > FIRST_STOP.u + 0.05) this.hintDone = true;

    const atStart = info.u <= FIRST_STOP.u + 0.02;
    this.back.setAttribute('aria-disabled', String(atStart));
    this.hint.hidden = this.hintDone || !atStart || !visible;

    if (visible === this.visible && empty === this.empty) return;
    this.visible = visible;
    this.empty = empty;
    this.apply();
  }

  private apply(): void {
    this.element.dataset.state = this.empty ? 'empty' : this.folded ? 'folded' : 'open';
    this.caption.classList.toggle('is-hidden', !this.visible);
    // Hidden text must not be reachable by keyboard or read aloud.
    this.caption.inert = !this.visible;
  }

  private setFolded(folded: boolean): void {
    this.folded = folded;
    this.fold.setAttribute('aria-expanded', String(!folded));
    if (folded) this.closeAll();
    this.apply();
  }

  private setStop(node: JourneyNode): void {
    if (!node.stop) return;
    const stop = this.options.resolve?.(node.stop) ?? node.stop;
    this.node = node;
    this.closeAll();
    setRich(this.title, typeset(stop.title));
    setRich(this.text, typeset(stop.text));
    this.fill(this.more, stop.more);
    this.fill(this.how, stop.howWeKnow);
    const extra = stop.special ? this.options.extras?.[stop.special]?.(stop) : undefined;
    this.extra.replaceChildren(...(extra ? [extra] : []));
    this.extra.hidden = !extra;
    this.scroll.scrollTop = 0;
  }

  private disclosure(label: string, className: string): Disclosure {
    const id = `disclosure-${nextId++}`;
    const root = el('div', className);
    const toggle = button('disclosure__toggle');
    toggle.append(icon('plus'), el('span', undefined, label));
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', id);
    const content = el('div', 'disclosure__content');
    content.id = id;
    const text = el('p', 'disclosure__text');
    const clip = el('div', 'disclosure__clip');
    clip.append(text);
    content.append(clip);
    content.inert = true;
    root.append(toggle, content);
    const item: Disclosure = { root, toggle, content, text };
    toggle.addEventListener('click', () => this.setOpen(item, !this.isOpen(item)));
    return item;
  }

  private fill(item: Disclosure, text: string | undefined): void {
    item.root.hidden = !text;
    if (text) setRich(item.text, typeset(text));
  }

  private isOpen(item: Disclosure): boolean {
    return item.toggle.getAttribute('aria-expanded') === 'true';
  }

  private setOpen(item: Disclosure, open: boolean): void {
    item.toggle.setAttribute('aria-expanded', String(open));
    item.root.classList.toggle('is-open', open);
    item.content.inert = !open;
    this.element.classList.toggle('is-reading', this.reading);
    if (open) {
      // Bring the start of the new text into view once the sheet has grown.
      const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
      window.setTimeout(() => item.root.scrollIntoView({ block: 'nearest', behavior }), 260);
    }
  }

  private closeAll(): void {
    for (const item of [this.more, this.how]) {
      item.toggle.setAttribute('aria-expanded', 'false');
      item.root.classList.remove('is-open');
      item.content.inert = true;
    }
    this.element.classList.remove('is-reading');
  }
}
