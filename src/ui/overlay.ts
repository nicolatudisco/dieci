/**
 * Pages that open on top of the journey («È tutto vero», the Golden Record) and give the
 * journey back exactly where it was when they close. One host for all of them: it takes
 * the focus, makes everything underneath inert, and closes with its button or with Esc.
 */
import { UI } from '../content/ui.ts';
import type { OverlayId } from '../engine/journey.ts';
import { button, el, icon } from './dom.ts';

export interface OverlayPage {
  /** The page: an element whose first heading has the id given to the builder. */
  readonly element: HTMLElement;
  /**
   * Called each time the page opens, once it is on the screen, with the part of the page to
   * open at (`at`, when the opener asks for one). It may return the element that takes the
   * focus instead of the title. `hidden` is called each time it closes.
   */
  readonly shown?: (at?: string) => HTMLElement | void;
  readonly hidden?: () => void;
}

export type OverlayBuilder = (titleId: string, close: () => void) => OverlayPage;

export class Overlays {
  readonly element = el('div', 'overlay');
  private readonly builders: Record<OverlayId, OverlayBuilder>;
  private readonly underneath: () => readonly HTMLElement[];
  private readonly pages = new Map<OverlayId, OverlayPage>();
  private open: OverlayId | null = null;
  private returnFocus: Element | null = null;
  /** Always within reach at the top, however long the page is. */
  private readonly bar = el('div', 'overlay__bar');

  /** `underneath` lists what must become inert while a page is open. */
  constructor(builders: Record<OverlayId, OverlayBuilder>, underneath: () => readonly HTMLElement[]) {
    this.builders = builders;
    this.underneath = underneath;
    this.element.hidden = true;
    this.element.setAttribute('role', 'dialog');
    this.element.setAttribute('aria-modal', 'true');
    const close = button('ghost overlay__close', UI.panel.close);
    close.append(icon('close'));
    close.addEventListener('click', () => this.close());
    this.bar.append(close);
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.open) {
        event.preventDefault();
        this.close();
      }
    });
  }

  get current(): OverlayId | null {
    return this.open;
  }

  /** Opens a page, at its part `at` if the page has one (the Golden Record: `laboratorio`). */
  show(id: OverlayId, at?: string): void {
    if (this.open === id) return;
    const titleId = `overlay-${id}-title`;
    let page = this.pages.get(id);
    if (!page) {
      page = this.builders[id](titleId, () => this.close());
      this.pages.set(id, page);
    }
    this.returnFocus = document.activeElement;
    this.open = id;
    this.element.replaceChildren(this.bar, page.element);
    this.element.setAttribute('aria-labelledby', titleId);
    this.element.hidden = false;
    this.element.scrollTop = 0;
    for (const node of this.underneath()) node.inert = true;
    // Focus goes to the title, so that reading starts from the top (or where the page says).
    const target = page.shown?.(at) ?? page.element.querySelector<HTMLElement>(`#${titleId}`);
    target?.setAttribute('tabindex', '-1');
    target?.focus({ preventScroll: true });
  }

  close(): void {
    if (!this.open) return;
    this.pages.get(this.open)?.hidden?.();
    this.open = null;
    this.element.hidden = true;
    for (const node of this.underneath()) node.inert = false;
    if (this.returnFocus instanceof HTMLElement && this.returnFocus.isConnected) this.returnFocus.focus({ preventScroll: true });
    this.returnFocus = null;
  }
}
