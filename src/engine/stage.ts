/**
 * The stage: where things are, in metres, in float64, on the CPU only.
 *
 * - The origin is «Tu sei qui»: the starting point on the street. It never moves.
 * - `ANCHORS` are the reference points of the journey. Their DISTANCES are true; their
 *   DIRECTIONS on screen are composition choices (the stage is a montage, not one rigid
 *   physical frame: each level draws its own content around its anchor).
 * - Axes: +x is screen right, +y is screen up, +z points to the camera, which always
 *   looks straight down the -z axis. On the ground, +y is north.
 * - Everything beyond the Earth lives in the plane z = -EARTH_RADIUS, the plane through
 *   the centre of the Earth; the ground is the plane z = 0.
 * - `centreAt(e)` is the centre track: the point the camera looks at, as a function of the
 *   camera exponent. Levels never see these numbers directly: the engine subtracts the
 *   level origin in float64 and hands each level a camera in its own small units.
 */
import { LIGHT_DAY_KM, LIGHT_YEAR_M } from '../content/data.ts';

export type Vec3 = readonly [number, number, number];

/** Astronomical unit in metres (exact, IAU 2012). */
export const AU = 149_597_870_700;
/** Light-year in metres (Julian year). */
export const LY = LIGHT_YEAR_M;
/** Mean radius of the Earth in metres. */
export const EARTH_RADIUS = 6.371e6;
/** Mean distance of the Moon in metres. */
export const MOON_DISTANCE = 3.844e8;

const SPACE_Z = -EARTH_RADIUS;

function polar(radius: number, degrees: number, z = 0): Vec3 {
  const a = (degrees * Math.PI) / 180;
  return [radius * Math.cos(a), radius * Math.sin(a), z];
}

export function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function mix(a: Vec3, b: Vec3, t: number): Vec3 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

const you: Vec3 = [0, 0, 0];
const earth: Vec3 = [0, 0, SPACE_Z];
const sun = add(earth, polar(AU, 25));
// Voyager 1 is one light-day from the Earth on 18 Nov 2026 (data.ts → VOYAGER_1).
const voyager1 = add(earth, polar(LIGHT_DAY_KM * 1000, 12));
// Screen convention from here on: the galactic centre is straight up from the Sun, and
// galactic longitude grows counter-clockwise. The Orion Nebula is at longitude 209°.
const galacticCentre = add(sun, polar(26_000 * LY, 90));
const orionNebula = add(sun, polar(1_344 * LY, 90 + 209));
const andromeda = add(galacticCentre, polar(2.5e6 * LY, 25));
const localGroup = mix(galacticCentre, andromeda, 0.5);
const laniakea = add(earth, polar(230e6 * LY, 200));

/**
 * Named points of the stage, in metres. A level picks one as its local origin.
 * Planets other than the Earth are placed by the levels that draw them.
 */
export const ANCHORS = {
  /** «Tu sei qui»: the starting point, on the ground. */
  you,
  /** Centre of the Earth, straight below the starting point. Also «us» at cosmic scales. */
  earth,
  moon: add(earth, polar(MOON_DISTANCE, 150)),
  sun,
  voyager1,
  orionNebula,
  galacticCentre,
  andromeda,
  /** Midpoint between the Milky Way and Andromeda. */
  localGroup,
  /** Centre of the Laniakea supercluster, towards the Great Attractor. */
  laniakea,
} as const satisfies Record<string, Vec3>;

export type AnchorId = keyof typeof ANCHORS;

interface Keyframe {
  /** Camera exponent at which the view is centred exactly on `at`. */
  readonly e: number;
  readonly at: Vec3;
}

/**
 * The centre track. Between two keyframes the centre moves from one point to the other;
 * two consecutive keyframes on the same point keep it exactly centred in between
 * (the Sun stays in the middle from `sole` to `pianeti-lontani`).
 *
 * A milestone may retune the keyframes of its own stops; neighbours stay continuous
 * because the track is one function shared by every level.
 */
const TRACK: readonly Keyframe[] = [
  { e: -0.35, at: you },
  // partenza: she must fit whole inside the metre, so the frame is centred on her body
  // (the warm dot is on her chest, a little above the middle).
  { e: 0, at: [0, -0.16, 0] },
  { e: 1, at: you },
  { e: 4, at: you },
  // toscana: from Florence to the sea, so the view shifts west.
  { e: 5, at: [-35e3, -5e3, 0] },
  // italia: the middle of the peninsula is south-east of Florence.
  { e: 6.1, at: [100e3, -210e3, 0] },
  // terra: the focus plane moves from the ground to the centre of the globe.
  { e: 7.2, at: earth },
  { e: 9, at: earth },
  { e: 11.6, at: sun },
  { e: 13, at: sun },
  // voyager: off-centre, so that both the Sun and the probe are well inside the frame.
  { e: 13.7, at: mix(sun, voyager1, 0.5) },
  { e: 16.4, at: sun },
  { e: 17.5, at: sun },
  // nebulose: off-centre, so that the Orion Nebula is inside the frame.
  { e: 19.4, at: mix(sun, orionNebula, 0.5) },
  { e: 21.2, at: galacticCentre },
  { e: 22.8, at: localGroup },
  { e: 24.8, at: laniakea },
  { e: 25.6, at: earth },
  { e: 26.94, at: earth },
];

function smoothstep01(x: number): number {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}

/**
 * The point at the centre of the view, in metres, for camera exponent `e`.
 *
 * Between keyframes the weight follows the VIEW WIDTH (not the exponent): the move happens
 * while the destination is coming into view, so «Tu sei qui» drifts gently and never flies
 * off screen. The weight has zero slope at both ends, so the motion of every object on
 * screen is continuous through the stops.
 */
export function centreAt(e: number): Vec3 {
  const first = TRACK[0];
  const last = TRACK[TRACK.length - 1];
  if (!first || !last) return you;
  if (e <= first.e) return first.at;
  for (let i = 0; i < TRACK.length - 1; i++) {
    const a = TRACK[i];
    const b = TRACK[i + 1];
    if (!a || !b || e > b.e) continue;
    if (a.at === b.at) return a.at;
    const x = (10 ** (e - a.e) - 1) / (10 ** (b.e - a.e) - 1);
    // Exactly on the keyframe, return the point itself (no rounding from the blend).
    return x >= 1 ? b.at : mix(a.at, b.at, smoothstep01(x));
  }
  return last.at;
}

/** Where «Tu sei qui» sits relative to the centre of the view, in units of the view width. */
export function youOffsetAt(e: number): readonly [number, number] {
  const c = centreAt(e);
  const w = 10 ** e;
  return [-c[0] / w, -c[1] / w];
}
