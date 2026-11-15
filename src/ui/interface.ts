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
import { FINALE, NODES } from '../engine/journey.ts';
import { Counter } from './counter.ts';
import { el } from './dom.ts';
import { Panel, type PanelExtras } from './panel.ts';

export interface InterfaceOptions {
  readonly go: (dir: 1 | -1) => void;
  readonly animated: boolean;
  readonly reducedMotion: boolean;
  readonly extras?: PanelExtras;
}

/** The last stop: past it the interface gives way to the finale. */
const lastStop = [...NODES].reverse().find((node) => node.stop) ?? FINALE;

function ramp(from: number, to: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - from) / (to - from)));
  return t * t * (3 - 2 * t);
}

/** Opacity of the interface along the journey axis. */
export function interfaceOpacity(u: number): number {
  const leaving = lastStop.u + 0.35 * (FINALE.u - lastStop.u);
  return ramp(-0.55, -0.1, u) * (1 - ramp(leaving, leaving + 0.5, u));
}

export class Interface {
  readonly element = el('div', 'ui');
  /** The empty cell: its box is the free area of the scene (see ui/layout.ts). */
  readonly scene = el('div', 'ui__scene');
  readonly counter: Counter;
  readonly panel: Panel;
  private opacity = -1;

  constructor(options: InterfaceOptions) {
    this.counter = new Counter({ animated: options.animated, reducedMotion: options.reducedMotion });
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    this.panel = new Panel({
      go: options.go,
      extras: options.extras,
      hint: coarse ? UI.hints.touch : UI.hints.pointer,
      animated: options.animated,
    });
    this.element.append(this.counter.element, this.scene, this.panel.element);
  }

  update(info: FrameInfo): void {
    this.counter.update(info.u, info.atNode?.stop ? info.atNode.id : null);
    this.panel.update(info);

    const opacity = Math.round(interfaceOpacity(info.u) * 100) / 100;
    if (opacity === this.opacity) return;
    this.opacity = opacity;
    this.element.style.opacity = String(opacity);
    // Out of sight means out of reach: no focus, no clicks, nothing read aloud.
    this.element.inert = opacity < 0.5;
    this.element.classList.toggle('is-away', opacity < 0.5);
  }
}
