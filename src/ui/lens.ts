/**
 * The lenses, as seen by the interface: the thin edge of each circle, the thread that
 * ties it to the true position of the object, the name of the object and the words
 * «ingrandito, non in scala». The image inside the circle is drawn by the engine
 * (engine/lens.ts) in exactly the same place.
 */
import { LABELS } from '../content/labels.ts';
import type { PlacedLens } from '../engine/engine.ts';
import { LENS_CAPTION_GAP, type CaptionSize } from '../engine/framing.ts';
import { el } from './dom.ts';

interface Item {
  readonly root: HTMLDivElement;
  readonly thread: HTMLDivElement;
  readonly ring: HTMLDivElement;
  readonly anchor: HTMLDivElement;
  readonly caption: HTMLDivElement;
  readonly name: HTMLSpanElement;
  seen: number;
}

/** Radius of the small circle around the true position, in CSS pixels. */
const ANCHOR_RADIUS = 6;

export class LensLayer {
  readonly element = el('div', 'lenses');
  private readonly items = new Map<string, Item>();
  private frame = 0;
  /** An invisible copy of the text of a lens, to measure it before it is shown. */
  private readonly probe = el('div', 'lens__caption lens__caption--probe');
  private readonly probeName = el('span', 'lens__name');
  private readonly sizes = new Map<string, CaptionSize>();

  constructor() {
    // The same words are in the caption of the stop: here they would only be noise.
    this.element.setAttribute('aria-hidden', 'true');
    this.probe.append(this.probeName, el('span', 'lens__note', LABELS.lensNote));
    this.element.append(this.probe);
    // The type grows with the screen and arrives a moment after the page: measure again.
    const forget = (): void => this.sizes.clear();
    window.addEventListener('resize', forget);
    document.fonts?.addEventListener('loadingdone', forget);
  }

  /**
   * The size of the text of a lens with this name: the engine keeps room for exactly this
   * (`Engine.measureLensCaptions`). Measured once for each name and screen.
   */
  measure(label: string): CaptionSize {
    const known = this.sizes.get(label);
    if (known) return known;
    this.probeName.textContent = label;
    // Rounded up with a hair to spare: a fraction of a pixel less, and the name would wrap.
    const box = this.probe.getBoundingClientRect();
    const size = { width: Math.ceil(box.width) + 2, height: Math.ceil(box.height) };
    // Not laid out yet (hidden page): no measure to keep.
    if (size.width === 0) return { width: 170, height: 44 };
    this.sizes.set(label, size);
    return size;
  }

  update(lenses: readonly PlacedLens[]): void {
    this.frame++;
    for (const lens of lenses) {
      let item = this.items.get(lens.key);
      if (!item) {
        item = this.create();
        this.items.set(lens.key, item);
      }
      const { root, thread, ring, anchor, caption, name } = item;
      root.style.opacity = lens.opacity.toFixed(3);

      const size = lens.radius * 2;
      ring.style.width = `${size.toFixed(1)}px`;
      ring.style.height = `${size.toFixed(1)}px`;
      ring.style.transform = `translate3d(${(lens.x - lens.radius).toFixed(1)}px, ${(lens.y - lens.radius).toFixed(1)}px, 0)`;
      anchor.style.transform = `translate3d(${lens.anchorX.toFixed(1)}px, ${lens.anchorY.toFixed(1)}px, 0)`;

      // The thread runs from the small circle to the edge of the lens.
      const dx = lens.x - lens.anchorX;
      const dy = lens.y - lens.anchorY;
      const distance = Math.hypot(dx, dy);
      const length = Math.max(0, distance - lens.radius - ANCHOR_RADIUS);
      const angle = Math.atan2(dy, dx);
      const startX = lens.anchorX + Math.cos(angle) * ANCHOR_RADIUS;
      const startY = lens.anchorY + Math.sin(angle) * ANCHOR_RADIUS;
      thread.style.width = `${length.toFixed(1)}px`;
      thread.style.transform = `translate3d(${startX.toFixed(1)}px, ${startY.toFixed(1)}px, 0) rotate(${angle.toFixed(4)}rad)`;

      if (name.textContent !== lens.label) name.textContent = lens.label;
      // Exactly the room that the placement keeps for it: under the lens, or over it.
      const top = lens.caption === 'below' ? lens.y + lens.radius + LENS_CAPTION_GAP : lens.y - lens.radius - LENS_CAPTION_GAP - lens.captionHeight;
      caption.style.width = `${lens.captionWidth}px`;
      caption.style.transform = `translate3d(${(lens.x - lens.captionWidth / 2).toFixed(1)}px, ${top.toFixed(1)}px, 0)`;
      item.seen = this.frame;
    }
    for (const [key, item] of this.items) {
      if (item.seen === this.frame) continue;
      item.root.remove();
      this.items.delete(key);
    }
  }

  private create(): Item {
    const root = el('div', 'lens');
    const thread = el('div', 'lens__thread');
    const ring = el('div', 'lens__ring');
    const anchor = el('div', 'lens__anchor');
    const caption = el('div', 'lens__caption');
    const name = el('span', 'lens__name');
    caption.append(name, el('span', 'lens__note', LABELS.lensNote));
    root.append(thread, anchor, ring, caption);
    this.element.append(root);
    return { root, thread, ring, anchor, caption, name, seen: 0 };
  }
}
