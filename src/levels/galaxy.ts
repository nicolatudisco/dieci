/**
 * A procedural galaxy on a square, in one fragment shader (M5). The same function draws the
 * Milky Way (in `nebulose`, `via-lattea` and `andromeda`), Andromeda, the Triangulum Galaxy
 * and the two Magellanic Clouds.
 *
 * - An exponential disc, a bar and a bulge of old cream-white stars (not amber: amber is
 *   kept for «Tu sei qui»), logarithmic spiral arms of young blue-white stars, dark dust on
 *   the inner side of the arms, pink knots where stars are being born.
 * - Detail is limited by the resolution: every octave of noise, the arms and the knots fade
 *   to their mean value before they get finer than a pixel (`fwidth`), so a galaxy never
 *   shimmers, whether it fills the screen or is ten pixels wide.
 * - Drawn with MAX blending, like the halo of the Sun: when two levels draw the same galaxy
 *   in the same place (the Milky Way, from `via-lattea` to `andromeda`), the maximum of two
 *   equal pictures is the same picture, and the hand-over cannot be seen.
 * - When it is small on screen, a halo measured in pixels keeps it visible: it is light,
 *   not size (the same rule as the glare of the Sun).
 *
 * Shapes are in units of the radius of the galaxy; only `radius` is in the units of the level.
 * The arms are logarithmic spirals r = exp(k (θ − s)): along an arm the «spiral phase»
 * s = θ − ln(r) / k is constant. With θ growing counter-clockwise and k > 0 the arms open
 * counter-clockwise outwards: they trail a clockwise rotation, like the Milky Way seen from
 * its north pole (the screen convention of the stage).
 */
import { CustomBlending, MaxEquation, Mesh, PlaneGeometry, ShaderMaterial, Vector3 } from 'three';
import { MILKY_WAY } from '../content/cosmos.ts';
import { mulberry32 } from './placeholder/primitives.ts';

const TAU = Math.PI * 2;

export interface GalaxyLook {
  /** Radius of the disc, in local units. */
  readonly radius: number;
  /** Exponential scale length of the disc, in radii. */
  readonly discScale: number;
  /** Radius and brightness of the bulge. */
  readonly bulge: number;
  readonly bulgeLevel: number;
  /** Half length and half width of the bar, in radii, and its direction (degrees in the plane of the galaxy). 0 = no bar. */
  readonly bar: readonly [number, number, number];
  /** tan(pitch) of the arms. */
  readonly k: number;
  /** Spiral phase of the two major arms (radians); the two minor ones are half-way between. */
  readonly armPhase: number;
  /** Width of an arm in spiral phase (radians), and the radius where the arms begin. */
  readonly armWidth: number;
  readonly armStart: number;
  /** Brightness of major arms, minor arms and spur. */
  readonly armLevel: readonly [number, number, number];
  /** A short arm: its spiral phase, the angle of its middle and its half-extent (radians). */
  readonly spur: readonly [number, number, number];
  /** Clumpiness of the young stars, dust, pink knots, irregularity (0..1 each, roughly). */
  readonly clump: number;
  readonly dust: number;
  readonly knots: number;
  readonly irregular: number;
  /** A ring of young stars and dust (Andromeda): radius, width, brightness. */
  readonly ring: readonly [number, number, number];
  /** No invented knots within `hole[2]` radii of (hole[0], hole[1]): the Sun's neighbourhood. */
  readonly hole: readonly [number, number, number];
  /** cos(inclination): keeps the bulge round on screen when the disc is tilted. */
  readonly cosInclination: number;
  /** Overall brightness. */
  readonly level: number;
  readonly seed: number;
  readonly colors: {
    readonly core: string;
    readonly old: string;
    readonly young: string;
    readonly knot: string;
  };
}

const COLORS = { core: '#ffe2b8', old: '#a9a6b8', young: '#8fb0ff', knot: '#ff6f9c' } as const;

/** The spiral phase of a point (in radii), with the angle unwrapped around `around`. */
export function spiralPhase(x: number, y: number, k: number, around?: number): number {
  let theta = Math.atan2(y, x);
  if (around !== undefined) theta = around + (((theta - around + Math.PI) % TAU) + TAU) % TAU - Math.PI;
  return theta - Math.log(Math.max(Math.hypot(x, y), 1e-6)) / k;
}

/** Distance in spiral phase from the nearest arm of a pattern with period π and the given phase. */
function armDistance(s: number, phase: number): number {
  return ((((s - phase + Math.PI / 2) % Math.PI) + Math.PI) % Math.PI) - Math.PI / 2;
}

const RAD = Math.PI / 180;

/**
 * The Milky Way: 100,000 light-years across, the Sun 26,000 light-years below the centre (on
 * screen), on the Local Arm half-way between Sagittarius–Carina and Perseus; the near end
 * of the bar 27° to the left of the line from the Sun to the centre (see content/cosmos.ts).
 */
export function milkyWayLook(radius: number): GalaxyLook {
  const k = Math.tan(MILKY_WAY.pitchDeg * RAD);
  const sun: readonly [number, number] = [0, -MILKY_WAY.sunFromCentreLy / MILKY_WAY.radiusLy];
  const sunAngle = Math.atan2(sun[1], sun[0]);
  const sunR = Math.hypot(sun[0], sun[1]);
  // Along the line from the centre through the Sun the arms come one after the other, each
  // 2π/4 of spiral phase from the last (a factor e^{kπ/2} ≈ 1.4 in radius): Scutum–Centaurus
  // at 0.31, Sagittarius–Carina 0.43, Perseus 0.61, Norma–Outer 0.85. The Sun at 0.52 is half-way.
  const scutum = 0.31;
  const armPhase = ((sunAngle - Math.log(scutum) / k) % Math.PI + Math.PI) % Math.PI;
  // The Local Arm passes through the Sun, about 20,000 light-years long.
  const spurPhase = sunAngle - Math.log(sunR) / k;
  // The bar: its near end is 27° from the Sun–centre line, towards growing longitude (to the left).
  const barAngle = 90 - MILKY_WAY.barAngleDeg;
  return {
    radius,
    discScale: 0.3,
    bulge: 0.055,
    bulgeLevel: 1.5,
    bar: [MILKY_WAY.barHalfLengthLy / MILKY_WAY.radiusLy, 0.065, barAngle],
    k,
    armPhase,
    armWidth: 0.3,
    armStart: 0.26,
    armLevel: [1, 0.6, 0.8],
    spur: [spurPhase, sunAngle, 0.45],
    clump: 0.75,
    dust: 0.65,
    knots: 1,
    irregular: 0,
    ring: [0, 1, 0],
    hole: [sun[0], sun[1], 0.06],
    cosInclination: 1,
    level: 1,
    seed: 26,
    colors: COLORS,
  };
}

/** Andromeda: larger, with a big bulge, faint tight arms and its bright ring of dust and young stars. */
export function andromedaLook(radius: number): GalaxyLook {
  return {
    radius,
    discScale: 0.27,
    bulge: 0.075,
    bulgeLevel: 2.1,
    bar: [0, 1, 0],
    k: Math.tan(8 * RAD),
    armPhase: 0.4,
    armWidth: 0.35,
    armStart: 0.2,
    armLevel: [0.42, 0.3, 0],
    spur: [0, 0, 0.001],
    clump: 0.7,
    dust: 0.85,
    knots: 0.45,
    irregular: 0,
    // The ring of young stars about 10 kiloparsecs (33,000 light-years) from the centre.
    ring: [0.3, 0.05, 0.85],
    hole: [0, 0, 0],
    cosInclination: Math.cos(77 * RAD),
    level: 1.05,
    seed: 31,
    colors: { core: '#ffe6c4', old: '#b2acbf', young: '#9ab6ff', knot: '#ff7aa2' },
  };
}

/** The Triangulum Galaxy: no bar, a tiny bulge, loose and patchy arms with many knots. */
export function triangulumLook(radius: number): GalaxyLook {
  return {
    radius,
    discScale: 0.32,
    bulge: 0.03,
    bulgeLevel: 1.1,
    bar: [0, 1, 0],
    k: Math.tan(22 * RAD),
    armPhase: 1.2,
    armWidth: 0.42,
    armStart: 0.08,
    armLevel: [0.75, 0.4, 0],
    spur: [0, 0, 0.001],
    clump: 1,
    dust: 0.4,
    knots: 1.3,
    irregular: 0.25,
    ring: [0, 1, 0],
    hole: [0, 0, 0],
    cosInclination: Math.cos(55 * RAD),
    level: 0.95,
    seed: 33,
    colors: COLORS,
  };
}

/** A Magellanic Cloud: an off-centre bar and lumps of young stars, no real arms. */
export function magellanicLook(radius: number, large: boolean): GalaxyLook {
  return {
    radius,
    discScale: large ? 0.38 : 0.42,
    bulge: 0.02,
    bulgeLevel: 0.3,
    bar: large ? [0.38, 0.11, 160] : [0.5, 0.17, 45],
    k: Math.tan(25 * RAD),
    armPhase: 2,
    armWidth: 0.6,
    armStart: 0.3,
    armLevel: large ? [0.5, 0, 0] : [0, 0, 0],
    spur: [0, 0, 0.001],
    clump: 1,
    dust: 0.25,
    knots: large ? 1.4 : 0.9,
    irregular: large ? 0.7 : 1,
    ring: [0, 1, 0],
    hole: [0, 0, 0],
    cosInclination: 1,
    level: 0.95,
    seed: large ? 50 : 62,
    colors: { core: '#e9e6f2', old: '#a6abc4', young: '#9dbcff', knot: '#ff78a4' },
  };
}

/**
 * How bright the arms are at a point (in radii): the same formula as the shader, without the
 * noise. Used to place the stars that sparkle on the arms, and by the tests.
 */
export function armLevel(look: GalaxyLook, x: number, y: number): { major: number; minor: number; spur: number; total: number } {
  const r = Math.hypot(x, y);
  const s = spiralPhase(x, y, look.k);
  const w = look.armWidth;
  const dM = armDistance(s, look.armPhase);
  const dm = armDistance(s, look.armPhase + Math.PI / 2);
  const ramp = smoothstep(look.armStart * 0.7, look.armStart * 1.15, r) * (1 - smoothstep(0.75, 1.15, r));
  const major = Math.exp(-(dM * dM) / (w * w)) * ramp;
  const minor = Math.exp(-(dm * dm) / (w * w * 1.4)) * ramp;
  const [spurPhase, spurAngle, extent] = look.spur;
  const theta = Math.atan2(y, x);
  const dTheta = ((((theta - spurAngle + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
  const ds = spurAngle + dTheta - Math.log(Math.max(r, 1e-6)) / look.k - spurPhase;
  const spur = Math.exp(-(ds * ds) / (w * w * 0.5)) * Math.exp(-(dTheta * dTheta) / (extent * extent));
  const [a, b, c] = look.armLevel;
  return { major, minor, spur, total: a * major + b * minor + c * spur };
}

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// ───────────────────────────────────────────────────────────────────────────── shader

const VERTEX = /* glsl */ `
  varying vec2 vP;
  void main() {
    vP = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;

const FRAGMENT = /* glsl */ `
  uniform float uStrength;
  uniform float uPxPerUnit;   // CSS pixels per local unit
  uniform float uHalf;        // half size of the square, local units
  uniform float uR;           // radius of the galaxy, local units
  uniform float uGlow;        // 0..1: the halo in pixels of a small galaxy
  uniform vec4 uShape;        // disc scale, bulge, bulge level, cos(inclination)
  uniform vec4 uBar;          // half length, half width, cos, sin
  uniform vec4 uArms;         // k, phase, width, start
  uniform vec3 uArmLevel;     // major, minor, spur
  uniform vec3 uSpur;         // phase, angle, extent
  uniform vec4 uTexture;      // clump, dust, knots, irregular
  uniform vec3 uHole;         // x, y, radius
  uniform vec3 uRing;         // radius, width, level
  uniform float uLevel;
  uniform float uSeed;
  uniform vec3 uCore;
  uniform vec3 uOld;
  uniform vec3 uYoung;
  uniform vec3 uKnot;
  varying vec2 vP;

  const float PI = 3.14159265;

  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash12(i);
    float b = hash12(i + vec2(1.0, 0.0));
    float c = hash12(i + vec2(0.0, 1.0));
    float d = hash12(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y) * 2.0 - 1.0;
  }

  // Octaves fade to their mean (0) before they get finer than about two pixels.
  float fbm(vec2 p, float px, float f0, int count) {
    float sum = 0.0;
    float amp = 0.5;
    float f = f0;
    for (int i = 0; i < 7; i++) {
      if (i >= count) break;
      float keep = 1.0 - smoothstep(0.16, 0.42, f * px);
      sum += amp * keep * noise(p * f + vec2(float(i) * 17.31 + uSeed, float(i) * 7.13 - uSeed));
      f *= 2.03;
      amp *= 0.56;
    }
    return sum;
  }

  // Knots of young stars on a grid of cells of size 'cell' (radii): one in each lucky cell.
  float knots(vec2 p, float cell, float px) {
    vec2 g = p / cell;
    vec2 i = floor(g);
    vec2 f = fract(g);
    float best = 0.0;
    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec2 o = vec2(float(x), float(y));
        vec2 id = i + o + uSeed * 3.7;
        float h = hash12(id);
        vec2 c = o + vec2(hash12(id + 3.1), hash12(id + 9.7));
        vec2 d = f - c;
        float size = 0.1 + 0.16 * hash12(id + 5.3);
        best = max(best, step(0.78, h) * (h - 0.4) * exp(-dot(d, d) / (size * size)));
      }
    }
    // Smaller than a couple of pixels, a knot becomes its share of light.
    float sizePx = 0.18 * cell / px;
    return mix(0.012, best, smoothstep(0.7, 2.2, sizePx));
  }

  void main() {
    vec2 p = vP * (uHalf / uR);
    // Radii per device pixel.
    float px = length(fwidth(p)) * 0.7071;
    float r = length(p);

    // Irregular galaxies: the whole shape is pushed around by large lumps.
    vec2 q = p;
    if (uTexture.w > 0.0) {
      q += uTexture.w * 0.22 * vec2(fbm(p * 1.1 + 3.1, px, 1.0, 3), fbm(p * 1.1 - 7.7, px, 1.0, 3));
    }
    float rq = length(q);
    float theta = atan(q.y, q.x);
    float edge = 1.0 - smoothstep(0.75, 1.15, rq);
    float disc = exp(-rq / uShape.x) * edge;

    // Bulge (round on screen even when the disc is tilted) and bar.
    float rb = length(vec2(q.x, q.y * uShape.w));
    float bulge = exp(-pow(rb / uShape.y, 2.0)) + 0.6 * exp(-rb / (uShape.y * 0.3));
    vec2 b = vec2(dot(q, uBar.zw), dot(q, vec2(-uBar.w, uBar.z)));
    float bar = uBar.x > 0.0 ? exp(-pow(abs(b.x) / uBar.x, 3.0)) * exp(-pow(b.y / uBar.y, 2.0)) : 0.0;

    // Arms.
    float k = uArms.x;
    float w = uArms.z;
    float lr = log(max(rq, 1e-4)) / k;
    float s = theta - lr;
    float dM = mod(s - uArms.y + 0.5 * PI, PI) - 0.5 * PI;
    float dm = mod(s - uArms.y, PI) - 0.5 * PI;
    float ramp = smoothstep(uArms.w * 0.7, uArms.w * 1.15, rq) * edge;
    float major = exp(-dM * dM / (w * w));
    float minor = exp(-dm * dm / (w * w * 1.4));
    float dTheta = mod(theta - uSpur.y + PI, 2.0 * PI) - PI;
    float ds = uSpur.y + dTheta - lr - uSpur.x;
    float spur = exp(-ds * ds / (w * w * 0.5)) * exp(-dTheta * dTheta / (uSpur.z * uSpur.z));
    // Thinner than a couple of pixels across, an arm becomes its share of light.
    float armPx = rq * k * w / px;
    float sharp = smoothstep(0.7, 3.0, armPx);
    float mean = w * 0.5642;
    major = mix(mean, major, sharp);
    minor = mix(mean * 1.18, minor, sharp);
    spur = mix(mean * 0.7 * exp(-dTheta * dTheta / (uSpur.z * uSpur.z)), spur, sharp);
    float arms = (uArmLevel.x * major + uArmLevel.y * minor + uArmLevel.z * spur) * ramp;
    float ring = uRing.z * exp(-pow((rq - uRing.x) / uRing.y, 2.0)) * edge;

    // Texture: lumps of young stars, dust lanes on the inner side of the major arms.
    float n1 = fbm(q, px, 3.0, 7);
    float n2 = fbm(q + 11.7, px, 5.0, 6);
    float crest = arms + ring;
    float young = crest * max(0.0, 1.0 + uTexture.x * 1.8 * n1);
    float dl = dM - 0.42 * w;
    float lane = exp(-dl * dl / (w * w * 0.1)) * ramp * sharp * uArmLevel.x;
    float patchy = smoothstep(0.0, 0.35, n2) * crest;
    float dust = uTexture.y * clamp(lane * (0.7 + 0.8 * n2) + 0.5 * patchy, 0.0, 1.0);
    float hole = smoothstep(uHole.z, uHole.z * 1.6 + 1e-4, length(p - uHole.xy));
    float pink = uTexture.z * crest * crest * hole
      * (knots(q, 0.022, px) * 1.2 + knots(q + 0.37, 0.0085, px) * 0.9);

    vec3 col = uCore * (bulge * uShape.z + bar * 0.95)
      + uOld * disc * 0.3 * (1.0 + 0.4 * n1)
      + uYoung * disc * young * 1.45;
    col *= 1.0 - 0.85 * dust;
    col += uKnot * pink * disc * 2.0;
    col = 1.0 - exp(-col * uLevel);

    // The halo of a small galaxy, in pixels: light, not size.
    float dpx = r * uR * uPxPerUnit;
    float glow = uGlow * (0.5 * exp(-dpx / 3.0) + 0.1 / (1.0 + dpx * dpx / 70.0));
    col += mix(uCore, uYoung, 0.35) * glow;

    gl_FragColor = vec4(col * uStrength, 1.0);
    #include <colorspace_fragment>
  }`;

/** Largest reach of the halo of a small galaxy, in CSS pixels. */
const GLOW_PX = 34;

export interface Galaxy {
  readonly mesh: Mesh;
  /**
   * Once a frame: how many CSS pixels a local unit is (for the halo and the size of the
   * square), and how strong the galaxy is (0..1).
   */
  update(pxPerUnit: number, strength: number): void;
}

/**
 * A galaxy in the plane z = 0 of `mesh`, centred on its origin. Tilt it with
 * `mesh.rotation.x` (then `cosInclination` in the look keeps the bulge round), turn it with
 * `mesh.rotation.z` (set `mesh.rotation.order = 'ZXY'` when using both).
 */
export function makeGalaxy(look: GalaxyLook, options: { glow?: boolean } = {}): Galaxy {
  const glowAllowed = options.glow ?? true;
  const bar = look.bar[2] * RAD;
  const color = (hex: string): Vector3 => {
    const n = parseInt(hex.slice(1), 16);
    // sRGB to linear, so that the colour on screen is the one written here.
    const lin = (v: number): number => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return new Vector3(lin((n >> 16) & 255), lin((n >> 8) & 255), lin(n & 255));
  };
  const material = new ShaderMaterial({
    uniforms: {
      uStrength: { value: 1 },
      uPxPerUnit: { value: 1 },
      uHalf: { value: look.radius * 1.25 },
      uR: { value: look.radius },
      uGlow: { value: 0 },
      uShape: { value: [look.discScale, look.bulge, look.bulgeLevel, look.cosInclination] },
      uBar: { value: [look.bar[0], look.bar[1], Math.cos(bar), Math.sin(bar)] },
      uArms: { value: [look.k, look.armPhase, look.armWidth, look.armStart] },
      uArmLevel: { value: [...look.armLevel] },
      uSpur: { value: [...look.spur] },
      uTexture: { value: [look.clump, look.dust, look.knots, look.irregular] },
      uHole: { value: [...look.hole] },
      uRing: { value: [...look.ring] },
      uLevel: { value: look.level },
      uSeed: { value: look.seed },
      uCore: { value: color(look.colors.core) },
      uOld: { value: color(look.colors.old) },
      uYoung: { value: color(look.colors.young) },
      uKnot: { value: color(look.colors.knot) },
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: CustomBlending,
    blendEquation: MaxEquation,
    blendEquationAlpha: MaxEquation,
  });
  const mesh = new Mesh(new PlaneGeometry(2, 2), material);
  mesh.frustumCulled = false;
  const u = material.uniforms;
  const setHalf = (half: number): void => {
    u.uHalf!.value = half;
    mesh.scale.set(half, half, 1);
  };
  setHalf(look.radius * 1.25);
  return {
    mesh,
    update(pxPerUnit, strength) {
      const radiusPx = look.radius * pxPerUnit;
      const glow = glowAllowed ? 1 - smoothstep(10, 46, radiusPx) : 0;
      u.uPxPerUnit!.value = pxPerUnit;
      u.uGlow!.value = glow;
      u.uStrength!.value = strength;
      mesh.visible = strength > 0.002;
      setHalf(Math.max(look.radius * 1.25, glow > 0 ? GLOW_PX / Math.max(pxPerUnit, 1e-12) : 0));
    },
  };
}

/**
 * Stars that sparkle on the arms: points placed where the arms are bright, never within
 * `avoid[2]` radii of (avoid[0], avoid[1]). Positions in radii.
 */
export function armStars(look: GalaxyLook, count: number, seed: number, avoid: readonly [number, number, number]): Float32Array {
  const random = mulberry32(seed);
  const out = new Float32Array(count * 2);
  let n = 0;
  let guard = 0;
  while (n < count && guard++ < count * 400) {
    const r = Math.sqrt(random()) * 1.05;
    const a = random() * TAU;
    const x = r * Math.cos(a);
    const y = r * Math.sin(a);
    if (Math.hypot(x - avoid[0], y - avoid[1]) < avoid[2]) continue;
    const arms = armLevel(look, x, y).total;
    const weight = Math.exp(-r / 0.45) * (0.12 + arms);
    if (random() > weight) continue;
    out[n * 2] = x;
    out[n * 2 + 1] = y;
    n++;
  }
  return out.subarray(0, n * 2);
}
