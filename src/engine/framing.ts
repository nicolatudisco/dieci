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

/** Under the lens (the usual place) or over it, where the text of a lens goes. */
export type CaptionSide = 'below' | 'above';

export interface LensCircle {
  /** Centre and radius of the lens, in CSS pixels. */
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  /** The direction that was chosen, in degrees. */
  readonly angle: number;
  /** Where its text goes. */
  readonly caption: CaptionSide;
  /** Which of the distances from the object was chosen (0 is the nearest). */
  readonly reach: number;
}

/** The size of the text of a lens (its name and «ingrandito, non in scala»), in CSS pixels. */
export interface CaptionSize {
  readonly width: number;
  readonly height: number;
}

/** Until the interface has measured the real text: two lines, a short name. */
export const DEFAULT_CAPTION: CaptionSize = { width: 170, height: 44 };

/** Gap between the edge of a lens and its text. */
export const LENS_CAPTION_GAP = 6;

/**
 * Something a lens should not cover, and how much it matters: the warm dot and its words
 * weigh much more than a label of the scene.
 */
export interface Keep {
  readonly rect: Rect;
  readonly weight: number;
}

/** Directions tried around the preferred one, in degrees. */
const LENS_TURNS = [0, 30, -30, 60, -60, 90, -90, 125, -125, 155, -155, 180];

/** Area shared by two rectangles, in square pixels. */
export function overlap(a: Rect, b: Rect): number {
  const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

/** Where the text of a lens is, centred under it or over it. */
export function lensCaptionBox(lens: { x: number; y: number; radius: number; caption: CaptionSide }, size: CaptionSize): Rect {
  const top = lens.caption === 'below' ? lens.y + lens.radius + LENS_CAPTION_GAP : lens.y - lens.radius - LENS_CAPTION_GAP - size.height;
  return { x: lens.x - size.width / 2, y: top, width: size.width, height: size.height };
}

/** The square around the circle of a lens. */
export function lensCircleBox(lens: { x: number; y: number; radius: number }): Rect {
  return { x: lens.x - lens.radius, y: lens.y - lens.radius, width: 2 * lens.radius, height: 2 * lens.radius };
}

/** The words of a label without the markup of its superscripts (`10^{7} m` → `107 m`). */
function plainText(text: string): string {
  return text.replace(/\^\{([^}]*)\}/g, '$1');
}

/**
 * Roughly where a label of the scene is on the screen (see `.label` in base.css): its
 * point, its side, and a width from the number of its letters. Generous on purpose.
 */
export function labelBox(label: { x: number; y: number; text: string; kind?: string; align?: string }): Rect {
  const px = label.kind === 'title' ? 22 : label.kind === 'note' ? 13 : 15;
  const width = plainText(label.text).length * px * (label.kind === 'figure' ? 0.62 : 0.56) + 8;
  const height = px * 1.4;
  switch (label.align) {
    case 'below':
      return { x: label.x - width / 2, y: label.y + 10, width, height };
    case 'left':
      return { x: label.x - 12 - width, y: label.y - height / 2, width, height };
    case 'right':
      return { x: label.x + 12, y: label.y - height / 2, width, height };
    case 'center':
      return { x: label.x - width / 2, y: label.y - height / 2, width, height };
    default:
      return { x: label.x - width / 2, y: label.y - 10 - height, width, height };
  }
}

/**
 * Where a lens sits: beside the true position of its object (`anchor`, in CSS pixels),
 * always whole inside the free area with its text, which goes under it or, when that is
 * better, over it.
 *
 * It goes in the direction `preferred` (degrees, 0 = right, 90 = up), at the nearest of two
 * distances, unless there it would be pushed back by the edge of the free area, cover its
 * own object, or cover what is in `avoid` (the warm dot and its words, the labels of the
 * scene, other lenses): then it turns, moves out or puts its text over itself, whatever
 * costs least. `previous` is the choice of the frame before: the lens leaves it only for a
 * clearly better one, so it does not hop back and forth while the scene zooms.
 */
export function placeLens(
  f: Framing,
  anchor: { x: number; y: number },
  preferred: number,
  avoid: readonly (Rect | Keep)[] = [],
  previous?: number | Pick<LensCircle, 'angle' | 'caption' | 'reach'>,
  caption: CaptionSize = DEFAULT_CAPTION,
): LensCircle {
  // On a small screen the lens may be a little smaller, to find room.
  const radius = Math.min(96, Math.max(f.largoPx < 340 ? 32 : 38, f.largoPx * 0.14));
  const reaches = [radius * 1.55 + 14, radius * 2.25 + 20];
  const pad = 8;
  const { free } = f;
  const keeps: Keep[] = avoid.map((item) => ('rect' in item ? item : { rect: item, weight: 1 }));
  // The text may be wider than the lens: it must stay inside the free area too.
  const half = Math.max(radius, caption.width / 2);
  const minX = free.x + half + pad;
  const maxX = Math.max(minX, free.x + free.width - half - pad);
  const room = caption.height + LENS_CAPTION_GAP;
  // Around the object it points at: never covered, by the lens or by its text.
  const own: Rect = { x: anchor.x - 6, y: anchor.y - 6, width: 12, height: 12 };

  const attempt = (degrees: number, reach: number, side: CaptionSide): { circle: LensCircle; cost: number } => {
    const a = (degrees * Math.PI) / 180;
    const distance = reaches[reach] ?? reaches[0] ?? 0;
    const wantX = anchor.x + Math.cos(a) * distance;
    const wantY = anchor.y - Math.sin(a) * distance;
    const minY = free.y + pad + radius + (side === 'above' ? room : 0);
    const maxY = Math.max(minY, free.y + free.height - pad - radius - (side === 'below' ? room : 0));
    const x = Math.min(Math.max(wantX, minX), maxX);
    const y = Math.min(Math.max(wantY, minY), maxY);
    const circle: LensCircle = { x, y, radius, angle: degrees, caption: side, reach };
    const ring = lensCircleBox(circle);
    const text = lensCaptionBox(circle, caption);
    let cost = Math.hypot(x - wantX, y - wantY) * 60 + reach * 700 + (side === 'above' ? 500 : 0);
    for (const keep of keeps) cost += (overlap(ring, keep.rect) + overlap(text, keep.rect)) * 6 * keep.weight;
    // Covering the very object it points at is the worst outcome.
    const gap = Math.hypot(x - anchor.x, y - anchor.y) - radius;
    if (gap < 10) cost += (10 - gap) * 2000;
    cost += overlap(text, own) * 400;
    return { circle, cost };
  };

  let best = attempt(preferred, 0, 'below');
  for (const turn of LENS_TURNS) {
    for (const reach of [0, 1]) {
      for (const side of ['below', 'above'] as const) {
        const candidate = attempt(preferred + turn, reach, side);
        // Turning away from the preferred direction has a small price of its own.
        candidate.cost += Math.abs(turn) * 4;
        if (candidate.cost < best.cost) best = candidate;
      }
    }
  }
  if (previous !== undefined) {
    const before = typeof previous === 'number' ? { angle: previous, caption: 'below' as const, reach: 0 } : previous;
    const same = before.angle === best.circle.angle && before.caption === best.circle.caption && before.reach === best.circle.reach;
    if (!same) {
      const stay = attempt(before.angle, before.reach, before.caption);
      stay.cost += Math.abs(before.angle - preferred) * 4;
      if (stay.cost <= best.cost * 1.35 + 400) best = stay;
    }
  }
  return best.circle;
}
