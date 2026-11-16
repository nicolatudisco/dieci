/**
 * Things that appear one at a time: the lines of the opening, the sentences of the finale.
 * A tap can bring them all in at once; with ?static=1 they are all there from the start.
 */
export interface RevealOptions {
  /** False with ?static=1: everything is shown at once. */
  readonly animated: boolean;
  /** Milliseconds before the first item, and between one item and the next. */
  readonly first: number;
  readonly step: number;
}

export class Reveal {
  private readonly items: readonly HTMLElement[];
  private readonly options: RevealOptions;
  private timers: number[] = [];
  private started = false;

  constructor(items: readonly HTMLElement[], options: RevealOptions) {
    this.items = items;
    this.options = options;
    for (const item of items) item.classList.add('reveal');
    if (!options.animated) this.finish();
  }

  get running(): boolean {
    return this.timers.length > 0;
  }

  /** Starts the sequence, once. */
  start(): void {
    if (this.started) return;
    this.started = true;
    if (!this.options.animated) return;
    this.items.forEach((item, index) => {
      this.timers.push(window.setTimeout(() => item.classList.add('is-on'), this.options.first + index * this.options.step));
    });
    this.timers.push(window.setTimeout(() => (this.timers = []), this.options.first + this.items.length * this.options.step));
  }

  /** Shows everything now. */
  finish(): void {
    this.clear();
    this.started = true;
    for (const item of this.items) item.classList.add('is-on');
  }

  /** Hides everything, ready to start again. */
  reset(): void {
    this.clear();
    if (!this.options.animated) return;
    this.started = false;
    for (const item of this.items) item.classList.remove('is-on');
  }

  private clear(): void {
    for (const timer of this.timers) window.clearTimeout(timer);
    this.timers = [];
  }
}
