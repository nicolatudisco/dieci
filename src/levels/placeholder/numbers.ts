/**
 * Placeholders for Act II (the stops of M6): `oltre`, `atomi`, `googol`, `googolplex`.
 * Past the observable universe there is nothing left to draw: only numbers. These levels
 * are typography, in DOM, driven by the position on the journey axis.
 * M6 replaces them: delete this file when its four stops have their real scenes.
 */
import { nodeById } from '../../engine/journey.ts';
import type { Level, LevelDef, LevelFactory, LevelFrame } from '../../engine/level.ts';

function ramp(from: number, to: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - from) / (to - from)));
  return t * t * (3 - 2 * t);
}

/** A small deterministic generator (the scenes must be the same at every visit). */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a * 1664525 + 1013904223) >>> 0;
    return a / 4294967296;
  };
}

/** Base of the four scenes: a layer as large as the stage, with a box on the free area. */
abstract class NumberLevel implements Level {
  readonly dom = document.createElement('div');
  /** Covers exactly the free area of the scene. */
  protected readonly box = document.createElement('div');
  /** Position of the stop of this level on the journey axis. */
  protected readonly at: number;
  private placed = '';

  constructor(def: LevelDef) {
    this.at = nodeById(def.id)?.u ?? def.range[0];
    this.dom.className = `numbers numbers--${def.id}`;
    this.dom.setAttribute('aria-hidden', 'true');
    this.box.className = 'numbers__box';
    this.dom.append(this.box);
  }

  init(): void {}

  update(frame: LevelFrame): void {
    const { x, y, width, height } = frame.free;
    const key = `${x.toFixed(0)},${y.toFixed(0)},${width.toFixed(0)},${height.toFixed(0)}`;
    if (key !== this.placed) {
      this.placed = key;
      this.box.style.left = `${x.toFixed(1)}px`;
      this.box.style.top = `${y.toFixed(1)}px`;
      this.box.style.width = `${width.toFixed(1)}px`;
      this.box.style.height = `${height.toFixed(1)}px`;
      this.resize(width, height);
    }
    this.draw(frame);
  }

  protected resize(_width: number, _height: number): void {}
  protected abstract draw(frame: LevelFrame): void;

  dispose(): void {
    this.dom.remove();
  }
}

/** `oltre`: deep black, with digits that surface and dissolve around the point that was the universe. */
class Beyond extends NumberLevel {
  constructor(def: LevelDef) {
    super(def);
    const random = seeded(30);
    for (let i = 0; i < 44; i++) {
      const digit = document.createElement('span');
      digit.className = 'numbers__drift';
      digit.textContent = String(Math.floor(random() * 10));
      // Anywhere but the middle, where the warm dot is.
      let x = random();
      let y = random();
      if (Math.hypot(x - 0.5, y - 0.5) < 0.16) {
        x = x < 0.5 ? x * 0.5 : 0.5 + x * 0.5;
        y = y < 0.5 ? y * 0.4 : 0.6 + y * 0.4;
      }
      digit.style.left = `${(x * 92 + 2).toFixed(1)}%`;
      digit.style.top = `${(y * 88 + 2).toFixed(1)}%`;
      digit.style.fontSize = `${(1 + random() ** 2 * 3).toFixed(2)}em`;
      digit.style.setProperty('--peak', (0.18 + random() * 0.4).toFixed(2));
      digit.style.animationDuration = `${(6 + random() * 7).toFixed(1)}s`;
      digit.style.animationDelay = `${(-random() * 13).toFixed(1)}s`;
      this.box.append(digit);
    }
  }

  protected override resize(width: number, height: number): void {
    // Digits scale with the scene, so a phone is not crowded.
    this.box.style.fontSize = `${Math.min(18, Math.max(9, Math.min(width, height) / 34)).toFixed(1)}px`;
  }

  protected draw(): void {}
}

/** `atomi` and `googol`: a 1 followed by zeros in rows of ten, so that they can be counted. */
class Zeros extends NumberLevel {
  private readonly cells: HTMLSpanElement[] = [];
  private readonly grid = document.createElement('div');
  private shown = -1;

  constructor(def: LevelDef, count: number) {
    super(def);
    this.grid.className = 'numbers__zeros';
    for (let row = 0; row * 10 < count; row++) {
      const first = document.createElement('span');
      first.className = 'numbers__one';
      first.textContent = row === 0 ? '1' : '';
      this.grid.append(first);
      for (let i = 0; i < 10 && row * 10 + i < count; i++) {
        const zero = document.createElement('span');
        zero.className = 'numbers__zero';
        zero.textContent = '0';
        this.grid.append(zero);
        this.cells.push(zero);
      }
    }
    this.box.append(this.grid);
  }

  protected override resize(width: number, height: number): void {
    // Eleven columns (the 1, then ten zeros) and as many rows as needed must fit.
    const rows = Math.ceil(this.cells.length / 10);
    const size = Math.min((width * 0.9) / (11 * 0.72), (height * 0.86) / (rows * 1.12), 112);
    this.grid.style.fontSize = `${Math.max(12, size).toFixed(1)}px`;
  }

  protected draw(frame: LevelFrame): void {
    // The zeros are written one after the other while the journey comes near the stop.
    const progress = frame.isStatic ? 1 : ramp(this.at - 1.05, this.at - 0.12, frame.u);
    const shown = Math.round(this.cells.length * progress);
    if (shown === this.shown) return;
    this.shown = shown;
    this.cells.forEach((cell, index) => cell.classList.toggle('is-on', index < shown));
  }
}

/** `googolplex`: zeros that cannot be counted, flowing faster and faster into a cascade of light. */
class Cascade extends NumberLevel {
  private readonly zeros = document.createElement('div');
  private readonly light = document.createElement('div');
  private offset = 0;
  private rowHeight = 22;

  constructor(def: LevelDef) {
    super(def);
    this.zeros.className = 'numbers__cascade';
    this.light.className = 'numbers__light';
    // The cascade covers the whole stage, not only the free area.
    this.dom.prepend(this.zeros);
    this.dom.append(this.light);
  }

  override init(): void {
    this.fill(window.innerWidth, window.innerHeight);
  }

  private fill(width: number, height: number): void {
    const size = Math.min(22, Math.max(15, width / 44));
    this.rowHeight = size * 1.25;
    const columns = Math.ceil(width / (size * 0.56)) + 2;
    const rows = Math.ceil(height / this.rowHeight) + 3;
    this.zeros.style.fontSize = `${size.toFixed(1)}px`;
    this.zeros.style.lineHeight = `${this.rowHeight.toFixed(2)}px`;
    this.zeros.textContent = Array.from({ length: rows }, () => '0'.repeat(columns)).join('\n');
  }

  protected draw(frame: LevelFrame): void {
    const rush = ramp(this.at + 0.15, this.at + 1.3, frame.u);
    // Slow at the stop, a torrent on the way to the finale.
    const speed = 12 + 1400 * rush * rush;
    this.offset = (this.offset + speed * frame.dt) % this.rowHeight;
    this.zeros.style.transform = `translate3d(0, ${(-this.offset).toFixed(2)}px, 0)`;
    this.zeros.style.opacity = (0.22 + 0.6 * rush).toFixed(3);
    this.light.style.opacity = ramp(this.at + 0.55, this.at + 1.45, frame.u).toFixed(3);
  }
}

export const oltre: LevelFactory = (def) => new Beyond(def);
export const atomi: LevelFactory = (def) => new Zeros(def, 80);
export const googol: LevelFactory = (def) => new Zeros(def, 100);
export const googolplex: LevelFactory = (def) => new Cascade(def);
