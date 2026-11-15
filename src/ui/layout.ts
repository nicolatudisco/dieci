/**
 * The free area: the part of the stage that the interface leaves to the scene.
 *
 * It is not computed: it is MEASURED. The interface is a CSS grid with an empty cell where
 * the scene shows through (`.ui__scene`); the opening and the finale have a cell of their
 * own. Whoever owns the screen says which element to follow, this class measures it and
 * tells the engine, which frames the scene inside it. Safe areas, breakpoints and the size
 * of the caption are all handled by CSS, in one place.
 */
import type { Engine } from '../engine/engine.ts';
import type { Rect } from '../engine/framing.ts';

export class FreeArea {
  private readonly engine: Engine;
  private readonly stage: HTMLElement;
  private readonly observer: ResizeObserver;
  private target: HTMLElement | null = null;
  private frozen = false;
  private stageWidth = 0;
  private stageHeight = 0;

  constructor(engine: Engine, stage: HTMLElement) {
    this.engine = engine;
    this.stage = stage;
    this.observer = new ResizeObserver(() => this.measure(false));
    this.observer.observe(stage);
  }

  /** The element whose box is the free area from now on. */
  follow(element: HTMLElement, immediate = false): void {
    if (element === this.target) return;
    if (this.target) this.observer.unobserve(this.target);
    this.target = element;
    this.observer.observe(element);
    this.measure(immediate);
  }

  /** Reading mode: while frozen, changes of the layout do not move the scene. */
  freeze(frozen: boolean): void {
    if (frozen === this.frozen) return;
    this.frozen = frozen;
    if (!frozen) this.measure(false);
  }

  private measure(immediate: boolean): void {
    const target = this.target;
    if (!target) return;
    const stage = this.stage.getBoundingClientRect();
    // A new size of the stage (rotation, window resize) is applied at once and always.
    const resized = stage.width !== this.stageWidth || stage.height !== this.stageHeight;
    this.stageWidth = stage.width;
    this.stageHeight = stage.height;
    if (this.frozen && !resized) return;
    const box = target.getBoundingClientRect();
    const rect: Rect = {
      x: box.left - stage.left,
      y: box.top - stage.top,
      width: Math.max(48, box.width),
      height: Math.max(48, box.height),
    };
    this.engine.setFreeRect(rect, immediate || resized);
  }
}
