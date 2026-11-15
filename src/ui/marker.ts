/**
 * «Tu sei qui»: the small warm dot that marks where she is at every scale. It is always
 * the origin of the stage, projected through the current framing: on her, on the street,
 * on the Earth, then on the Sun, then on the place of the Sun in the galaxy.
 *
 * The words «Tu sei qui» appear next to it when the scene no longer makes it obvious:
 * from the Moon onwards.
 */
import { projectStage, type Framing } from '../engine/framing.ts';
import { FINALE, nodeById } from '../engine/journey.ts';
import { ANCHORS } from '../engine/stage.ts';

function ramp(from: number, to: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - from) / (to - from)));
  return t * t * (3 - 2 * t);
}

const beyond = nodeById('oltre')?.u ?? FINALE.u;

/**
 * How the dot looks along the journey: always there in Act I (it is the single star of the
 * opening); it goes out among the numbers of Act II, where there is no «here» any more,
 * and comes back for the finale.
 */
export function markerLook(u: number, e: number): { opacity: number; label: number } {
  const amongNumbers = ramp(beyond + 0.5, beyond + 1.3, u) * (1 - ramp(FINALE.u - 0.9, FINALE.u - 0.1, u));
  return {
    opacity: 1 - amongNumbers,
    label: ramp(8, 8.6, e) * (1 - ramp(beyond - 1.6, beyond - 0.8, u)),
  };
}

export class Marker {
  readonly element = document.createElement('div');
  private readonly label = document.createElement('span');
  private side: 'right' | 'left' = 'right';

  constructor(labelText: string) {
    this.element.className = 'marker';
    this.element.setAttribute('aria-hidden', 'true');
    const dot = document.createElement('i');
    this.label.className = 'marker__label';
    this.label.textContent = labelText;
    this.element.append(dot, this.label);
  }

  /** `labelClear` is false when something (a lens) lies where the words would go. */
  update(f: Framing, u: number, labelClear = true): void {
    const p = projectStage(f, ANCHORS.you);
    const look = markerLook(u, f.e);
    this.element.style.transform = `translate3d(${p.x.toFixed(2)}px, ${p.y.toFixed(2)}px, 0)`;
    this.element.style.opacity = p.visible ? look.opacity.toFixed(3) : '0';
    this.label.style.opacity = labelClear ? look.label.toFixed(3) : '0';
    // The words stay inside the free area: they move to the other side near its right edge.
    const room = f.free.x + f.free.width - p.x;
    const side = room < 130 ? 'left' : room > 150 ? 'right' : this.side;
    if (side !== this.side) {
      this.side = side;
      this.element.classList.toggle('marker--left', side === 'left');
    }
  }
}
