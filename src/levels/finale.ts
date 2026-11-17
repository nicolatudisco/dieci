/**
 * The scene of the finale: «Più grande di tutto questo».
 *
 * It accompanies the words (ui/finale.ts) and never takes their place. Both follow the one
 * timeline of the finale (finale-script.ts), so each thing happens with its line:
 *
 * 1. The warm dot alone in the dark, as on the first screen of the site (the light of the
 *    googolplex has just gathered into it: see zeros.ts).
 * 2. First bridge sentence: thin circles open around the dot, one for each power of ten she
 *    crossed, each with its 10ⁿ. The whole journey at a glance, with her in the middle.
 * 3. Second bridge sentence («non si misura in metri, e non si può contare»): the numbers
 *    slip off the circles, the way «metri» slipped off the counter.
 * 4. «In quel pallino ci sei te»: a pulse runs down the circles onto the dot, and the lens
 *    of the site opens on it. Inside there is her, on the doorstep, looking up.
 * 5. The second stanza: stars come out, more and more (things to discover).
 * 6. The line in brackets: a shooting star passes just above it.
 * 7. The last line: a wave of warm light leaves the dot, lights the circles one by one,
 *    goes past the last one and off the screen. Larger than everything: it is the answer
 *    to the first bridge sentence. The circles stay golden.
 *
 * With time frozen the picture is the last one. With reduced motion nothing runs: the
 * circles and the lights fade in, the shooting star is a still streak that comes and goes.
 */
import { LABELS } from '../content/labels.ts';
import { E_MAX } from '../engine/journey.ts';
import type { LensSpec, LevelFrame, LevelFactory } from '../engine/level.ts';
import { finaleTimeline } from '../finale-script.ts';
import { CanvasLevel, DISPLAY_FONT, TAU, hash, ramp } from './canvas-level.ts';
import { Doorstep } from './doorstep.ts';

/** One circle for each power of ten crossed, from 10¹ to 10²⁷. */
const CIRCLES = Math.round(E_MAX);
type Rgb = readonly [number, number, number];
const COOL: Rgb = [185, 198, 247];
const WARM: Rgb = [255, 210, 122];
const STAR = '#dfe6ff';

/** Seconds between one circle and the next when they open, and the time each takes. */
const OPEN_STEP = 0.085;
const OPEN_TIME = 0.95;
/** Seconds the wave of light takes to leave the screen. */
const WAVE_TIME = 3.4;
/** Seconds the shooting star takes to cross. */
const STREAK_TIME = 1.15;

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

function mix(from: Rgb, to: Rgb, t: number, alpha: number): string {
  const c = from.map((v, i) => Math.round(v + ((to[i] ?? v) - v) * clamp01(t)));
  return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${Math.max(0, Math.min(1, alpha)).toFixed(3)})`;
}

interface Box {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/** Where an element of the words is on the screen, if it is there. */
function boxOf(selector: string): Box | null {
  const box = document.querySelector(selector)?.getBoundingClientRect();
  return box && box.width > 0 ? box : null;
}

/** Where the lines of text of some elements are on the screen: the ink, not their boxes. */
function linesOf(selector: string): Box[] {
  const lines: Box[] = [];
  for (const element of document.querySelectorAll(selector)) {
    const range = document.createRange();
    range.selectNodeContents(element);
    for (const box of range.getClientRects()) if (box.width > 0) lines.push(box);
  }
  return lines;
}

/** The 10ⁿ of a circle this frame: where it is written, how much of it is there, how far it has slipped. */
interface CircleNumber {
  readonly angle: number;
  readonly alpha: number;
  readonly slip: number;
  readonly wide: number;
}

class FinaleScene extends CanvasLevel {
  private readonly timeline = finaleTimeline;
  /** What the lens shows: her on the doorstep, with the warm dot on her chest. */
  private readonly doorstep = new Doorstep({ dot: true });
  readonly targetScenes = [this.doorstep.scene];
  /** Where the 10ⁿ of each circle is written (an angle), chosen once for each layout. */
  private spots: (number | null)[] = [];
  private spotsKey = '';

  protected paint(g: CanvasRenderingContext2D, frame: LevelFrame, width: number, height: number): void {
    const { t, script } = this.timeline;
    const { cues } = script;
    const still = this.ctx?.reducedMotion ?? false;
    const time = still ? 0 : frame.time;
    // Everything is centred on the warm dot.
    const cx = frame.free.x + frame.free.width / 2;
    const cy = frame.free.y + frame.free.height / 2;
    const reachX = Math.max(cx, width - cx);
    const reachY = Math.max(cy, height - cy);
    const far = Math.hypot(reachX, reachY);
    // The last circle touches the farthest edge of the screen: the circles are all of it.
    const outer = Math.max(reachX, reachY) - 14;
    const first = Math.min(34, Math.max(18, outer * 0.05));
    const gap = (outer - first) / (CIRCLES - 1);
    const radiusOf = (n: number): number => first + (n - 1) * gap;

    // ── The wave of the last line, and what it leaves behind.
    const sinceWave = t - cues.wave - 0.35;
    const run = clamp01(sinceWave / WAVE_TIME);
    const front = still ? -1 : 1.3 * far * (run * run * (3 - 2 * run));
    const golden = still ? ramp(0.2, 2.6, sinceWave) : ramp(0.5, WAVE_TIME, sinceWave);
    const breath = 1 + 0.08 * Math.sin(time * 0.6);

    // The dot is never alone in the dark without a little light of its own.
    g.globalCompositeOperation = 'lighter';
    const near = g.createRadialGradient(cx, cy, 0, cx, cy, 120);
    near.addColorStop(0, `rgba(255, 190, 100, ${(0.13 * ramp(0, 1.6, t) * breath).toFixed(3)})`);
    near.addColorStop(1, 'rgba(255, 190, 100, 0)');
    g.fillStyle = near;
    g.fillRect(cx - 120, cy - 120, 240, 240);
    if (golden > 0.01) {
      const glow = g.createRadialGradient(cx, cy, 0, cx, cy, outer * 0.8);
      glow.addColorStop(0, `rgba(255, 196, 110, ${(0.2 * golden * breath).toFixed(3)})`);
      glow.addColorStop(0.45, `rgba(255, 180, 90, ${(0.07 * golden * breath).toFixed(3)})`);
      glow.addColorStop(1, 'rgba(255, 170, 70, 0)');
      g.fillStyle = glow;
      g.fillRect(0, 0, width, height);
    }
    g.globalCompositeOperation = 'source-over';

    this.stars(g, frame, width, height, cx, cy, time);

    // ── The circles.
    const dimmed = 1 - 0.3 * ramp(script.bridgeOut, script.bridgeOut + 2, t);
    // «In quel pallino»: a pulse runs from the last circle down onto the dot.
    const sinceDot = t - cues.dot;
    const pulse = sinceDot > 0 && sinceDot < 1.9 && !still ? outer * (1 - clamp01(sinceDot / 1.5)) : -1;
    const size = Math.min(16, Math.max(12.5, Math.min(width, height) / 52));
    const numbers = t < script.bridgeOut + 1.2 ? this.numbers(g, t, size, width, height, cx, cy, radiusOf) : [];
    for (let n = 1; n <= CIRCLES; n++) {
      const open = clamp01((t - cues.circles - OPEN_STEP * n) / OPEN_TIME);
      if (open <= 0) continue;
      const eased = still ? 1 : 1 - (1 - open) ** 3;
      const rest = radiusOf(n);
      const r = rest * (0.55 + 0.45 * eased);
      const depth = n / CIRCLES;
      const towards = pulse >= 0 ? Math.exp(-(((rest - pulse) / (gap * 2.2)) ** 2)) * (1 - ramp(1.5, 1.9, sinceDot)) : 0;
      // The wave lights each circle as it passes, and leaves it golden.
      const passed = front >= 0 ? front - rest : -1;
      const flash = passed > 0 ? Math.exp(-passed / 110) : 0;
      const warm = still ? golden : passed > 0 ? 1 : 0;
      const cool = (0.42 - 0.2 * depth) * dimmed;
      const gold = (0.5 - 0.2 * depth) * breath;
      const alpha = open * (cool + (gold - cool) * warm + 0.5 * towards + 0.5 * flash);
      g.strokeStyle = mix(COOL, WARM, Math.max(warm, towards), alpha);
      g.lineWidth = 1 + 1.2 * flash + 0.6 * towards;
      g.beginPath();
      // The circle breaks under its number, and closes again when the number lets go.
      const number = numbers[n];
      const breach = number ? ((number.wide / 2 + 6) / r) * Math.min(1, number.alpha * 1.6) * (1 - number.slip) : 0;
      if (number && breach > 0.004) g.arc(cx, cy, r, number.angle + breach, number.angle - breach + TAU);
      else g.arc(cx, cy, r, 0, TAU);
      g.stroke();
    }
    this.writeNumbers(g, numbers, size, cx, cy, radiusOf, still);

    // ── The front of the wave: a thin bright edge, and the light it trails behind.
    if (front > 0 && run < 1) {
      const trail = Math.min(front, 190);
      const wave = g.createRadialGradient(cx, cy, front - trail, cx, cy, front + 16);
      const strength = 1 - ramp(0.82, 1, run);
      wave.addColorStop(0, 'rgba(255, 190, 100, 0)');
      wave.addColorStop(0.7, `rgba(255, 204, 130, ${(0.14 * strength).toFixed(3)})`);
      wave.addColorStop(0.9, `rgba(255, 236, 190, ${(0.5 * strength).toFixed(3)})`);
      wave.addColorStop(1, 'rgba(255, 190, 100, 0)');
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = wave;
      g.fillRect(0, 0, width, height);
      g.globalCompositeOperation = 'source-over';
    }

    this.shootingStar(g, t - cues.aside - 0.45, width, height, still);

    // Nothing of this scene is drawn over the glass of the lens (the interface draws its edge).
    const glass = boxOf('.lenses .lens__ring');
    const open = ramp(0.9, 2.4, t - cues.dot);
    if (glass && open > 0.01) {
      g.globalCompositeOperation = 'destination-out';
      g.globalAlpha = open;
      g.beginPath();
      g.arc((glass.left + glass.right) / 2, (glass.top + glass.bottom) / 2, (glass.right - glass.left) / 2 - 0.5, 0, TAU);
      g.fill();
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    }
  }

  /** The 10ⁿ of each circle: where each one is written, and how far it has slipped away. */
  private numbers(
    g: CanvasRenderingContext2D,
    t: number,
    size: number,
    width: number,
    height: number,
    cx: number,
    cy: number,
    radiusOf: (n: number) => number,
  ): (CircleNumber | null)[] {
    const { cues, bridgeOut } = this.timeline.script;
    // Not on the bridge sentences: they are being read. Only their lines of text count.
    const words = linesOf('.finale__bridge');
    const key = [width, height, cx, cy, ...words.flatMap((box) => [box.left, box.top, box.right, box.bottom])].map((v) => Math.round(v)).join();
    if (key !== this.spotsKey) {
      this.spotsKey = key;
      const taken: { x: number; y: number }[] = [];
      this.spots = Array.from({ length: CIRCLES + 1 }, (_, n) => {
        if (n === 0) return null;
        const r = radiusOf(n);
        for (let k = 0; k < 60; k++) {
          const angle = TAU * ((n * 0.381966 + k * 0.0917) % 1);
          const x = cx + r * Math.cos(angle);
          const y = cy + r * Math.sin(angle);
          if (x < 26 || x > width - 26 || y < 18 || y > height - 18) continue;
          if (words.some((box) => x > box.left - 30 && x < box.right + 30 && y > box.top - 16 && y < box.bottom + 16)) continue;
          if (taken.some((spot) => Math.abs(spot.x - x) < 46 && Math.abs(spot.y - y) < 22)) continue;
          taken.push({ x, y });
          return angle;
        }
        return null;
      });
    }

    g.font = `500 ${size.toFixed(1)}px ${DISPLAY_FONT}`;
    const ten = g.measureText('10').width;
    g.font = `500 ${(size * 0.66).toFixed(1)}px ${DISPLAY_FONT}`;
    const leaving = 1 - ramp(bridgeOut, bridgeOut + 1, t);
    return this.spots.map((angle, n) => {
      if (angle === null) return null;
      const open = clamp01((t - cues.circles - OPEN_STEP * n - 0.35) / 0.8);
      // They let go one after the other, the largest first.
      const slip = clamp01((t - cues.numbersAway - 0.6 - 0.05 * (CIRCLES - n)) / 0.95);
      const alpha = open * (1 - slip) * leaving;
      return alpha < 0.01 ? null : { angle, alpha, slip, wide: ten + g.measureText(String(n)).width + 1 };
    });
  }

  private writeNumbers(
    g: CanvasRenderingContext2D,
    numbers: readonly (CircleNumber | null)[],
    size: number,
    cx: number,
    cy: number,
    radiusOf: (n: number) => number,
    still: boolean,
  ): void {
    const big = `500 ${size.toFixed(1)}px ${DISPLAY_FONT}`;
    const small = `500 ${(size * 0.66).toFixed(1)}px ${DISPLAY_FONT}`;
    g.textAlign = 'left';
    g.textBaseline = 'middle';
    g.fillStyle = mix(COOL, COOL, 0, 0.92);
    numbers.forEach((number, n) => {
      if (!number) return;
      const { angle, alpha, slip, wide } = number;
      const r = radiusOf(n);
      // A little stumble, then down and away: the same way «metri» left the counter.
      const stumble = still ? 0 : Math.sin(Math.min(slip, 0.4) * 7.5 * Math.PI) * (1 - Math.min(1, slip / 0.4)) * 0.1;
      const fall = still ? 0 : slip * slip;
      g.save();
      g.translate(cx + r * Math.cos(angle) + size * (stumble + 0.9 * fall), cy + r * Math.sin(angle) + size * 1.5 * fall);
      g.rotate(0.38 * fall + stumble);
      g.globalAlpha = alpha;
      g.font = big;
      g.fillText('10', -wide / 2, 0);
      g.font = small;
      g.fillText(String(n), -wide / 2 + (wide - 1 - g.measureText(String(n)).width), -size * 0.36);
      g.restore();
    });
    g.globalAlpha = 1;
  }

  /** Stars that come out one after the other, everywhere: there is no end to what there is to find. */
  private stars(g: CanvasRenderingContext2D, frame: LevelFrame, width: number, height: number, cx: number, cy: number, time: number): void {
    const since = this.timeline.t - this.timeline.script.cues.stars;
    if (since <= 0) return;
    // Fainter behind the words, which must stay easy to read.
    const words = boxOf('.finale__message');
    const count = Math.round(Math.min(560, (width * height) / 2300) * (0.45 + 0.55 * frame.quality));
    g.fillStyle = STAR;
    for (let i = 0; i < count; i++) {
      const born = 0.2 + 8 * hash(i, 3) ** 1.25;
      const shown = clamp01((since - born) / 1.6);
      if (shown <= 0) continue;
      const x = hash(i, 1) * width;
      const y = hash(i, 2) * height;
      if (Math.hypot(x - cx, y - cy) < 44) continue;
      const behind = words && x > words.left - 10 && x < words.right + 10 && y > words.top - 8 && y < words.bottom + 8;
      const twinkle = 0.72 + 0.28 * Math.sin(TAU * (time / (4 + 5 * hash(i, 4)) + hash(i, 5)));
      const bright = hash(i, 6) ** 2.2;
      g.globalAlpha = shown * twinkle * (0.2 + 0.62 * bright) * (behind ? 0.4 : 1);
      const s = 0.9 + 1.3 * bright;
      g.fillRect(x - s / 2, y - s / 2, s, s);
    }
    g.globalAlpha = 1;
  }

  /** A shooting star, just under the line said under one's breath, where nothing is written yet. `since` in seconds. */
  private shootingStar(g: CanvasRenderingContext2D, since: number, width: number, height: number, still: boolean): void {
    const life = still ? 2.6 : STREAK_TIME;
    if (since <= 0 || since >= life) return;
    const line = boxOf('.finale__line--aside');
    // From the right, a little downwards, towards the left: under the line if it is there.
    const y = line ? line.bottom + 10 : height * 0.3;
    const from = { x: Math.min(width + 30, (line?.right ?? width * 0.9) + 110), y };
    const to = { x: Math.max(-30, (line?.left ?? width * 0.2) - 30), y: y + 56 };
    const p = since / life;
    const travelled = still ? 0.62 : 1 - (1 - p) ** 2.2;
    const light = Math.sin(Math.PI * p) ** 0.7;
    const head = { x: from.x + (to.x - from.x) * travelled, y: from.y + (to.y - from.y) * travelled };
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    const tail = Math.min(0.5, travelled) * length * (still ? 1 : 0.5 + 0.5 * light);
    const ux = (from.x - to.x) / length;
    const uy = (from.y - to.y) / length;
    const end = { x: head.x + ux * tail, y: head.y + uy * tail };
    const streak = g.createLinearGradient(head.x, head.y, end.x, end.y);
    streak.addColorStop(0, `rgba(255, 252, 240, ${(0.95 * light).toFixed(3)})`);
    streak.addColorStop(0.25, `rgba(223, 230, 255, ${(0.5 * light).toFixed(3)})`);
    streak.addColorStop(1, 'rgba(223, 230, 255, 0)');
    g.strokeStyle = streak;
    g.lineWidth = 2.4;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(head.x, head.y);
    g.lineTo(end.x, end.y);
    g.stroke();
    const spark = g.createRadialGradient(head.x, head.y, 0, head.x, head.y, 14);
    spark.addColorStop(0, `rgba(255, 252, 240, ${light.toFixed(3)})`);
    spark.addColorStop(0.3, `rgba(240, 244, 255, ${(0.45 * light).toFixed(3)})`);
    spark.addColorStop(1, 'rgba(240, 244, 255, 0)');
    g.fillStyle = spark;
    g.fillRect(head.x - 14, head.y - 14, 28, 28);
  }

  /** The lens of the site, on the warm dot: inside, her on the doorstep. */
  lenses(frame: LevelFrame): readonly LensSpec[] {
    const shown = ramp(0.9, 2.4, this.timeline.t - this.timeline.script.cues.dot);
    if (shown < 0.01) return [];
    this.doorstep.update(1, frame.pixelRatio, frame.time);
    // Beside the dot where the screen is upright (the words are underneath), above it otherwise.
    const upright = frame.free.width > frame.free.height * 1.25;
    return [
      {
        id: 'her',
        at: [0, 0, 0],
        scene: this.doorstep.scene,
        fieldWidth: 1.06,
        centre: [0, -0.16],
        angle: upright ? 38 : 128,
        label: LABELS.youAreHere,
        opacity: shown,
      },
    ];
  }

  override dispose(): void {
    this.doorstep.dispose();
    super.dispose();
  }
}

const finale: LevelFactory = (def) => new FinaleScene(def);
export default finale;
