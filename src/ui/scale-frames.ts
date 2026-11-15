/**
 * The scale frames: one thin square for every power of ten, 10^n metres wide, fixed on
 * the stage where the view was centred at that power. At e = n the square coincides with
 * the «largo»; as the journey moves on it shrinks towards the centre while the next one
 * arrives from outside. It makes «×10 at every step» visible.
 */
import { projectStage, type Framing } from '../engine/framing.ts';
import { E_MAX } from '../engine/journey.ts';
import { centreAt } from '../engine/stage.ts';
import { setRich } from './rich-text.ts';

/** A frame is drawn while its side is between these shares of the «largo». */
const SMALLEST = 0.02;
const LARGEST = 1.3;
/** Below this side in pixels the label is hidden. */
const LABEL_MIN_SIDE = 96;

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

interface Frame {
  readonly root: HTMLDivElement;
  readonly label: HTMLSpanElement;
  seen: number;
}

export class ScaleFrames {
  readonly element = document.createElement('div');
  private readonly frames = new Map<number, Frame>();
  private tick = 0;

  constructor() {
    this.element.className = 'scale-frames';
    this.element.setAttribute('aria-hidden', 'true');
  }

  update(f: Framing): void {
    this.tick++;
    const first = Math.max(0, Math.ceil(f.e + Math.log10(SMALLEST)));
    const last = Math.min(Math.floor(E_MAX), Math.floor(f.e + Math.log10(LARGEST)));
    for (let n = first; n <= last; n++) {
      const ratio = 10 ** (n - f.e);
      const opacity = smoothstep(LARGEST, 1.03, ratio) * smoothstep(SMALLEST, 0.07, ratio);
      if (opacity < 0.004) continue;
      const centre = projectStage(f, centreAt(n));
      if (!centre.visible) continue;
      const side = f.largoPx * ratio;

      let frame = this.frames.get(n);
      if (!frame) {
        const root = document.createElement('div');
        root.className = 'scale-frame';
        const label = document.createElement('span');
        setRich(label, `10^{${n}} m`);
        root.append(label);
        this.element.append(root);
        frame = { root, label, seen: 0 };
        this.frames.set(n, frame);
      }
      frame.root.style.width = `${side.toFixed(2)}px`;
      frame.root.style.height = `${side.toFixed(2)}px`;
      frame.root.style.transform = `translate3d(${(centre.x - side / 2).toFixed(2)}px, ${(centre.y - side / 2).toFixed(2)}px, 0)`;
      frame.root.style.opacity = opacity.toFixed(3);
      frame.label.style.opacity = smoothstep(LABEL_MIN_SIDE, LABEL_MIN_SIDE * 1.6, side).toFixed(3);
      frame.seen = this.tick;
    }
    for (const [n, frame] of this.frames) {
      if (frame.seen === this.tick) continue;
      frame.root.remove();
      this.frames.delete(n);
    }
  }
}
