/**
 * `oltre`: past the edge of the observable universe.
 *
 * The universe has shrunk to a point (the level of `universo` does that, and the warm dot
 * stays on it). There is nothing left to measure: in the deepest black, digits surface and
 * dissolve. They are not scattered at random on the screen: they live in a space that the
 * zoom keeps crossing, so that moving away they sink towards the point, each one smaller
 * and smaller, while new ones come in from the edges. The journey goes on, among numbers.
 *
 * One period of the field is `PERIOD` decades of zoom: a digit that leaves at the centre
 * comes back at the edge as another digit, somewhere else.
 */
import { STOPS } from '../content/levels.ts';
import { nodeById } from '../engine/journey.ts';
import type { LevelDef, LevelFactory, LevelFrame } from '../engine/level.ts';
import { typeset } from '../ui/rich-text.ts';
import { CanvasLevel, DISPLAY_FONT, TAU, hash, ramp } from './canvas-level.ts';

/** Decades of radius between the centre and the edge of the field. */
const PERIOD = 1.3;
/** How much of the zoom of the camera the digits follow: less than all, it is a calm place. */
const ZOOM = 0.45;
/** Standing still, the digits keep sinking very slowly (decades of radius a second). */
const DRIFT = 0.011;
/** Height of a digit as a share of its distance from the point: far digits are small. */
const SIZE = 0.17;
const COLOR = '#b9c6f7';
const COLOR_BRIGHT = '#eef1ff';
/** Each digit a good part of a turn away from the next one in depth: they do not pile up. */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/** What the point is: the title of the stop before this one. */
const UNIVERSE = STOPS.find((stop) => stop.id === 'universo')?.title ?? '';

class Beyond extends CanvasLevel {
  /** Position of the stop on the journey axis. */
  private readonly at: number;
  /** Next to the point: what it is, now that «Tu sei qui» has gone quiet. */
  private readonly caption = document.createElement('span');

  constructor(def: LevelDef) {
    super(def);
    this.at = nodeById(def.id)?.u ?? def.range[1];
    this.caption.className = 'beyond__caption';
    this.caption.textContent = typeset(UNIVERSE);
    this.dom.append(this.caption);
  }

  protected paint(g: CanvasRenderingContext2D, frame: LevelFrame, width: number, height: number, ratio: number): void {
    const { free } = frame;
    const cx = free.x + free.width / 2;
    const cy = free.y + free.height / 2;
    // Where the free area ends against the interface (not against the edge of the screen)
    // the digits fade before they get there: nothing drifts behind the counter or the caption.
    const bounded = { left: free.x > 4, top: free.y > 4, right: free.x + free.width < width - 4, bottom: free.y + free.height < height - 4 };
    // The part of the stage where digits can be seen: the field reaches a little past its
    // farthest corner, and has as many digits as that room can hold.
    const left = bounded.left ? free.x : 0;
    const top = bounded.top ? free.y : 0;
    const right = bounded.right ? free.x + free.width : width;
    const bottom = bounded.bottom ? free.y + free.height : height;
    const outer = 1.12 * Math.hypot(Math.max(cx - left, right - cx), Math.max(cy - top, bottom - cy));
    const count = Math.round(Math.min(110, Math.max(44, ((right - left) * (bottom - top)) / 7000)));
    const drift = this.ctx?.reducedMotion ? 0 : DRIFT;
    const zoom = ZOOM * frame.e + drift * frame.time;

    g.font = `380 100px ${DISPLAY_FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (let i = 0; i < count; i++) {
      // Where the digit is between the edge (PERIOD) and the centre (0), and which one it is
      // along the endless line of digits: it comes back from the edge as another.
      const depth = (i + hash(i, 1)) * (PERIOD / count) - zoom;
      const turn = Math.floor(depth / PERIOD);
      const level = depth - turn * PERIOD;
      const which = i + turn * count;
      const r = outer * 10 ** (level - PERIOD);
      const angle = GOLDEN_ANGLE * which + 0.5 * hash(which, 2);
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle) * 0.92;
      const size = r * SIZE * (0.55 + 0.9 * hash(which, 3));
      if (size < 5 || x < -size || x > width + size || y < -size || y > height + size) continue;

      // It dissolves before reaching the point, and is still faint when it comes in, large and near.
      const along = level / PERIOD;
      const envelope = ramp(0.2, 0.42, along) * (1 - 0.72 * ramp(0.62, 1, along));
      // Each digit surfaces and dissolves at its own slow pace.
      const pace = 7 + 8 * hash(which, 4);
      const breath = 0.5 + 0.5 * Math.sin(TAU * (frame.time / pace + hash(which, 5)));
      const reach = 24 + size * 0.6;
      const inside =
        (bounded.left ? ramp(0, reach, x - free.x) : 1) *
        (bounded.right ? ramp(0, reach, free.x + free.width - x) : 1) *
        (bounded.top ? ramp(0, reach, y - free.y) : 1) *
        (bounded.bottom ? ramp(0, reach, free.y + free.height - y) : 1);
      // Nothing under the words next to the point.
      const underCaption = x > cx - size && x < cx + 190 + size / 2 && Math.abs(y - cy) < 12 + size / 2;
      const alpha = underCaption ? 0 : envelope * inside * (0.16 + 0.84 * breath * breath) * 0.66;
      if (alpha < 0.012) continue;

      const k = (size / 100) * ratio;
      g.setTransform(k, 0, 0, k, x * ratio, y * ratio);
      g.globalAlpha = alpha;
      g.fillStyle = hash(which, 6) > 0.8 ? COLOR_BRIGHT : COLOR;
      g.fillText(String(Math.floor(10 * hash(which, 8))), 0, 0);
    }

    const shown = ramp(this.at - 0.8, this.at - 0.3, frame.u) * (1 - ramp(this.at + 0.3, this.at + 0.6, frame.u));
    this.caption.style.opacity = shown.toFixed(3);
    this.caption.style.transform = `translate3d(${(cx + 24).toFixed(1)}px, ${cy.toFixed(1)}px, 0) translateY(-50%)`;
  }
}

const beyond: LevelFactory = (def) => new Beyond(def);
export default beyond;
