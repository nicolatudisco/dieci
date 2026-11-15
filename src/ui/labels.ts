/**
 * Labels anchored to points of the scenes. Levels declare them (Level.labels), the engine
 * projects them, this layer keeps one DOM element per label and moves it every frame.
 */
import type { PlacedLabel } from '../engine/engine.ts';
import { setRich } from './rich-text.ts';

interface Item {
  readonly root: HTMLDivElement;
  readonly text: HTMLSpanElement;
  value: string;
  seen: number;
}

export class LabelLayer {
  readonly element = document.createElement('div');
  private readonly items = new Map<string, Item>();
  private frame = 0;

  constructor() {
    this.element.className = 'labels';
    this.element.setAttribute('aria-hidden', 'true');
  }

  update(labels: readonly PlacedLabel[]): void {
    this.frame++;
    for (const label of labels) {
      let item = this.items.get(label.key);
      if (!item) {
        const root = document.createElement('div');
        const text = document.createElement('span');
        root.append(text);
        this.element.append(root);
        item = { root, text, value: '', seen: 0 };
        this.items.set(label.key, item);
      }
      if (item.value !== label.text) {
        setRich(item.text, label.text);
        item.value = label.text;
      }
      item.root.className = `label label--${label.kind} label--${label.align}`;
      item.root.style.transform = `translate3d(${label.x.toFixed(1)}px, ${label.y.toFixed(1)}px, 0)`;
      item.root.style.opacity = label.opacity.toFixed(3);
      item.seen = this.frame;
    }
    for (const [key, item] of this.items) {
      if (item.seen === this.frame) continue;
      item.root.remove();
      this.items.delete(key);
    }
  }
}
