/**
 * The switch of the sound. Off at the start; in the opening a round button with the
 * loudspeaker and, next to it, «Con le cuffie è ancora più bello.»; along the journey the
 * same button, small, at the top right. Its name says how the sound is now («Suono spento»,
 * «Suono acceso»), so a screen reader hears the state after each tap.
 *
 * The choice is remembered on the device (localStorage, the one thing the site keeps:
 * CLAUDE.md allows it for this). Even so the sound never starts by itself: when it was left
 * on, it starts with her first tap or key.
 */
import { UI } from '../content/ui.ts';
import { button, el, icon } from '../ui/dom.ts';
import { setRich, typeset } from '../ui/rich-text.ts';

const KEY = 'dieci.suono';

function remembered(): boolean {
  try {
    return window.localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

function remember(on: boolean): void {
  try {
    window.localStorage.setItem(KEY, on ? '1' : '0');
  } catch {
    // Private browsing, storage off: the choice lasts as long as the page.
  }
}

export interface SoundToggleOptions {
  /** False with ?static=1: the sound stays off and the choice is not read. */
  readonly enabled: boolean;
  /** The sound must start or stop: called inside a tap or a key press. */
  readonly onChange: (on: boolean) => void;
}

export class SoundToggle {
  /** For the opening: the round button and the sentence next to it. */
  readonly big = el('div', 'sound-choice');
  /** For the journey: the small button at the top right. */
  readonly small = button('ghost sound-toggle');
  private readonly bigButton = button('ghost sound-choice__button');
  private readonly options: SoundToggleOptions;
  private on: boolean;
  /** Left on last time: it starts at the first gesture. */
  private waiting: boolean;

  constructor(options: SoundToggleOptions) {
    this.options = options;
    this.on = options.enabled && remembered();
    this.waiting = this.on;
    const hint = el('p', 'sound-choice__hint');
    hint.id = 'sound-hint';
    setRich(hint, typeset(UI.intro.soundHint));
    this.bigButton.setAttribute('aria-describedby', hint.id);
    // The sentence is part of the choice: a tap on it turns the sound on too.
    hint.addEventListener('click', (event) => {
      event.stopPropagation();
      this.toggle();
    });
    this.big.append(this.bigButton, hint);
    for (const control of [this.bigButton, this.small]) {
      control.addEventListener('click', (event) => {
        event.stopPropagation();
        this.toggle();
      });
    }
    this.render();
    if (this.waiting) {
      const start = (): void => {
        window.removeEventListener('pointerdown', start, true);
        window.removeEventListener('keydown', start, true);
        if (!this.waiting) return;
        this.waiting = false;
        if (this.on) this.options.onChange(true);
      };
      window.addEventListener('pointerdown', start, true);
      window.addEventListener('keydown', start, true);
    }
  }

  get isOn(): boolean {
    return this.on;
  }

  /** The small button is not needed in the opening, where the big one is. */
  showSmall(show: boolean): void {
    this.small.hidden = !show;
  }

  private toggle(): void {
    this.on = !this.on;
    this.waiting = false;
    remember(this.on);
    this.render();
    this.options.onChange(this.on);
  }

  private render(): void {
    const name = this.on ? UI.controls.soundOn : UI.controls.soundOff;
    for (const control of [this.bigButton, this.small]) {
      control.setAttribute('aria-label', name);
      control.title = name;
      control.replaceChildren(icon(this.on ? 'soundOn' : 'soundOff'));
      control.classList.toggle('is-on', this.on);
    }
    this.big.classList.toggle('is-on', this.on);
  }
}
