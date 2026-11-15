/**
 * The journey axis.
 *
 * The whole engine state is one number, `u`, the position along the journey:
 *
 *   apertura           u = -1            a gate: left only through "Inizia il viaggio"
 *   Act I  (space)     u = e, 0..26.94   position and exponent coincide
 *   Act II (number)    u = 29, 31, 33…   fixed steps: the exponents 30, 80, 100, googolplex
 *                                        are never interpolated
 *   finale, epilogo    u = 37, 38.5
 *
 * Everything else (the exponent shown by the counter, the camera, which levels are
 * visible) is derived from `u`. This module is pure: no DOM, no three.js.
 */
import { STOPS } from '../content/levels.ts';
import type { Stop } from '../content/types.ts';

export type NodeKind = 'view' | 'space' | 'number';

export interface JourneyNode {
  /** A stop id from levels.ts, or 'apertura' | 'finale' | 'epilogo'. */
  readonly id: string;
  readonly kind: NodeKind;
  /** Position on the journey axis. */
  readonly u: number;
  readonly index: number;
  /** The content of the stop; null for the three views. */
  readonly stop: Stop | null;
}

/** Views that sit on the journey axis without being stops. */
export const VIEW_IDS = ['apertura', 'finale', 'epilogo'] as const;
/** Views that open on top of the journey and return to the same `u` when closed. */
export const OVERLAY_IDS = ['fonti', 'disco'] as const;
export type OverlayId = (typeof OVERLAY_IDS)[number];

const INTRO_U = -1;
/** Position of the first stop of Act II, and the distance between its stops. */
const ACT2_FIRST_U = 29;
const ACT2_STEP = 2;
const FINALE_GAP = 2;
const EPILOGUE_GAP = 1.5;

/** How far before the first stop the camera starts (in decades): 10^-0.35 m ≈ 45 cm. */
const INTRO_ZOOM = 0.35;
/** How fast the camera keeps pulling back past the observable universe (decades per unit of u). */
const BEYOND_ZOOM = 1.5;

const spaceStops = STOPS.filter((s) => s.kind === 'space');
const numberStops = STOPS.filter((s) => s.kind === 'number');

const lastSpace = spaceStops[spaceStops.length - 1];
if (!lastSpace) throw new Error('levels.ts has no space stops');

/** Exponent range of Act I: log10 of the view width in metres. */
export const E_MIN = 0;
export const E_MAX = lastSpace.exponent;
if (E_MAX >= ACT2_FIRST_U) throw new Error('Act II must start past the last space stop');

function buildNodes(): JourneyNode[] {
  const list: Omit<JourneyNode, 'index'>[] = [];
  list.push({ id: 'apertura', kind: 'view', u: INTRO_U, stop: null });
  for (const stop of spaceStops) list.push({ id: stop.id, kind: 'space', u: stop.exponent, stop });
  let u = ACT2_FIRST_U;
  for (const stop of numberStops) {
    list.push({ id: stop.id, kind: 'number', u, stop });
    u += ACT2_STEP;
  }
  const finaleU = u - ACT2_STEP + FINALE_GAP;
  list.push({ id: 'finale', kind: 'view', u: finaleU, stop: null });
  list.push({ id: 'epilogo', kind: 'view', u: finaleU + EPILOGUE_GAP, stop: null });
  return list.map((node, index) => ({ ...node, index }));
}

/** Every node of the journey, in order. */
export const NODES: readonly JourneyNode[] = buildNodes();

const byId = new Map(NODES.map((n) => [n.id, n]));

function must(id: string): JourneyNode {
  const node = byId.get(id);
  if (!node) throw new Error(`Unknown journey node: ${id}`);
  return node;
}

export const INTRO = must('apertura');
/** The first stop: the journey never goes back past it once it has started. */
export const FIRST_STOP = NODES[1] ?? INTRO;
export const FINALE = must('finale');
export const EPILOGUE = must('epilogo');

export const U_MIN = INTRO.u;
export const U_START = FIRST_STOP.u;
export const U_MAX = EPILOGUE.u;

export function nodeById(id: string): JourneyNode | null {
  return byId.get(id) ?? null;
}

export function isOverlayId(id: string): id is OverlayId {
  return (OVERLAY_IDS as readonly string[]).includes(id);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Clamps a position to the part of the axis that free navigation can reach. */
export function clampU(u: number): number {
  return clamp(u, U_START, U_MAX);
}

/** The exponent of Act I at position `u` (log10 of the view width in metres). */
export function exponentAt(u: number): number {
  return clamp(u, E_MIN, E_MAX);
}

/**
 * The exponent the camera uses. Equal to `u` in Act I. Before the first stop it starts a
 * little closer (the scene opens up to one metre); past the observable universe it keeps
 * growing, so the universe shrinks to a point without the counter counting metres.
 */
export function cameraExponent(u: number): number {
  if (u < E_MIN) return INTRO_ZOOM * Math.max(u, U_MIN);
  if (u <= E_MAX) return u;
  return E_MAX + BEYOND_ZOOM * (u - E_MAX);
}

export interface Segment {
  readonly from: JourneyNode;
  readonly to: JourneyNode;
  /** 0 at `from`, 1 at `to`. */
  readonly t: number;
}

/** The pair of nodes around `u`. At or past the last node, `from === to`. */
export function segmentAt(u: number): Segment {
  const first = NODES[0] ?? INTRO;
  if (u <= first.u) return { from: first, to: first, t: 0 };
  for (let i = 0; i < NODES.length - 1; i++) {
    const from = NODES[i];
    const to = NODES[i + 1];
    if (!from || !to) break;
    if (u < to.u) return { from, to, t: (u - from.u) / (to.u - from.u) };
  }
  return { from: EPILOGUE, to: EPILOGUE, t: 0 };
}

export function nearestNode(u: number): JourneyNode {
  const { from, to, t } = segmentAt(u);
  return t < 0.5 ? from : to;
}

/** The stop (never a view) closest to `u`: its `counterLine` is shown under the counter. */
export function nearestStop(u: number): JourneyNode {
  let best: JourneyNode = FIRST_STOP;
  for (const node of NODES) {
    if (node.stop && Math.abs(node.u - u) < Math.abs(best.u - u)) best = node;
  }
  return best;
}

/** Tolerance for "we are standing on this node". */
export const AT_NODE_EPS = 0.02;

/**
 * The node that ▶ (dir = 1) or ◀ (dir = -1) leads to from position `u`.
 * ◀ never goes back past the first stop; ▶ stops at the epilogue.
 */
export function neighbour(u: number, dir: 1 | -1): JourneyNode | null {
  if (dir === 1) {
    for (const node of NODES) if (node.u > u + AT_NODE_EPS) return node;
    return null;
  }
  for (let i = NODES.length - 1; i >= FIRST_STOP.index; i--) {
    const node = NODES[i];
    if (node && node.u < u - AT_NODE_EPS) return node;
  }
  return null;
}

const SNAP_RADIUS = 0.25;
const SNAP_SHARE = 0.35;

/** Half-width of the capture zone of a node on one side: smaller between close stops. */
export function snapRadius(node: JourneyNode, side: 1 | -1): number {
  const other = NODES[node.index + side];
  if (!other) return SNAP_RADIUS;
  return Math.min(SNAP_RADIUS, SNAP_SHARE * Math.abs(other.u - node.u));
}

/** The node whose capture zone contains `u`, if any. The opening never captures. */
export function snapTarget(u: number): JourneyNode | null {
  const node = nearestNode(u);
  if (node.index < FIRST_STOP.index) return null;
  const side = u >= node.u ? 1 : -1;
  return Math.abs(u - node.u) <= snapRadius(node, side) ? node : null;
}

/**
 * Duration in seconds of an animated trip over `du` units of the axis:
 * 1.5 s for one power of ten, up to 3 s for the long jumps, shorter for small corrections.
 */
export function travelDuration(du: number): number {
  const d = Math.abs(du);
  if (d < 1) return 0.6 + 0.9 * d;
  return clamp(1.5 + 0.9 * (d - 1), 1.5, 3);
}
