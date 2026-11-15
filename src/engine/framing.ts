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

export interface LensCircle {
  /** Centre and radius of the lens, in CSS pixels. */
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  /** The direction that was chosen, in degrees: pass it back as `previous` on the next frame. */
  readonly angle: number;
}

/** Room kept under a lens for its two lines of text, in CSS pixels. */
export const LENS_CAPTION_ROOM = 52;
/** Half the width of the text under a lens, beyond its radius. */
export const LENS_CAPTION_OVERHANG = 40;

/** Directions tried around the preferred one, in degrees. */
const LENS_TURNS = [0, 40, -40, 80, -80, 125, -125, 180];

/** Area shared by two rectangles, in square pixels. */
export function overlap(a: Rect, b: Rect): number {
  const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

/**
 * Where a lens sits: beside the true position of its object (`anchor`, in CSS pixels),
 * always whole inside the free area, with its text under it.
 *
 * It goes in the direction `preferred` (degrees, 0 = right, 90 = up) unless there it would
 * be pushed back by the edge of the free area, cover its own object, or cover one of the
 * boxes in `avoid` (the warm dot and its words): then it turns to the best direction nearby.
 * `previous` is the direction used on the frame before: the lens leaves it only for a
 * clearly better one, so it does not hop back and forth while the scene zooms.
 */
export function placeLens(
  f: Framing,
  anchor: { x: number; y: number },
  preferred: number,
  avoid: readonly Rect[] = [],
  previous?: number,
): LensCircle {
  const radius = Math.min(96, Math.max(38, f.largoPx * 0.14));
  const reach = radius * 1.55 + 14;
  const pad = 10;
  const { free } = f;
  // The text under the lens is wider than the lens: it must stay inside too.
  const minX = free.x + radius + LENS_CAPTION_OVERHANG + pad;
  const maxX = Math.max(minX, free.x + free.width - radius - LENS_CAPTION_OVERHANG - pad);
  const minY = free.y + radius + pad;
  const maxY = Math.max(minY, free.y + free.height - radius - pad - LENS_CAPTION_ROOM);

  const attempt = (degrees: number): { circle: LensCircle; cost: number } => {
    const a = (degrees * Math.PI) / 180;
    const wantX = anchor.x + Math.cos(a) * reach;
    const wantY = anchor.y - Math.sin(a) * reach;
    const x = Math.min(Math.max(wantX, minX), maxX);
    const y = Math.min(Math.max(wantY, minY), maxY);
    const box: Rect = {
      x: x - radius - LENS_CAPTION_OVERHANG,
      y: y - radius,
      width: 2 * (radius + LENS_CAPTION_OVERHANG),
      height: 2 * radius + LENS_CAPTION_ROOM,
    };
    let cost = Math.hypot(x - wantX, y - wantY) * 60;
    for (const rect of avoid) cost += overlap(box, rect) * 6;
    // Covering the very object it points at is the worst outcome.
    const gap = Math.hypot(x - anchor.x, y - anchor.y) - radius;
    if (gap < 10) cost += (10 - gap) * 2000;
    return { circle: { x, y, radius, angle: degrees }, cost };
  };

  let best = attempt(preferred);
  for (const turn of LENS_TURNS.slice(1)) {
    const candidate = attempt(preferred + turn);
    // Turning away from the preferred direction has a small price of its own.
    candidate.cost += Math.abs(turn) * 4;
    if (candidate.cost < best.cost) best = candidate;
  }
  if (previous !== undefined && previous !== best.circle.angle) {
    const stay = attempt(previous);
    stay.cost += Math.abs(previous - preferred) * 4;
    if (stay.cost <= best.cost * 1.35 + 400) best = stay;
  }
  return best.circle;
}
