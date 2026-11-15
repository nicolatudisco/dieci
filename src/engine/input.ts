/**
 * Input: wheel and trackpad, pointers (drag, swipe, pinch) and keys, all normalised into
 * changes of the journey position. Buttons call `Engine.go` directly.
 *
 * Directions follow UI.hints: swiping up or scrolling down moves away (forward).
 */
import type { Motion } from './motion.ts';

/** Units of u per CSS pixel of wheel movement: one mouse notch (100 px) is a quarter of a decade. */
const WHEEL_GAIN = 0.0025;
/** Units of u per pixel of a trackpad pinch (wheel with ctrlKey). */
const TRACKPAD_PINCH_GAIN = 0.012;
/** Largest change a single wheel event may cause. */
const WHEEL_MAX_STEP = 0.6;
/** A full-height swipe moves this many decades. */
const SWIPE_DECADES = 2.2;
/** A pinch changes the scale by exactly the ratio of the fingers: Δu = -log10(ratio). */
const PINCH_GAIN = 1;
/** A pointer must move this far before it becomes a drag: a tap never stops a trip. */
const DRAG_THRESHOLD = 6;
/** Window used to measure the release velocity of a swipe, in milliseconds. */
const VELOCITY_WINDOW = 110;

export interface InputOptions {
  /** Element that receives pointer and wheel events (the stage under the interface). */
  readonly surface: HTMLElement;
  readonly motion: Motion;
  /** ▶ ◀ from the keyboard. */
  readonly go: (dir: 1 | -1) => void;
  /** False while an overlay or the opening owns the screen. */
  readonly enabled: () => boolean;
}

interface Point {
  x: number;
  y: number;
}

export class Input {
  private readonly o: InputOptions;
  private readonly pointers = new Map<number, Point>();
  private readonly abort = new AbortController();
  private dragging = false;
  private travelled = 0;
  private pinch = 0;
  private samples: { t: number; u: number }[] = [];
  private dragU = 0;

  constructor(options: InputOptions) {
    this.o = options;
    const { surface } = options;
    const signal = this.abort.signal;
    surface.addEventListener('wheel', this.onWheel, { passive: false, signal });
    surface.addEventListener('pointerdown', this.onPointerDown, { signal });
    surface.addEventListener('pointermove', this.onPointerMove, { signal });
    surface.addEventListener('pointerup', this.onPointerEnd, { signal });
    surface.addEventListener('pointercancel', this.onPointerEnd, { signal });
    // Safari: stop the page itself from zooming on a pinch, wherever the fingers land.
    document.addEventListener('gesturestart', (e) => e.preventDefault(), { signal });
    document.addEventListener('gesturechange', (e) => e.preventDefault(), { signal });
    // A long press must not open the system menu or select the scene.
    surface.addEventListener('contextmenu', (e) => e.preventDefault(), { signal });
    window.addEventListener('keydown', this.onKey, { signal });
  }

  dispose(): void {
    this.abort.abort();
  }

  private readonly onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    if (!this.o.enabled()) return;
    const lines = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? this.o.surface.clientHeight : 1;
    const delta = e.deltaY * lines * (e.ctrlKey ? TRACKPAD_PINCH_GAIN : WHEEL_GAIN);
    this.o.motion.nudge(Math.max(-WHEEL_MAX_STEP, Math.min(WHEEL_MAX_STEP, delta)));
  };

  private readonly onPointerDown = (e: PointerEvent): void => {
    if (!this.o.enabled() || (e.pointerType === 'mouse' && e.button !== 0)) return;
    this.o.surface.setPointerCapture(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.travelled = 0;
    this.pinch = this.pointers.size === 2 ? this.spread() : 0;
  };

  private readonly onPointerMove = (e: PointerEvent): void => {
    const point = this.pointers.get(e.pointerId);
    if (!point) return;
    const dy = e.clientY - point.y;
    this.travelled += Math.hypot(e.clientX - point.x, dy);
    point.x = e.clientX;
    point.y = e.clientY;

    if (!this.dragging) {
      if (this.travelled < DRAG_THRESHOLD) return;
      this.dragging = true;
      this.dragU = 0;
      this.samples = [];
      this.o.motion.dragStart();
    }

    let du = 0;
    if (this.pointers.size >= 2) {
      const spread = this.spread();
      if (this.pinch > 0 && spread > 0) du = -Math.log10(spread / this.pinch) * PINCH_GAIN;
      this.pinch = spread;
    } else {
      du = (-dy * SWIPE_DECADES) / Math.max(1, this.o.surface.clientHeight);
    }
    if (du === 0) return;
    this.o.motion.dragBy(du);
    this.dragU += du;
    this.samples.push({ t: e.timeStamp, u: this.dragU });
    while (this.samples.length > 2 && e.timeStamp - (this.samples[0]?.t ?? 0) > VELOCITY_WINDOW) this.samples.shift();
  };

  private readonly onPointerEnd = (e: PointerEvent): void => {
    if (!this.pointers.delete(e.pointerId)) return;
    if (this.pointers.size > 0) {
      // From two fingers to one: keep dragging, without a jump and without a fling.
      this.pinch = 0;
      this.samples = [];
      return;
    }
    if (!this.dragging) return;
    this.dragging = false;
    const first = this.samples[0];
    const last = this.samples[this.samples.length - 1];
    const fresh = last !== undefined && e.timeStamp - last.t < 80;
    const span = first && last ? (last.t - first.t) / 1000 : 0;
    this.o.motion.dragEnd(fresh && first && last && span > 0.01 ? (last.u - first.u) / span : 0);
  };

  private spread(): number {
    const [a, b] = [...this.pointers.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  }

  private readonly onKey = (e: KeyboardEvent): void => {
    // A key held down does not repeat: one press, one stop.
    if (e.defaultPrevented || e.repeat || e.altKey || e.ctrlKey || e.metaKey || !this.o.enabled()) return;
    const target = e.target instanceof HTMLElement ? e.target : null;
    if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
    const onControl = target?.closest('button, a, summary') !== null && target !== null;
    let dir: 1 | -1 | 0 = 0;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
      case 'PageDown':
        dir = 1;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'PageUp':
        dir = -1;
        break;
      case ' ':
        // On a focused button the space bar belongs to the button.
        if (!onControl) dir = e.shiftKey ? -1 : 1;
        break;
      default:
        return;
    }
    if (dir === 0) return;
    e.preventDefault();
    this.o.go(dir);
  };
}
