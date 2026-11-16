/**
 * A sketch: the base of the curated placeholders. Thin lines and points of light on the
 * night, at true scale. A level is described by a function that draws on a `Sketch` with
 * a handful of verbs (shape, ring, line, dots, label, lens); fades, labels that come and
 * go around the stop, quality and disposal are handled here.
 *
 * Everything is in the local units of the level; `local()` converts a point of the stage.
 */
import { Scene, type Mesh, type Points } from 'three';
import { STOPS } from '../../content/levels.ts';
import type { LabelSpec, LensSpec, Level, LevelContext, LevelDef, LevelFactory, LevelFrame } from '../../engine/level.ts';
import { ANCHORS, type Vec3 } from '../../engine/stage.ts';
import {
  disposeTree,
  makeDots,
  makeLine,
  makeShape,
  sharedUniforms,
  type DotsData,
  type LineOptions,
  type ShapeOptions,
} from './primitives.ts';

/** The colour of thin lines (orbits, edges): the cool accent of the interface. */
export const LINE_COLOR = '#8fa3e6';

/** Over which exponents something is shown: it fades in before `from` and out after `to`. */
export interface Window {
  readonly from?: number;
  readonly to?: number;
}

type SketchLabel = Omit<LabelSpec, 'opacity'> & Window;
type SketchLens = Omit<LensSpec, 'opacity'> & Window;

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

const EDGE = 0.25;

export class Sketch implements Level {
  readonly scene = new Scene();
  readonly targetScenes: Scene[] = [];
  /** Exponent of the stop this level belongs to. */
  readonly exponent: number;
  /** Called every frame, after the shared uniforms are set. */
  tick: ((frame: LevelFrame) => void) | null = null;
  /** Labels that change from frame to frame (text, place, opacity), added to the fixed ones. */
  liveLabels: ((frame: LevelFrame) => readonly LabelSpec[]) | null = null;

  private readonly def: LevelDef;
  private readonly build: (sketch: Sketch) => void;
  private readonly shared = sharedUniforms();
  /** Lens scenes are drawn at full strength: the engine fades the whole lens. */
  private readonly lensShared = sharedUniforms();
  private readonly labelList: SketchLabel[] = [];
  private readonly lensList: SketchLens[] = [];
  private readonly clouds: { points: Points; count: number }[] = [];
  private context: LevelContext | null = null;
  private order = 0;

  constructor(def: LevelDef, build: (sketch: Sketch) => void) {
    const stop = STOPS.find((s) => s.id === def.id);
    if (!stop) throw new Error(`No stop "${def.id}" in levels.ts`);
    this.def = def;
    this.build = build;
    this.exponent = stop.exponent;
    this.lensShared.uPixelRatio.value = 2;
  }

  init(ctx: LevelContext): void {
    this.context = ctx;
    this.build(this);
  }

  /** What the engine tells every level: today's date, her date of birth, static mode. */
  get ctx(): LevelContext {
    if (!this.context) throw new Error('Sketch.ctx is available from init() onwards');
    return this.context;
  }

  /** A point of the stage (metres) in the units of this level. */
  local(p: Vec3): Vec3 {
    const o = ANCHORS[this.def.origin];
    const u = this.def.unit;
    return [(p[0] - o[0]) / u, (p[1] - o[1]) / u, (p[2] - o[2]) / u];
  }

  /** Metres to local units. */
  units(metres: number): number {
    return metres / this.def.unit;
  }

  /** A flat shape (see primitives.ts). Later shapes are drawn over earlier ones. */
  shape(options: ShapeOptions, at: Vec3, degrees = 0): Mesh {
    const mesh = makeShape({ ...options, order: ++this.order }, this.shared);
    mesh.position.set(at[0], at[1], at[2]);
    mesh.rotation.z = (degrees * Math.PI) / 180;
    this.scene.add(mesh);
    return mesh;
  }

  /** A thin circle: an orbit, an edge. */
  ring(at: Vec3, radius: number, options: { color?: string; opacity?: number; line?: number } = {}): Mesh {
    return this.shape(
      { kind: 'ring', half: [radius, 0], color: options.color ?? LINE_COLOR, opacity: options.opacity ?? 0.5, line: options.line ?? 1.25, additive: true },
      at,
    );
  }

  line(a: Vec3, b: Vec3, options: Partial<LineOptions> = {}): Mesh {
    const mesh = makeLine(a, b, { color: LINE_COLOR, opacity: 0.6, ...options, order: ++this.order }, this.shared);
    this.scene.add(mesh);
    return mesh;
  }

  /** Points of light. With `adaptive`, fewer are drawn when the device struggles. */
  dots(data: DotsData, options: { opacity?: number; adaptive?: boolean } = {}): Points {
    const points = makeDots(data, this.shared, options.opacity ?? 1);
    points.renderOrder = ++this.order;
    this.scene.add(points);
    if (options.adaptive) this.clouds.push({ points, count: data.sizes.length });
    return points;
  }

  /** One point of light: a star, a planet, a probe. `size` is its diameter in CSS pixels. */
  dot(at: Vec3, size: number, color: readonly [number, number, number], opacity = 1): Points {
    return this.dots(
      { positions: new Float32Array(at), sizes: new Float32Array([size]), colors: new Float32Array(color), phases: new Float32Array([0.37]) },
      { opacity },
    );
  }

  /** A label; by default it is visible around the stop of this level. */
  label(spec: SketchLabel): void {
    this.labelList.push(spec);
  }

  /** A lens; by default it is visible around the stop of this level. */
  lens(spec: SketchLens): void {
    this.lensList.push(spec);
    if (!this.targetScenes.includes(spec.scene)) this.targetScenes.push(spec.scene);
  }

  /** A scene to show inside a lens, drawn with the same shapes. */
  lensScene(draw: (shape: (options: ShapeOptions, x: number, y: number, degrees?: number) => Mesh) => void): Scene {
    const scene = new Scene();
    let order = 0;
    draw((options, x, y, degrees = 0) => {
      const mesh = makeShape({ ...options, order: ++order }, this.lensShared);
      mesh.position.set(x, y, 0);
      mesh.rotation.z = (degrees * Math.PI) / 180;
      scene.add(mesh);
      return mesh;
    });
    return scene;
  }

  private visibility(item: Window, e: number): number {
    const from = item.from ?? this.exponent - 0.7;
    const to = item.to ?? this.exponent + 0.4;
    return smoothstep(from - EDGE, from, e) * (1 - smoothstep(to, to + EDGE, e));
  }

  update(frame: LevelFrame): void {
    this.shared.uFade.value = frame.fade;
    this.shared.uPixelRatio.value = frame.pixelRatio;
    this.shared.uTime.value = frame.time;
    this.lensShared.uTime.value = frame.time;
    for (const cloud of this.clouds) cloud.points.geometry.setDrawRange(0, Math.max(1, Math.floor(cloud.count * frame.quality)));
    this.tick?.(frame);
  }

  labels(frame: LevelFrame): LabelSpec[] {
    const out: LabelSpec[] = [];
    for (const item of this.labelList) {
      const opacity = this.visibility(item, frame.e);
      if (opacity > 0.01) out.push({ ...item, opacity });
    }
    if (this.liveLabels) out.push(...this.liveLabels(frame));
    return out;
  }

  lenses(frame: LevelFrame): LensSpec[] {
    const out: LensSpec[] = [];
    for (const item of this.lensList) {
      const opacity = this.visibility(item, frame.e);
      if (opacity > 0.01) out.push({ ...item, opacity });
    }
    return out;
  }

  dispose(): void {
    disposeTree(this.scene);
    this.scene.clear();
    for (const scene of this.targetScenes) {
      disposeTree(scene);
      scene.clear();
    }
    this.clouds.length = 0;
  }
}

/** Makes a level factory out of a drawing function. */
export function sketch(build: (s: Sketch) => void): LevelFactory {
  return (def) => new Sketch(def, build);
}
