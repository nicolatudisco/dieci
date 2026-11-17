/**
 * The interface of the journey: the counter, the empty cell where the scene shows through,
 * and the page with the caption and the buttons. One CSS grid (styles/ui.css) lays them
 * out: in portrait the counter is on top and the page is a sheet at the bottom; in
 * landscape counter and page share a column on the right, like the text page beside the
 * plate of an illustrated book.
 *
 * It is visible only along the stops: it fades in as the journey leaves the opening and
 * fades out towards the finale.
 */
import { UI } from '../content/ui.ts';
import type { FrameInfo } from '../engine/engine.ts';
import { Counter } from './counter.ts';
import type { ResolveStop } from './counter-model.ts';
import { el } from './dom.ts';
import { Panel, type MoreExtras, type PanelExtras } from './panel.ts';
import { interfaceOpacity } from './view-model.ts';

export interface InterfaceOptions {
  readonly go: (dir: 1 | -1) => void;
  readonly animated: boolean;
  readonly reducedMotion: boolean;
  readonly extras?: PanelExtras;
  readonly moreExtras?: MoreExtras;
  /** The texts of a stop as they are true today (see counter-model.ts). */
  readonly resolve?: ResolveStop;
}

export class Interface {
  readonly element = el('div', 'ui');
  /** The empty cell: its box is the free area of the scene (see ui/layout.ts). */
  readonly scene = el('div', 'ui__scene');
  readonly counter: Counter;
  readonly panel: Panel;
  /** What assistive technology hears on arriving at a stop: title, width, caption. */
  private readonly status = el('p', 'sr-only');
  private readonly resolve: ResolveStop;
  private announced = '';
  private opacity = -1;

  constructor(options: InterfaceOptions) {
    this.resolve = options.resolve ?? ((stop) => stop);
    this.counter = new Counter({ animated: options.animated, reducedMotion: options.reducedMotion, resolve: this.resolve });
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    this.panel = new Panel({
      go: options.go,
      extras: options.extras,
      moreExtras: options.moreExtras,
      resolve: this.resolve,
      hint: coarse ? UI.hints.touch : UI.hints.pointer,
      animated: options.animated,
    });
    this.status.setAttribute('role', 'status');
    this.element.append(this.counter.element, this.scene, this.panel.element, this.status);
  }

  update(info: FrameInfo): void {
    this.counter.update(info.u);
    this.panel.update(info);

    const at = info.atNode?.stop;
    if (at && at.id !== this.announced) {
      this.announced = at.id;
      const stop = this.resolve(at);
      this.status.textContent = `${stop.title}. ${Counter.describe(info.u, this.resolve)} ${stop.text}`;
    }

    const opacity = Math.round(interfaceOpacity(info.u) * 100) / 100;
    if (opacity === this.opacity) return;
    this.opacity = opacity;
    this.element.style.opacity = String(opacity);
    // Out of sight means out of reach: no focus, no clicks, nothing read aloud.
    this.element.inert = opacity < 0.5;
    this.element.classList.toggle('is-away', opacity < 0.5);
  }
}
