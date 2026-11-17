/**
 * The six pictures of the lab, drawn by us: SVG path data on a 100 × 100 grid, everything
 * inside the circle of radius 50 around the centre (they go on the round label of the
 * disc). The same strings become <path> elements on the tiles and Path2D on the canvas of
 * the disc (src/golden-record/paint.ts). No photos.
 *
 * What they show is true: the coasts of the Earth come from Natural Earth; the DNA is a
 * right-handed double helix with about ten base pairs a turn and its two grooves; the dome
 * is Brunelleschi's, pointed, on its octagonal drum with the round windows; the star has
 * the spikes of light that telescopes see, not five points.
 */
import type { PictureId } from './design.ts';
import { EARTH_CENTRE, EARTH_COASTS } from './earth-outline.ts';
import { seeded } from './random.ts';

export interface Stroke {
  readonly d: string;
  /** Times the width of a line. */
  readonly weight: number;
  /** A detail: drawn fainter. */
  readonly faint?: boolean;
}

export interface Picture {
  readonly strokes: readonly Stroke[];
  /** Filled shapes, drawn last. */
  readonly fills: readonly string[];
}

type Point = readonly [number, number];

const f = (n: number): string => String(Math.round(n * 10) / 10);
const at = ([x, y]: Point): string => `${f(x)} ${f(y)}`;

function line(points: readonly Point[], close = false): string {
  return points.map((p, i) => `${i ? 'L' : 'M'}${at(p)}`).join('') + (close ? 'Z' : '');
}

function circle(cx: number, cy: number, r: number): string {
  return `M${f(cx - r)} ${f(cy)}A${f(r)} ${f(r)} 0 1 0 ${f(cx + r)} ${f(cy)}A${f(r)} ${f(r)} 0 1 0 ${f(cx - r)} ${f(cy)}Z`;
}

function ellipse(cx: number, cy: number, rx: number, ry: number): string {
  return `M${f(cx - rx)} ${f(cy)}A${f(rx)} ${f(ry)} 0 1 0 ${f(cx + rx)} ${f(cy)}A${f(rx)} ${f(ry)} 0 1 0 ${f(cx - rx)} ${f(cy)}Z`;
}

function rotate([x, y]: Point, angle: number, [cx, cy]: Point): Point {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c];
}

const RAD = Math.PI / 180;

// ── La Terra vista dallo spazio ─────────────────────────────────────────────

function earth(): Picture {
  const { x: C, y: CY, r: R } = EARTH_CENTRE;
  // The same view as scripts/golden-record-earth.mjs: above 20° N, 15° E.
  const lat0 = 20 * RAD;
  const lon0 = 15 * RAD;
  const project = (lon: number, lat: number): Point | null => {
    const p = lat * RAD;
    const l = lon * RAD - lon0;
    if (Math.sin(lat0) * Math.sin(p) + Math.cos(lat0) * Math.cos(p) * Math.cos(l) < 0.03) return null;
    return [C + R * Math.cos(p) * Math.sin(l), CY - R * (Math.cos(lat0) * Math.sin(p) - Math.sin(lat0) * Math.cos(p) * Math.cos(l))];
  };
  const traced = (points: (Point | null)[]): string[] => {
    const out: string[] = [];
    let run: Point[] = [];
    for (const p of [...points, null]) {
      if (p) run.push(p);
      else {
        if (run.length > 1) out.push(line(run));
        run = [];
      }
    }
    return out;
  };
  const grid: string[] = [];
  // The equator, the tropics and the circle at 60°; meridians every 30°.
  for (const lat of [-60, -30, 0, 30, 60]) grid.push(...traced(Array.from({ length: 121 }, (_, i) => project(-180 + i * 3, lat))));
  for (let lon = -75; lon <= 105; lon += 30) grid.push(...traced(Array.from({ length: 61 }, (_, i) => project(lon, -90 + i * 3))));
  return {
    strokes: [
      ...grid.map((d) => ({ d, weight: 0.55, faint: true })),
      ...EARTH_COASTS.map((d) => ({ d, weight: 1 })),
      { d: circle(C, CY, R), weight: 1.5 },
    ],
    fills: [],
  };
}

// ── La cupola del Duomo di Firenze ──────────────────────────────────────────

function duomo(): Picture {
  return {
    strokes: [
      // The roof of the church under it, and the base of the drum.
      { d: 'M14 84L86 84', weight: 1.4 },
      { d: 'M20 84L20 79L80 79L80 84', weight: 1 },
      // The octagonal drum: three of its eight faces, each with its round window.
      { d: 'M24 79L24 63L76 63L76 79', weight: 1.3 },
      { d: 'M35 79L35 63M65 79L65 63', weight: 1 },
      { d: 'M24 66L76 66', weight: 0.7, faint: true },
      { d: circle(50, 72.5, 4.2), weight: 1 },
      { d: circle(50, 72.5, 2.6), weight: 0.6, faint: true },
      { d: ellipse(29.5, 72.5, 2.1, 3.9), weight: 0.9 },
      { d: ellipse(70.5, 72.5, 2.1, 3.9), weight: 0.9 },
      // The dome, pointed («a sesto acuto»), and the ribs of white marble at its corners.
      { d: 'M25 61C25 42 33 28 44 21M75 61C75 42 67 28 56 21', weight: 1.5 },
      { d: 'M24.5 61L75.5 61', weight: 1 },
      { d: 'M36 61C37 44 40.5 31 47 21.5M64 61C63 44 59.5 31 53 21.5', weight: 1.5 },
      // The courses of tiles, following the curve of the dome.
      { d: 'M25.3 54Q50 56.8 74.7 54M27 45.3Q50 47.8 73 45.3M31.4 34.5Q50 36.5 68.6 34.5', weight: 0.6, faint: true },
      // The lantern on top: its columns, its buttresses, its cone and the golden ball.
      { d: 'M42.5 21L57.5 21', weight: 1.2 },
      { d: 'M45 21L45 12.5M50 21L50 12.5M55 21L55 12.5M44 12.5L56 12.5', weight: 0.9 },
      { d: 'M41.5 21Q42.5 15.5 45 14.5M58.5 21Q57.5 15.5 55 14.5', weight: 0.9 },
      { d: 'M45 12.5L50 6L55 12.5', weight: 1 },
    ],
    fills: [circle(50, 4.6, 1.7)],
  };
}

// ── Un albero ───────────────────────────────────────────────────────────────

function tree(): Picture {
  // A seed chosen among the first 300 for a crown that is balanced and open.
  const random = seeded(36);
  const strokes: Stroke[] = [];
  const fills: string[] = [];
  const BASE: Point = [50, 84];
  const branch = (from: Point, angle: number, length: number, depth: number, weight: number): void => {
    const to: Point = [from[0] + Math.sin(angle) * length, from[1] - Math.cos(angle) * length];
    // A branch is never quite straight.
    const bend = (random() - 0.5) * length * 0.3;
    const mid: Point = [(from[0] + to[0]) / 2 + Math.cos(angle) * bend, (from[1] + to[1]) / 2 + Math.sin(angle) * bend];
    strokes.push({ d: `M${at(from)}Q${at(mid)} ${at(to)}`, weight });
    if (depth === 0) {
      fills.push(circle(to[0], to[1], 1));
      return;
    }
    const count = depth >= 3 && random() < 0.35 ? 3 : 2;
    for (let i = 0; i < count; i++) {
      const side = count === 2 ? (i === 0 ? -1 : 1) : i - 1;
      const turn = side * (0.36 + 0.24 * random()) + (random() - 0.5) * 0.2;
      // Branches lean back towards the sky, so the crown grows round and not flat.
      const lean = -angle * 0.18;
      branch(to, angle + turn + lean, length * (0.68 + 0.12 * random()), depth - 1, Math.max(0.55, weight * 0.7));
    }
  };
  branch(BASE, 0, 19, 7, 3.4);
  return {
    strokes: [
      ...strokes,
      // The ground, and the roots under it.
      { d: 'M20 84Q50 82.6 80 84', weight: 1.1 },
      { d: 'M50 84Q46 88.5 38 91M50 84Q55 89 63 90.5M50 84Q50.5 89 48 94', weight: 1.1, faint: true },
    ],
    fills,
  };
}

// ── La doppia elica del DNA ─────────────────────────────────────────────────

function dna(): Picture {
  const CENTRE: Point = [50, 50];
  const tilt = 28 * RAD;
  const length = 86;
  const turns = 2.4;
  const pitch = length / turns;
  const radius = 11;
  // The second strand runs a little more than a third of a turn behind the first: the
  // narrow gap between them is the minor groove, the wide one the major groove.
  const offset = 0.38 * Math.PI * 2;
  const axis: Point = [Math.sin(tilt), -Math.cos(tilt)];
  const across: Point = [Math.cos(tilt), Math.sin(tilt)];
  /**
   * A point of a strand at height `s` along the axis: right-handed (x = r cos θ, depth =
   * −r sin θ, height = cθ), so the strands in front climb from lower left to upper right.
   */
  const strand = (s: number, phase: number): { p: Point; front: boolean } => {
    const theta = (s / pitch) * Math.PI * 2 + phase;
    const x = radius * Math.cos(theta);
    return {
      p: [CENTRE[0] + s * axis[0] + x * across[0], CENTRE[1] + s * axis[1] + x * across[1]],
      front: -Math.sin(theta) > 0,
    };
  };
  const strokes: Stroke[] = [];
  // Base pairs: ten a turn, joining the two strands.
  for (let s = -length / 2 + pitch / 20; s < length / 2; s += pitch / 10) {
    strokes.push({ d: line([strand(s, 0).p, strand(s, offset).p]), weight: 0.75, faint: true });
  }
  // Each strand in runs: the half behind thin and faint, the half in front strong.
  for (const phase of [0, offset]) {
    let run: Point[] = [];
    let front = strand(-length / 2, phase).front;
    const flush = (): void => {
      if (run.length > 1) strokes.push(front ? { d: line(run), weight: 1.9 } : { d: line(run), weight: 1, faint: true });
    };
    for (let s = -length / 2; s <= length / 2 + 1e-9; s += 0.5) {
      const point = strand(s, phase);
      if (point.front !== front) {
        run.push(point.p);
        flush();
        run = [point.p];
        front = point.front;
      } else run.push(point.p);
    }
    flush();
  }
  // The strands in front are drawn last, over the base pairs and the strands behind.
  strokes.sort((a, b) => Number(!a.faint) - Number(!b.faint));
  return { strokes, fills: [] };
}

// ── Una mano che saluta ─────────────────────────────────────────────────────

function hand(): Picture {
  /** A finger from the middle of its base: its outline, from the left side round the tip. */
  const finger = (base: Point, angle: number, length: number, width: number): { left: Point; tipLeft: Point; tipRight: Point; right: Point; r: number } => {
    const d: Point = [Math.sin(angle * RAD), -Math.cos(angle * RAD)];
    const n: Point = [d[1], -d[0]];
    const h = width / 2;
    const tip: Point = [base[0] + d[0] * (length - h), base[1] + d[1] * (length - h)];
    return {
      left: [base[0] + n[0] * h, base[1] + n[1] * h],
      tipLeft: [tip[0] + n[0] * h, tip[1] + n[1] * h],
      tipRight: [tip[0] - n[0] * h, tip[1] - n[1] * h],
      right: [base[0] - n[0] * h, base[1] - n[1] * h],
      r: h,
    };
  };
  // Seen from the palm: the thumb on the left, then index, middle, ring and little finger.
  const thumb = finger([33.2, 67.5], -50, 22.5, 10.2);
  const fingers = [
    finger([36.6, 50], -8, 29, 9.2),
    finger([46, 47.5], -1.5, 33, 9.6),
    finger([55.3, 48.8], 5, 30.5, 9.2),
    finger([63.8, 53], 12, 23, 8.2),
  ];
  const turn = (p: Point): Point => rotate(p, -13 * RAD, [50, 70]);
  const arc = (r: number, to: Point): string => `A${f(r)} ${f(r)} 0 0 1 ${at(turn(to))}`;
  let d = `M${at(turn([38.5, 93]))}L${at(turn([34.5, 80]))}`;
  d += `L${at(turn(thumb.left))}L${at(turn(thumb.tipLeft))}${arc(thumb.r, thumb.tipRight)}L${at(turn(thumb.right))}`;
  fingers.forEach((g, i) => {
    if (i === 0) d += `Q${at(turn([31.2, 54]))} ${at(turn(g.left))}`;
    else {
      const prev = fingers[i - 1];
      if (prev) {
        // The valley between two fingers, a little lower than their sides.
        const valley: Point = [(prev.right[0] + g.left[0]) / 2, Math.max(prev.right[1], g.left[1]) + 1.6];
        d += `Q${at(turn(valley))} ${at(turn(g.left))}`;
      }
    }
    d += `L${at(turn(g.tipLeft))}${arc(g.r, g.tipRight)}L${at(turn(g.right))}`;
  });
  d += `Q${at(turn([69, 63]))} ${at(turn([66.5, 74]))}L${at(turn([61.5, 93]))}`;
  // Two lines of the palm, and the arcs of the wave around the wrist.
  const palm = [`M${at(turn([65, 61]))}Q${at(turn([53, 57.5]))} ${at(turn([40, 59.5]))}`, `M${at(turn([42, 62]))}Q${at(turn([38.5, 74]))} ${at(turn([45.5, 86]))}`];
  const wave = (r: number, from: number, to: number): string => {
    const p = (a: number): Point => [50 + r * Math.sin(a * RAD), 92 - r * Math.cos(a * RAD)];
    return `M${at(p(from))}A${f(r)} ${f(r)} 0 0 1 ${at(p(to))}`;
  };
  return {
    strokes: [
      { d, weight: 1.5 },
      ...palm.map((p) => ({ d: p, weight: 0.7, faint: true })),
      { d: wave(54, 30, 44), weight: 1.1 },
      { d: wave(60, 31, 41), weight: 1.1 },
    ],
    fills: [],
  };
}

// ── Una stella ──────────────────────────────────────────────────────────────

/**
 * A star as the James Webb telescope sees it: six long spikes of light and two short ones,
 * made by the edges of its hexagonal mirrors and by the struts that hold the small one.
 */
function star(): Picture {
  const C: Point = [50, 50];
  /** A spike of light: a little wider by the star, a thread at its tip. */
  const spike = (angle: number, length: number, width: number): string => {
    const d: Point = [Math.sin(angle * RAD), -Math.cos(angle * RAD)];
    const n: Point = [d[1], -d[0]];
    const p = (r: number, side: number): Point => [C[0] + d[0] * r + n[0] * side, C[1] + d[1] * r + n[1] * side];
    return line([p(length, 0), p(10, width), p(3, 0), p(10, -width)], true);
  };
  return {
    strokes: [
      { d: circle(50, 50, 12.5), weight: 0.6, faint: true },
      { d: circle(50, 50, 18), weight: 0.45, faint: true },
    ],
    fills: [circle(50, 50, 7.5), ...[0, 60, 120, 180, 240, 300].map((a) => spike(a, 46, 1.6)), ...[90, 270].map((a) => spike(a, 21, 1.1))],
  };
}

export const PICTURES: Readonly<Record<PictureId, Picture>> = {
  terra: earth(),
  duomo: duomo(),
  albero: tree(),
  dna: dna(),
  mano: hand(),
  stella: star(),
};

const SVG = 'http://www.w3.org/2000/svg';

/**
 * The picture as an inline SVG, decorative (its name is written next to it). Lines take
 * `currentColor`; their width is `--picture-line` (CSS pixels) times their weight.
 */
export function pictureSvg(id: PictureId, className = 'picture'): SVGSVGElement {
  const picture = PICTURES[id];
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.classList.add(className);
  for (const stroke of picture.strokes) {
    const path = document.createElementNS(SVG, 'path');
    path.setAttribute('d', stroke.d);
    path.setAttribute('class', stroke.faint ? 'picture__line picture__line--faint' : 'picture__line');
    path.style.setProperty('--weight', String(stroke.weight));
    svg.append(path);
  }
  for (const fill of picture.fills) {
    const path = document.createElementNS(SVG, 'path');
    path.setAttribute('d', fill);
    path.setAttribute('class', 'picture__fill');
    svg.append(path);
  }
  return svg;
}
