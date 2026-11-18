/**
 * The veil: a curtain of night over the scene (never over the interface).
 *
 * With `prefers-reduced-motion` ▶ and ◀ do not zoom: the scene fades to night, the journey
 * jumps to the next stop, and the scene fades back. No fast movement, no flashing.
 */
import { el } from './dom.ts';

const COVER_MS = 220;
const REVEAL_MS = 420;

export class Veil {
  readonly element = el('div', 'veil');
  private busy = false;
  /** One more change asked for while busy: it runs when the veil has lifted. */
  private next: (() => void | Promise<void>) | null = null;

  constructor() {
    this.element.setAttribute('aria-hidden', 'true');
  }

  /**
   * Covers the scene, awaits `change`, uncovers it. A call made meanwhile is kept (only the
   * last one) and runs right after: a ▶ pressed while the veil lifts is not lost, and a
   * burst of presses goes at most one stop further.
   */
  async through(change: () => void | Promise<void>): Promise<void> {
    if (this.busy) {
      this.next = change;
      return;
    }
    this.busy = true;
    try {
      await this.fade(0, 1, COVER_MS);
      await change();
      // Two frames: the engine has drawn the new place before the curtain lifts.
      await new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())));
      await this.fade(1, 0, REVEAL_MS);
    } finally {
      this.busy = false;
    }
    const next = this.next;
    this.next = null;
    if (next) await this.through(next);
  }

  private async fade(from: number, to: number, duration: number): Promise<void> {
    const animation = this.element.animate([{ opacity: from }, { opacity: to }], { duration, easing: 'ease-in-out', fill: 'forwards' });
    await animation.finished.catch(() => undefined);
    this.element.style.opacity = String(to);
    animation.cancel();
  }
}
