/**
 * Generic placeholder for a stop of Act I: a field of points of light with depth (so the
 * zoom is felt as flying backwards), a thin ring 80% of the view wide, centred where the
 * view is centred at the stop, and the title of the stop.
 *
 * It makes the whole scale travellable before the real scenes exist. A milestone replaces
 * it by pointing `load` in levels/registry.ts to its own module.
 */
import { Color, Scene, type Points } from 'three';
import { STOPS } from '../../content/levels.ts';
import type { LabelSpec, Level, LevelDef, LevelFrame } from '../../engine/level.ts';
import { ANCHORS, centreAt, type Vec3 } from '../../engine/stage.ts';
import { disposeTree, makeDots, makeShape, mulberry32, sharedUniforms } from './primitives.ts';

const DOT_COUNT = 1100;
const RING_COLOR = '#8fa3e6';

/** Opacity of the title: full at the stop, gone 0.6 decades away. */
function titleOpacity(distance: number): number {
  const t = Math.min(1, Math.max(0, (Math.abs(distance) - 0.25) / 0.35));
  return 1 - t * t * (3 - 2 * t);
}

class GenericPlaceholder implements Level {
  readonly scene = new Scene();
  private readonly shared = sharedUniforms();
  private readonly exponent: number;
  private readonly title: string;
  private readonly centre: Vec3;
  private readonly width: number;
  private dots: Points | null = null;

  constructor(def: LevelDef) {
    const stop = STOPS.find((s) => s.id === def.id);
    if (!stop) throw new Error(`No stop "${def.id}" in levels.ts`);
    this.exponent = stop.exponent;
    this.title = stop.title;
    // Local position of the centre of the view at the stop, and width of the view.
    const c = centreAt(stop.exponent);
    const o = ANCHORS[def.origin];
    this.centre = [(c[0] - o[0]) / def.unit, (c[1] - o[1]) / def.unit, (c[2] - o[2]) / def.unit];
    this.width = 10 ** stop.exponent / def.unit;
  }

  init(): void {
    const random = mulberry32(Math.round(this.exponent * 1000) + 7);
    const [cx, cy, cz] = this.centre;
    const w = this.width;

    const positions = new Float32Array(DOT_COUNT * 3);
    const sizes = new Float32Array(DOT_COUNT);
    const colors = new Float32Array(DOT_COUNT * 3);
    const phases = new Float32Array(DOT_COUNT);
    const cool = new Color('#cfd8ff');
    const blue = new Color('#7d9bff');
    const tint = new Color();
    for (let i = 0; i < DOT_COUNT; i++) {
      // Denser towards the middle, spread over more than the view, at many depths.
      const radius = 1.7 * w * random() ** 0.7;
      const angle = random() * Math.PI * 2;
      positions[i * 3] = cx + radius * Math.cos(angle);
      positions[i * 3 + 1] = cy + radius * Math.sin(angle);
      positions[i * 3 + 2] = cz + w * (random() * 1.5 - 1.0);
      sizes[i] = 2.6 + 5.4 * random() ** 3;
      tint.copy(cool).lerp(blue, random() * 0.6).multiplyScalar(0.45 + 0.55 * random());
      colors[i * 3] = tint.r;
      colors[i * 3 + 1] = tint.g;
      colors[i * 3 + 2] = tint.b;
      phases[i] = random();
    }
    this.dots = makeDots({ positions, sizes, colors, phases }, this.shared, 1);
    this.scene.add(this.dots);

    const ring = makeShape({ kind: 'ring', half: [0.4 * w, 0], color: RING_COLOR, opacity: 0.55, line: 1.25, additive: true }, this.shared);
    ring.position.set(cx, cy, cz);
    this.scene.add(ring);
  }

  update(frame: LevelFrame): void {
    this.shared.uFade.value = frame.fade;
    this.shared.uPixelRatio.value = frame.pixelRatio;
    this.shared.uTime.value = frame.time;
    this.dots?.geometry.setDrawRange(0, Math.max(1, Math.floor(DOT_COUNT * frame.quality)));
  }

  labels(frame: LevelFrame): LabelSpec[] {
    const opacity = titleOpacity(frame.e - this.exponent);
    if (opacity <= 0) return [];
    const [cx, cy, cz] = this.centre;
    return [{ id: 'title', text: this.title, at: [cx, cy + 0.4 * this.width, cz], opacity, kind: 'title', align: 'above' }];
  }

  dispose(): void {
    disposeTree(this.scene);
    this.scene.clear();
    this.dots = null;
  }
}

export default function createGenericPlaceholder(def: LevelDef): Level {
  return new GenericPlaceholder(def);
}
