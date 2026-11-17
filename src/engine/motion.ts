/**
 * Motion along the journey axis. Every input becomes either «go to that node» or a
 * change of `u`; this class turns them into smooth movement:
 *
 * - travel: an animated trip to a node (▶ ◀, keys, snapping). A quintic curve that starts
 *           from the current velocity, so pressing again mid-trip never jerks.
 * - follow: `u` chases a goal with damping (wheel, trackpad, dragging, pinch).
 * - fling:  inertia after a swipe, with exponential friction.
 * - rest:   standing still. Near a stop, a soft snap brings `u` exactly onto it.
 */
import {
  AT_NODE_EPS,
  FIRST_STOP,
  U_MAX,
  U_START,
  clamp,
  nearestNode,
  neighbour,
  snapTarget,
  travelDuration,
  type JourneyNode,
} from './journey.ts';

export type MotionMode = 'rest' | 'travel' | 'follow' | 'fling';

/** Time constants of the damped follow, in seconds. */
const FOLLOW_TAU_WHEEL = 0.12;
const FOLLOW_TAU_DRAG = 0.035;
/** Friction of the fling, in seconds. */
const FLING_TAU = 0.32;
/** Below this speed (units of u per second) a fling is over. */
const FLING_MIN_SPEED = 0.06;
/** Seconds without input after which a follow settles. */
const SETTLE_DELAY = 0.16;

export class Motion {
  u: number;
  /** Velocity in units of u per second. */
  v = 0;
  mode: MotionMode = 'rest';

  /**
   * The farthest that free movement (wheel, drag, pinch, fling) can reach for now. The
   * finale lowers it onto itself until its message has been said, so that a swipe cannot
   * skip it; `onCeiling` hears every push against it.
   */
  ceiling = U_MAX;
  onCeiling: (() => void) | null = null;

  private goal: number;
  private followTau = FOLLOW_TAU_WHEEL;
  private idle = 0;
  private dragging = false;

  // Travel: u(τ) = c0 + c1 τ + c3 τ³ + c4 τ⁴ + c5 τ⁵, τ = elapsed / duration.
  private c0 = 0;
  private c1 = 0;
  private c3 = 0;
  private c4 = 0;
  private c5 = 0;
  private elapsed = 0;
  private duration = 1;
  private destination: JourneyNode | null = null;

  constructor(u: number) {
    this.u = u;
    this.goal = u;
  }

  /** The node `u` is standing on, if any. */
  get atNode(): JourneyNode | null {
    if (this.mode !== 'rest') return null;
    const node = nearestNode(this.u);
    return Math.abs(node.u - this.u) <= AT_NODE_EPS ? node : null;
  }

  /** The node an animated trip is heading to. */
  get heading(): JourneyNode | null {
    return this.mode === 'travel' ? this.destination : null;
  }

  /** True before «Inizia il viaggio»: free navigation is not available yet. */
  get beforeStart(): boolean {
    return this.u < U_START - AT_NODE_EPS && this.mode === 'rest';
  }

  /** ▶ (1) or ◀ (-1): an animated trip to the next node. Pressing mid-trip goes one stop further. */
  go(dir: 1 | -1): JourneyNode | null {
    const heading = this.heading;
    const node = neighbour(heading ? heading.u : this.u, dir);
    if (!node) return null;
    if (heading) {
      // Never more than one stop beyond the next one: holding ▶ must not skip the journey.
      const next = neighbour(this.u, dir);
      if (next && Math.abs(node.index - next.index) > 1) return heading;
    }
    this.travelTo(node);
    return node;
  }

  travelTo(node: JourneyNode, seconds?: number): void {
    const u0 = this.u;
    const T = seconds ?? travelDuration(node.u - u0);
    // Carry over the current velocity, but never one that would overshoot the trip.
    const v0 = clamp(this.v, -Math.abs(node.u - u0) / T * 3, Math.abs(node.u - u0) / T * 3);
    const d = node.u - u0 - v0 * T;
    this.c0 = u0;
    this.c1 = v0 * T;
    this.c3 = 10 * d + 4 * v0 * T;
    this.c4 = -15 * d - 7 * v0 * T;
    this.c5 = 6 * d + 3 * v0 * T;
    this.elapsed = 0;
    this.duration = T;
    this.destination = node;
    this.mode = 'travel';
  }

  /** Moves instantly (start-up, reduced motion). */
  jumpTo(u: number): void {
    this.u = u;
    this.goal = u;
    this.v = 0;
    this.mode = 'rest';
    this.destination = null;
  }

  /** Wheel, trackpad, pinch: shift the goal; `u` follows with damping. */
  nudge(du: number, tau = FOLLOW_TAU_WHEEL): void {
    if (this.u < U_START) return;
    if (this.mode !== 'follow') this.goal = this.u;
    const top = this.top();
    if (du > 0 && this.goal + du > top && this.onCeiling) this.onCeiling();
    this.goal = clamp(this.goal + du, U_START, top);
    this.followTau = tau;
    this.mode = 'follow';
    this.idle = 0;
  }

  dragStart(): void {
    if (this.u < U_START) return;
    this.dragging = true;
    this.goal = this.u;
    this.v = 0;
    this.mode = 'follow';
    this.idle = 0;
  }

  dragBy(du: number): void {
    if (!this.dragging) return;
    this.nudge(du, FOLLOW_TAU_DRAG);
  }

  /** End of a drag, with the release velocity in units of u per second. */
  dragEnd(velocity: number): void {
    if (!this.dragging) return;
    this.dragging = false;
    if (Math.abs(velocity) < 0.25) {
      this.idle = SETTLE_DELAY;
      return;
    }
    // Where friction alone would stop. If that is inside the capture zone of a stop,
    // glide straight onto it instead of stopping short and being pulled.
    const landing = clamp(this.u + velocity * FLING_TAU, U_START, this.top());
    const node = snapTarget(landing);
    this.v = velocity;
    if (node) {
      const seconds = clamp((Math.abs(node.u - this.u) / Math.abs(velocity)) * 2, 0.45, 1.4);
      this.travelTo(node, seconds);
    } else {
      this.mode = 'fling';
    }
  }

  step(dt: number): void {
    if (dt <= 0) return;
    const before = this.u;

    if (this.mode === 'travel') {
      this.elapsed += dt;
      const t = Math.min(1, this.elapsed / this.duration);
      const t3 = t * t * t;
      this.u = this.c0 + this.c1 * t + this.c3 * t3 + this.c4 * t3 * t + this.c5 * t3 * t * t;
      if (t >= 1 && this.destination) {
        this.u = this.destination.u;
        this.goal = this.u;
        this.mode = 'rest';
      }
    } else if (this.mode === 'follow') {
      this.u += (this.goal - this.u) * (1 - Math.exp(-dt / this.followTau));
      this.idle += dt;
      if (!this.dragging && this.idle >= SETTLE_DELAY && Math.abs(this.goal - this.u) < 0.004) this.settle();
    } else if (this.mode === 'fling') {
      this.u += this.v * dt;
      this.v *= Math.exp(-dt / FLING_TAU);
      const top = this.top();
      if (this.u <= U_START || this.u >= top) {
        this.u = clamp(this.u, U_START, top);
        this.v = 0;
      }
      if (Math.abs(this.v) < FLING_MIN_SPEED) this.settle();
    }

    if (this.mode === 'fling') return;
    this.v = this.mode === 'rest' ? 0 : (this.u - before) / dt;
  }

  /** The ceiling never pulls back a position that is already past it. */
  private top(): number {
    return Math.min(U_MAX, Math.max(this.ceiling, this.u));
  }

  /** End of a free movement: snap softly onto a stop if one is close, otherwise stay. */
  private settle(): void {
    const node = snapTarget(this.u);
    if (node && node.index >= FIRST_STOP.index && Math.abs(node.u - this.u) > 1e-4) {
      this.travelTo(node, 0.45 + 1.4 * Math.abs(node.u - this.u));
      return;
    }
    if (node) this.u = node.u;
    this.goal = this.u;
    this.v = 0;
    this.mode = 'rest';
  }
}
