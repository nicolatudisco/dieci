/**
 * ?debug=1: frames per second, position, active levels with their opacity, draw calls,
 * pixel ratio, and the outline of the free area with the «largo» square inside it.
 */
import type { FrameInfo } from '../engine/engine.ts';
import { cameraExponent } from '../engine/journey.ts';

export class DebugOverlay {
  readonly element = document.createElement('div');
  private readonly text = document.createElement('pre');
  private readonly free = document.createElement('div');
  private readonly largo = document.createElement('div');
  private frames = 0;
  private since = performance.now();
  private fps = 0;
  private worst = 0;
  private worstShown = 0;
  /** Frames longer than 25 ms since the page opened, and the longest of them. */
  private slow = 0;
  private slowest = 0;

  constructor() {
    this.element.className = 'debug';
    this.text.className = 'debug__text';
    this.free.className = 'debug__free';
    this.largo.className = 'debug__largo';
    this.element.append(this.free, this.largo, this.text);
  }

  update(info: FrameInfo): void {
    const now = performance.now();
    this.frames++;
    this.worst = Math.max(this.worst, info.dt * 1000);
    if (info.dt > 0.025 && info.time > 1) {
      this.slow++;
      this.slowest = Math.max(this.slowest, info.dt * 1000);
    }
    if (now - this.since >= 500) {
      this.fps = (this.frames * 1000) / (now - this.since);
      this.worstShown = this.worst;
      this.frames = 0;
      this.worst = 0;
      this.since = now;
    }
    const f = info.framing;
    const levels = info.active.map((a) => `${a.def.id} ${a.fade.toFixed(2)}`).join('\n  ');
    this.text.textContent =
      `fps ${this.fps.toFixed(0)}  worst ${this.worstShown.toFixed(0)} ms\n` +
      `slow frames ${this.slow}${this.slow ? `  (max ${this.slowest.toFixed(0)} ms)` : ''}\n` +
      `u ${info.u.toFixed(3)}  e ${cameraExponent(info.u).toFixed(3)}\n` +
      `${info.atNode ? `at ${info.atNode.id}` : info.heading ? `to ${info.heading.id}` : info.moving ? 'moving' : 'rest'}\n` +
      `calls ${info.drawCalls}  dpr ${info.pixelRatio.toFixed(2)}  ${f.width}×${f.height}\n` +
      `largo ${f.largoPx.toFixed(0)} px\n  ${levels}`;

    const { free } = f;
    this.free.style.transform = `translate(${free.x}px, ${free.y}px)`;
    this.free.style.width = `${free.width}px`;
    this.free.style.height = `${free.height}px`;
    this.largo.style.transform = `translate(${f.cx - f.largoPx / 2}px, ${f.cy - f.largoPx / 2}px)`;
    this.largo.style.width = `${f.largoPx}px`;
    this.largo.style.height = `${f.largoPx}px`;
  }
}
