/**
 * The counter: the protagonist of the interface.
 *
 *   Quello che vedi è largo
 *   10⁷ metri            ← ticks, visibly, at every power of ten crossed
 *   16.000 km            ← the precise width, in friendly units
 *   la Terra intera      ← the line of the nearest stop
 *   ┄┄┄┄┄•┄┄┄┄┄┄┄┄┄      ← the ruler: one notch per power of ten, from 10⁰ to 10²⁷
 *
 * In Act II the label changes, the word «metri» slips away and only the number stays.
 * What to show is decided by counter-model.ts; this file only draws it and animates changes.
 */
import { UI } from '../content/ui.ts';
import { E_MAX } from '../engine/journey.ts';
import { counterAt, type CounterState } from './counter-model.ts';
import { el } from './dom.ts';

const ROLL_MS = 420;
const EASE = 'cubic-bezier(0.22, 0.8, 0.26, 1)';
const NOTCHES = Math.round(E_MAX);

export interface CounterOptions {
  /** False with ?static=1: states change without animation. */
  readonly animated: boolean;
  /** True with prefers-reduced-motion: changes cross-fade instead of rolling. */
  readonly reducedMotion: boolean;
}

export class Counter {
  readonly element = el('div', 'counter');
  private readonly label = el('p', 'counter__label');
  private readonly exponent = el('span', 'counter__exp');
  private readonly unit = el('span', 'counter__unit', UI.counter.metres);
  private readonly width = el('p', 'counter__width');
  private readonly line = el('p', 'counter__line');
  private readonly pointer = el('i', 'counter__pointer');
  private readonly spoken = el('p', 'sr-only');
  private readonly options: CounterOptions;
  private digit: HTMLSpanElement | null = null;
  private shown: CounterState | null = null;
  private spokenFor = '';

  constructor(options: CounterOptions) {
    this.options = options;
    const visual = el('div', 'counter__visual');
    visual.setAttribute('aria-hidden', 'true');
    const power = el('p', 'counter__power');
    power.append(el('span', 'counter__base', '10'), this.exponent, this.unit);

    const ruler = el('div', 'counter__ruler');
    for (let n = 0; n <= NOTCHES; n++) {
      const notch = el('i', n % 10 === 0 ? 'counter__notch counter__notch--ten' : 'counter__notch');
      notch.style.left = `${(n / NOTCHES) * 100}%`;
      ruler.append(notch);
    }
    ruler.append(this.pointer);

    // Width and line share a row when there is room, and wrap when there is not.
    const facts = el('div', 'counter__facts');
    facts.append(this.width, this.line);
    visual.append(this.label, power, facts, ruler);
    // What assistive technology reads: the plain width, said when a stop is reached.
    this.spoken.setAttribute('aria-live', 'polite');
    this.element.append(visual, this.spoken);
  }

  /** `stopId` is the id of the stop the journey is standing on, or null while moving. */
  update(u: number, stopId: string | null): void {
    const state = counterAt(u);
    const previous = this.shown;
    this.shown = state;

    if (!previous || previous.label !== state.label) this.label.textContent = state.label;
    if (!previous || previous.exponent !== state.exponent) this.roll(state, previous);
    if (!previous || previous.mode !== state.mode) this.setMode(state.mode, previous !== null);
    if (!previous || previous.width !== state.width) {
      // Keep the last width while it fades out with «metri», so the line does not collapse.
      if (state.width !== null) this.width.textContent = state.width;
    }
    if (!previous || previous.line !== state.line) this.line.textContent = state.line;

    const along = state.mode === 'space' ? Math.min(1, Math.max(0, u) / NOTCHES) : 1;
    this.pointer.style.left = `${(along * 100).toFixed(2)}%`;

    if (stopId && stopId !== this.spokenFor) {
      this.spokenFor = stopId;
      this.spoken.textContent = state.width ? `${state.label} ${state.width}. ${state.line}.` : `${state.label}: ${state.line}.`;
    }
  }

  /** The exponent rolls like the digit of a mechanical counter: up when the scale grows. */
  private roll(state: CounterState, previous: CounterState | null): void {
    const old = this.digit;
    const next = el('span', 'counter__digit', state.exponent);
    this.digit = next;
    for (const stale of this.exponent.querySelectorAll('.is-leaving')) stale.remove();
    this.exponent.append(next);
    if (!old) return;
    if (!previous || !this.options.animated) {
      old.remove();
      return;
    }
    const direction = state.order >= previous.order ? 1 : -1;
    const shift = this.options.reducedMotion ? 0 : 62 * direction;
    old.classList.add('is-leaving');
    old
      .animate(
        [
          { transform: 'translateY(0)', opacity: 1 },
          { transform: `translateY(${-shift}%)`, opacity: 0 },
        ],
        { duration: ROLL_MS * 0.8, easing: EASE, fill: 'forwards' },
      )
      .finished.then(() => old.remove())
      .catch(() => old.remove());
    next.animate(
      [
        { transform: `translateY(${shift}%)`, opacity: 0, color: 'var(--cool-bright)' },
        { transform: 'translateY(0)', opacity: 1, color: 'var(--cool-bright)', offset: 0.6 },
        { transform: 'translateY(0)', opacity: 1, color: 'var(--ink)' },
      ],
      { duration: ROLL_MS * 1.6, easing: EASE },
    );
  }

  /** Space ↔ number: the word «metri» slips away with a playful stumble, and comes back. */
  private setMode(mode: CounterState['mode'], animate: boolean): void {
    this.element.dataset.mode = mode;
    if (!animate || !this.options.animated || this.options.reducedMotion) return;
    if (mode === 'number') {
      this.unit.animate(
        [
          { transform: 'none', opacity: 1 },
          { transform: 'translate(0.08em, -0.06em) skewX(-14deg)', opacity: 1, offset: 0.14 },
          { transform: 'translate(-0.1em, 0.03em) skewX(11deg)', opacity: 1, offset: 0.28 },
          { transform: 'translate(0.05em, 0) skewX(-6deg)', opacity: 1, offset: 0.4 },
          { transform: 'translate(0.9em, 1.5em) rotate(22deg)', opacity: 0 },
        ],
        { duration: 950, easing: 'cubic-bezier(0.5, 0, 0.8, 0.4)' },
      );
    } else {
      this.unit.animate(
        [
          { transform: 'translateY(0.5em)', opacity: 0 },
          { transform: 'none', opacity: 1 },
        ],
        { duration: 500, easing: EASE },
      );
    }
  }
}
