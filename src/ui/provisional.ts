/**
 * PROVISIONAL interface for step 2 of M1: a bare counter and the ◀ ▶ buttons, just enough
 * to travel the whole scale and try the engine on a real device.
 * Replaced in step 3 by the real counter, panel and controls.
 */
import { UI } from '../content/ui.ts';
import type { FrameInfo } from '../engine/engine.ts';
import { E_MAX, nearestStop } from '../engine/journey.ts';
import { formatWidth } from './format.ts';
import { setRich } from './rich-text.ts';

export class ProvisionalHud {
  readonly element = document.createElement('div');
  readonly counter = document.createElement('div');
  readonly controls = document.createElement('div');
  private readonly power = document.createElement('div');
  private readonly width = document.createElement('div');
  private readonly line = document.createElement('div');
  private shown = '';

  constructor(go: (dir: 1 | -1) => void) {
    this.element.className = 'hud';

    this.counter.className = 'hud__counter';
    const label = document.createElement('div');
    label.className = 'hud__label';
    label.textContent = UI.counter.spaceLabel;
    this.power.className = 'hud__power';
    this.width.className = 'hud__width';
    this.line.className = 'hud__line';
    this.counter.append(label, this.power, this.width, this.line);

    this.controls.className = 'hud__controls';
    this.controls.append(
      this.button('◀', UI.controls.backAria, () => go(-1)),
      this.button('▶', UI.controls.forwardAria, () => go(1)),
    );
    this.element.append(this.counter, this.controls);
  }

  private button(text: string, aria: string, onClick: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'hud__button';
    button.textContent = text;
    button.setAttribute('aria-label', aria);
    button.addEventListener('click', onClick);
    return button;
  }

  update(info: FrameInfo): void {
    const stop = nearestStop(info.u);
    const inSpace = info.u <= E_MAX;
    const content = stop.stop;
    const power = inSpace
      ? `10^{${Math.round(info.e)}}`
      : content?.exponentLabel
        ? content.exponentLabel.replace(/^10\^(.*)$/, '10^{$1}')
        : `10^{${content?.exponent ?? ''}}`;
    const width = inSpace ? formatWidth(10 ** info.e) : '';
    const key = `${power}|${width}|${stop.id}`;
    if (key === this.shown) return;
    this.shown = key;
    setRich(this.power, power);
    this.width.textContent = width;
    this.line.textContent = stop.stop?.counterLine ?? '';
  }
}
