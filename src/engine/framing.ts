/**
 * Framing: from the journey state to a camera, in the units of one level.
 *
 * «Largo» is the short side of the free area (the part of the viewport that the caption
 * panel and the counter leave free), minus a small margin. The view width 10^e metres
 * spans exactly the «largo». The camera is a perspective camera whose field of view is
 * fixed at 30° ACROSS THE LARGO, so its distance from the focus plane is always
 * 1.87 × 10^e metres, in every viewport.
 */
import type { PerspectiveCamera } from 'three';
import type { Vec3 } from './stage.ts';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Field of view across the «largo», in degrees. */
export const FOV_ON_LARGO = 30;
const TAN_HALF = Math.tan((FOV_ON_LARGO * Math.PI) / 360);
/** Camera distance from the focus plane, in view widths. */
export const CAMERA_DISTANCE = 1 / (2 * TAN_HALF);
/** Margin kept free on each side of the free area, as a share of its short side. */
export const FREE_MARGIN = 0.04;

export interface Framing {
  /** Canvas size in CSS pixels. */
  readonly width: number;
  readonly height: number;
  /** Free area in CSS pixels. */
  readonly free: Rect;
  /** Centre of the free area: the principal point of the projection. */
  readonly cx: number;
  readonly cy: number;
  /** Length in CSS pixels that corresponds to 10^e metres. */
  readonly largoPx: number;
  /** Camera exponent: log10 of the view width in metres. */
  readonly e: number;
  /** Centre of the view on the stage, in metres. */
  readonly centre: Vec3;
}

export function makeFraming(width: number, height: number, free: Rect, e: number, centre: Vec3): Framing {
  const short = Math.max(1, Math.min(free.width, free.height));
  return {
    width,
    height,
    free,
    cx: free.x + free.width / 2,
    cy: free.y + free.height / 2,
    largoPx: short * (1 - 2 * FREE_MARGIN),
    e,
    centre,
  };
}

export interface LevelView {
  /** View width in the units of the level. */
  readonly viewWidth: number;
  /** CSS pixels per unit of the level, on the focus plane. */
  readonly pxPerUnit: number;
  /** Point the camera looks at, in the units of the level. */
  readonly target: Vec3;
  /** Distance of the camera from the focus plane, in the units of the level. */
  readonly distance: number;
}

/**
 * The view of a level whose local origin is the stage point `origin` and whose unit is
 * `unit` metres. The subtraction is done here, in float64: levels only ever see small numbers.
 */
export function levelView(f: Framing, unit: number, origin: Vec3): LevelView {
  const viewWidth = 10 ** f.e / unit;
  return {
    viewWidth,
    pxPerUnit: f.largoPx / viewWidth,
    target: [(f.centre[0] - origin[0]) / unit, (f.centre[1] - origin[1]) / unit, (f.centre[2] - origin[2]) / unit],
    distance: viewWidth * CAMERA_DISTANCE,
  };
}

export interface DepthRange {
  /** Near and far planes, as multiples of the camera distance. */
  readonly near: number;
  readonly far: number;
}

export const DEFAULT_DEPTH: DepthRange = { near: 0.02, far: 60 };

/** Configures `camera` for one level. The camera looks straight down the -z axis. */
export function applyFraming(camera: PerspectiveCamera, f: Framing, view: LevelView, depth: DepthRange): void {
  camera.position.set(view.target[0], view.target[1], view.target[2] + view.distance);
  camera.quaternion.identity();
  camera.fov = (2 * Math.atan((f.height / f.largoPx) * TAN_HALF) * 180) / Math.PI;
  camera.aspect = f.width / f.height;
  camera.near = view.distance * depth.near;
  camera.far = view.distance * depth.far;
  // Moves the principal point from the middle of the canvas to the middle of the free area.
  camera.setViewOffset(f.width, f.height, f.width / 2 - f.cx, f.height / 2 - f.cy, f.width, f.height);
  camera.updateMatrixWorld(true);
}

export interface ScreenPoint {
  /** CSS pixels from the top-left corner of the canvas. */
  x: number;
  y: number;
  /** Magnification relative to the focus plane (1 on the plane, more when closer to the camera). */
  scale: number;
  /** False when the point is behind the camera. */
  visible: boolean;
}

function project(f: Framing, rx: number, ry: number, rz: number): ScreenPoint {
  // rx, ry, rz: offset from the centre of the view, in view widths.
  const depth = CAMERA_DISTANCE - rz;
  if (depth <= CAMERA_DISTANCE * 0.02) return { x: f.cx, y: f.cy, scale: 0, visible: false };
  const scale = CAMERA_DISTANCE / depth;
  return { x: f.cx + rx * scale * f.largoPx, y: f.cy - ry * scale * f.largoPx, scale, visible: true };
}

/** Projects a stage point (metres) to the screen. Used for «Tu sei qui» and the scale frames. */
export function projectStage(f: Framing, p: Vec3): ScreenPoint {
  const w = 10 ** f.e;
  return project(f, (p[0] - f.centre[0]) / w, (p[1] - f.centre[1]) / w, (p[2] - f.centre[2]) / w);
}

/** Projects a point given in the units of a level to the screen. Used for labels and lenses. */
export function projectLocal(f: Framing, view: LevelView, p: Vec3): ScreenPoint {
  const k = 1 / view.viewWidth;
  return project(f, (p[0] - view.target[0]) * k, (p[1] - view.target[1]) * k, (p[2] - view.target[2]) * k);
}
