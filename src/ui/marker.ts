/**
 * «Tu sei qui»: the small warm dot that marks where she is at every scale. It is always
 * the origin of the stage, projected through the current framing.
 */
import { projectStage, type Framing } from '../engine/framing.ts';
import { ANCHORS } from '../engine/stage.ts';

export class Marker {
  readonly element = document.createElement('div');
  private readonly label = document.createElement('span');

  constructor(labelText: string) {
    this.element.className = 'marker';
    this.element.setAttribute('aria-hidden', 'true');
    const dot = document.createElement('i');
    this.label.className = 'marker__label';
    this.label.textContent = labelText;
    this.element.append(dot, this.label);
  }

  update(f: Framing, showLabel: boolean): void {
    const p = projectStage(f, ANCHORS.you);
    this.element.style.transform = `translate3d(${p.x.toFixed(2)}px, ${p.y.toFixed(2)}px, 0)`;
    this.element.style.opacity = p.visible ? '1' : '0';
    this.label.style.opacity = showLabel ? '1' : '0';
  }
}
