/**
 * The bubble of her light: the emotional moment of the journey.
 *
 * A sphere of warm light is born from the warm dot («Tu sei qui») and grows, one light-year
 * for every year of her life, up to where her light is today. When its edge reaches a
 * star, the star lights up. On the edge runs «quando avevi 4 anni…», and at the end «oggi».
 *
 * - Radius, lit stars and texts all come from src/bubble.ts, from the same date.
 * - The sphere is drawn as what it is: a thin bright shell (the light of the day she was
 *   born) around a faint glow (the light of every day since). Amber, the colour kept for
 *   her: the dot, the bubble and the finale.
 * - The stars are the real ones of data.ts → NEARBY_STARS. Where they are drawn depends on
 *   the layout (see `Layout`).
 * - With ?static=1 and with reduced motion the bubble is shown full, at once.
 *
 * Units: light-years, around the Sun.
 */
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, Group, Mesh, NormalBlending, PlaneGeometry, Points, Quaternion, ShaderMaterial, Vector3 } from 'three';
import { bubbleAt, type Bubble } from '../bubble.ts';
import { LABELS } from '../content/labels.ts';
import { UI } from '../content/ui.ts';
import { CAMERA_DISTANCE } from '../engine/framing.ts';
import type { LabelSpec, LevelFrame } from '../engine/level.ts';
import type { Vec3 } from '../engine/stage.ts';
import { drawSun } from './placeholder/bodies.ts';
import { sketch } from './placeholder/sketch.ts';
import { stageFromEquatorial } from './sky.ts';

/**
 * How the stars are laid out in the picture.
 *
 * - `distance`: seen from above the galactic plane like every scene around this one, each
 *   star in its true direction (galactic longitude) and at its TRUE DISTANCE from the Sun.
 *   What is flattened is the depth: a star far above or below the plane is laid down on
 *   it. In exchange the picture says exactly what this stop is about: a star is inside the
 *   circle if and only if her light has reached it, and it lights up when the edge touches it.
 * - `depth`: the true positions in three dimensions, seen from the side from which the
 *   stars not yet reached fall nearest to the edge, with a slow rocking that gives depth.
 *   A star in front of or behind the bubble is drawn inside the circle although it is
 *   outside the sphere, and lights up after the edge has passed over it.
 */
type Layout = 'distance' | 'depth';

/** TEMPORARY, until Nicola chooses: `?bolla=3d` shows the other layout, for comparison. */
function chosenLayout(): Layout {
  return new URLSearchParams(globalThis.location?.search ?? '').get('bolla') === '3d' ? 'depth' : 'distance';
}

const WARM = '#ffb24d';
const WARM_BRIGHT = '#ffd27a';
const NIGHT = '#05060d';

/** Light-years the edge travels in a second while the bubble grows: a year of hers in under a second. */
const SPEED = 1.15;
/** The bubble starts to grow when the journey enters the stop, and empties when it goes back to the cloud. */
const GROW_FROM = 17.25;
const EMPTY_BELOW = 16.9;
/** Going on towards the nebulae before the growth is over, the bubble catches up. */
const FULL_BETWEEN: readonly [number, number] = [17.7, 18.2];

/** The stars the texts talk about: their names are written larger, and two of them carry a note. */
const FEATURED = ['Epsilon Eridani', 'Sirio', 'Proxima Centauri', 'Stella di Barnard', '61 Cygni'];
/**
 * Diameter of a star in CSS pixels, in three true classes: the ones that shine in our sky,
 * the ones barely visible to the naked eye, and the faint red dwarfs (most of the neighbours).
 */
const BRIGHT = new Set(['Sirio', 'Alfa Centauri A e B', 'Procione']);
const VISIBLE = new Set(['Epsilon Eridani', '61 Cygni']);

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// ──────────────────────────────────────────────────────────────────────────── the sphere

const QUAD_VERTEX = /* glsl */ `
  varying vec2 vP;
  void main() {
    vP = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;

/** In the quad, the sphere has radius 1. */
const GLOW_FRAGMENT = /* glsl */ `
  uniform vec3 uBody;
  uniform vec3 uRim;
  uniform float uFade;
  uniform float uTime;
  uniform float uArrived;   // 1 just after the edge has reached today, then back to 0
  varying vec2 vP;
  void main() {
    float rho = length(vP);
    float px = fwidth(rho);
    float inside = 1.0 - smoothstep(1.0 - px, 1.0 + px, rho);
    // Cosine of the angle between the line of sight and the surface of the sphere.
    float mu = sqrt(max(0.0, 1.0 - rho * rho));
    float angle = atan(vP.y, vP.x);
    float shimmer = 1.0 + 0.10 * sin(angle * 3.0 + uTime * 0.21) + 0.07 * sin(angle * 7.0 - uTime * 0.13 + 1.7);
    // The light of every day since: a faint glow, a little deeper through the middle.
    float body = inside * (0.05 + 0.035 * mu);
    // The light of that very day: a thin shell, brightest where it is seen edge-on.
    float shell = inside * (0.3 * pow(rho, 4.0) + 0.3 * pow(rho, 14.0)) * shimmer;
    // What spills out of the edge.
    float spill = (1.0 - inside) * 0.2 * exp(-pow((rho - 1.0) / 0.05, 2.0));
    float line = 1.0 - smoothstep(0.6 * px, 2.0 * px, abs(rho - 1.0 + px));
    float glow = (body + shell + spill) * (1.0 + 0.5 * uArrived);
    float edge = line * (0.85 + 0.15 * shimmer);
    float total = glow + edge;
    vec3 color = (uBody * glow + uRim * edge) / max(total, 1e-5);
    gl_FragColor = vec4(color, total * uFade);
    #include <colorspace_fragment>
  }`;

/** A veil of night inside the bubble: the far stars of the sky step back, hers stand out. */
const VEIL_FRAGMENT = /* glsl */ `
  uniform vec3 uBody;
  uniform float uFade;
  varying vec2 vP;
  void main() {
    float rho = length(vP);
    float px = fwidth(rho);
    float inside = 1.0 - smoothstep(1.0 - px, 1.0 + px, rho);
    gl_FragColor = vec4(uBody, 0.4 * inside * uFade);
    #include <colorspace_fragment>
  }`;

// ───────────────────────────────────────────────────────────────────────────── the stars

const STAR_VERTEX = /* glsl */ `
  attribute float aSize;
  attribute float aLit;
  attribute float aFlash;
  attribute float aWaiting;
  attribute float aPhase;
  uniform float uPixelRatio;
  uniform float uScale;
  uniform float uTime;
  varying float vLit;
  varying float vFlash;
  varying float vLevel;
  void main() {
    vLit = aLit;
    vFlash = aFlash;
    // The next star her light will reach breathes slowly: it is waiting.
    float breathe = aWaiting * (0.5 + 0.5 * sin(uTime * 1.9));
    float twinkle = 0.93 + 0.07 * sin(uTime * (0.7 + aPhase) + aPhase * 6.2831853);
    vLevel = twinkle * (1.0 + 0.55 * breathe) * mix(0.62, 1.0, aLit);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    // Four times the body of the star: room for its halo and its rays.
    gl_PointSize = aSize * uScale * mix(0.72, 1.0, aLit) * (1.0 + 0.6 * aFlash + 0.25 * breathe) * 4.0 * uPixelRatio;
  }`;

const STAR_FRAGMENT = /* glsl */ `
  uniform vec3 uWarm;
  uniform vec3 uCool;
  uniform vec3 uCore;
  uniform float uFade;
  varying float vLit;
  varying float vFlash;
  varying float vLevel;
  void main() {
    vec2 p = gl_PointCoord * 2.0 - 1.0;
    float r = length(p);
    float core = 1.0 - smoothstep(0.1, 0.26, r);
    float halo = pow(max(0.0, 1.0 - r), 3.0);
    float rays = exp(-abs(p.y) * 26.0) * pow(max(0.0, 1.0 - abs(p.x)), 2.5) + exp(-abs(p.x) * 26.0) * pow(max(0.0, 1.0 - abs(p.y)), 2.5);
    vec3 tint = mix(uCool, uWarm, vLit);
    vec3 color = mix(tint, uCore, core * (0.3 + 0.55 * vLit));
    float alpha = core + halo * (0.26 + 0.42 * vLit + 0.7 * vFlash) + rays * (0.06 + 0.44 * vLit + 0.6 * vFlash);
    gl_FragColor = vec4(color, alpha * vLevel * uFade);
    #include <colorspace_fragment>
  }`;

// ──────────────────────────────────────────────────────────────────────────── the layout

/** Where the stars are, in light-years from the Sun, for the chosen layout. */
function starPositions(bubble: Bubble, layout: Layout, viewWidth: number): Vector3[] {
  const true3d = bubble.stars.map(({ star }) => new Vector3(...stageFromEquatorial(star.raHours, star.decDeg, star.ly)));
  if (layout === 'distance') {
    // True direction on the picture, true distance from the Sun.
    return true3d.map((p, i) => {
      const flat = Math.hypot(p.x, p.y) || 1;
      const distance = bubble.stars[i]?.star.ly ?? 0;
      return new Vector3((p.x / flat) * distance, (p.y / flat) * distance, 0);
    });
  }
  // The side to look from: the one from which the stars not yet reached fall nearest to the
  // edge of the sphere (or beyond it), and the reached ones stay well inside.
  const camera = viewWidth * CAMERA_DISTANCE;
  const edge = Math.tan(Math.asin(Math.min(0.99, bubble.radius / camera)));
  let best = { score: -Infinity, n: new Vector3(0, 0, 1) };
  const n = new Vector3();
  const COUNT = 6000;
  for (let k = 0; k < COUNT; k++) {
    const z = 1 - (2 * (k + 0.5)) / COUNT;
    const a = k * Math.PI * (3 - Math.sqrt(5));
    const flat = Math.sqrt(1 - z * z);
    n.set(flat * Math.cos(a), flat * Math.sin(a), z);
    let outside = Infinity;
    let inside = 0;
    true3d.forEach((p, i) => {
      const along = p.dot(n);
      const ratio = Math.sqrt(Math.max(0, p.lengthSq() - along * along)) / (camera - along) / edge;
      if (bubble.stars[i]?.reached) inside = Math.max(inside, ratio);
      else outside = Math.min(outside, ratio);
    });
    const score = (Number.isFinite(outside) ? outside : 1) - 2 * Math.max(0, inside - 0.9);
    if (score > best.score) best = { score, n: n.clone() };
  }
  // Turn the stars so that the chosen side faces the camera, keeping the galactic centre up as far as it goes.
  const z = best.n;
  const up = Math.abs(z.y) > 0.95 ? new Vector3(0, 0, 1) : new Vector3(0, 1, 0);
  const x = new Vector3().crossVectors(up, z).normalize();
  const y = new Vector3().crossVectors(z, x);
  return true3d.map((p) => new Vector3(p.dot(x), p.dot(y), p.dot(z)));
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

type Side = NonNullable<LabelSpec['align']>;
const SIDES: readonly Side[] = ['above', 'right', 'below', 'left'];

/** The box of a label of `width` × `height` pixels on one side of the point (x, y), y down. */
function boxOn(side: Side, x: number, y: number, width: number, height: number): Box {
  if (side === 'above') return { x: x - width / 2, y: y - 10 - height, width, height };
  if (side === 'below') return { x: x - width / 2, y: y + 10, width, height };
  if (side === 'left') return { x: x - 12 - width, y: y - height / 2, width, height };
  return { x: x + 12, y: y - height / 2, width, height };
}

// ───────────────────────────────────────────────────────────────────────────── the level

export default sketch((s) => {
  const { isStatic, reducedMotion } = s.ctx;
  const bubble = bubbleAt(s.ctx.birth, s.ctx.now());
  const layout = chosenLayout();
  const radius = bubble.radius;
  const count = bubble.stars.length;
  const still = isStatic || reducedMotion;

  // Behind everything: the veil, then the light of the bubble.
  const quad = new PlaneGeometry(2.6, 2.6);
  const veil = new Mesh(
    quad,
    new ShaderMaterial({
      uniforms: { uBody: { value: new Color(NIGHT) }, uFade: { value: 1 } },
      vertexShader: QUAD_VERTEX,
      fragmentShader: VEIL_FRAGMENT,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: NormalBlending,
    }),
  );
  veil.renderOrder = -2;
  const glow = new Mesh(
    quad,
    new ShaderMaterial({
      uniforms: { uBody: { value: new Color(WARM) }, uRim: { value: new Color(WARM_BRIGHT) }, uFade: { value: 1 }, uTime: { value: 0 }, uArrived: { value: 0 } },
      vertexShader: QUAD_VERTEX,
      fragmentShader: GLOW_FRAGMENT,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: AdditiveBlending,
    }),
  );
  glow.renderOrder = -1;
  s.scene.add(veil, glow);

  const sun = drawSun(s);

  // The stars, nearest first (the order of the model).
  const rest = starPositions(bubble, layout, s.units(10 ** s.exponent));
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const lit = new Float32Array(count);
  const flash = new Float32Array(count);
  const waiting = new Float32Array(count);
  const phases = new Float32Array(count);
  const next = bubble.stars.findIndex((item) => !item.reached);
  bubble.stars.forEach(({ star }, i) => {
    rest[i]?.toArray(positions, i * 3);
    sizes[i] = BRIGHT.has(star.name) ? 13 : VISIBLE.has(star.name) ? 10 : 7.5;
    waiting[i] = i === next ? 1 : 0;
    phases[i] = (i * 0.618) % 1;
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('aSize', new BufferAttribute(sizes, 1));
  geometry.setAttribute('aLit', new BufferAttribute(lit, 1));
  geometry.setAttribute('aFlash', new BufferAttribute(flash, 1));
  geometry.setAttribute('aWaiting', new BufferAttribute(waiting, 1));
  geometry.setAttribute('aPhase', new BufferAttribute(phases, 1));
  const stars = new Points(
    geometry,
    new ShaderMaterial({
      uniforms: {
        uWarm: { value: new Color('#ffbe5c') },
        uCool: { value: new Color('#9bb5ff') },
        uCore: { value: new Color('#fff8ea') },
        uFade: { value: 1 },
        uPixelRatio: { value: 1 },
        uScale: { value: 1 },
        uTime: { value: 0 },
      },
      vertexShader: STAR_VERTEX,
      fragmentShader: STAR_FRAGMENT,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: AdditiveBlending,
    }),
  );
  stars.frustumCulled = false;
  stars.renderOrder = 50;
  const cluster = new Group();
  cluster.position.set(sun[0], sun[1], sun[2]);
  cluster.add(stars);
  s.scene.add(cluster);

  const featured = new Set(FEATURED);
  /** The star her light reached last, among the ones the texts talk about, while the edge is at `wave`. */
  const lastReached = (): number => {
    let found = -1;
    bubble.stars.forEach(({ star }, i) => {
      if (featured.has(star.name) && wave >= star.ly) found = i;
    });
    return found;
  };

  // ── The life of the bubble.
  /** Where the edge is now, in light-years. */
  let wave = still ? radius : 0;
  let growing = false;
  /** 1 at the moment the edge reaches today, then it fades. */
  let arrived = 0;
  const now = bubble.stars.map(() => new Vector3());
  /** How much of each note is shown: they come and go softly, they never pop. */
  const reachedNote = new Float32Array(count);
  let waitingNote = still ? 1 : 0;
  const rocking = new Quaternion();
  const axis = new Vector3();

  s.tick = (frame) => {
    const t = frame.time;
    // Did the edge move by growing (and not by catching up) in this frame?
    let grew = false;
    // Without animation the bubble follows the zoom instead of the clock: empty coming from
    // the cloud, full on the stop. (Screenshots of the transitions, and reduced motion.)
    if (still) wave = radius * smoothstep(EMPTY_BELOW, GROW_FROM + 0.1, frame.u);
    // A frame with no time in it is the engine warming the level up at some other place of
    // the journey (see level.ts): it must not start the bubble.
    if (!still && frame.dt > 0) {
      if (frame.u < EMPTY_BELOW) {
        wave = 0;
        growing = false;
      } else if (frame.u >= GROW_FROM) {
        growing = true;
      }
      const before = wave;
      if (growing && wave < radius) {
        // A soft start, a steady run, a soft landing on today.
        const pace = Math.min(1, 0.25 + wave / 0.6) * Math.min(1, 0.12 + (radius - wave) / 0.7);
        wave = Math.min(radius, wave + SPEED * pace * frame.dt);
        grew = true;
      }
      const caughtUp = radius * smoothstep(FULL_BETWEEN[0], FULL_BETWEEN[1], frame.u);
      if (caughtUp > wave) {
        wave = caughtUp;
        grew = false;
      }
      if (grew && before < radius && wave >= radius) arrived = 1;
      arrived *= Math.exp(-frame.dt / 0.9);
    }

    const scale = Math.max(wave, 1e-4);
    for (const mesh of [veil, glow]) {
      mesh.visible = wave > 0.02;
      mesh.position.set(sun[0], sun[1], sun[2]);
      mesh.scale.setScalar(scale);
    }
    // The bubble comes out of the warm dot: at first it is only a breath of light.
    const born = smoothstep(0, 0.6, wave);
    (veil.material as ShaderMaterial).uniforms.uFade!.value = frame.fade * born;
    const light = (glow.material as ShaderMaterial).uniforms;
    light.uFade!.value = frame.fade * born;
    light.uTime!.value = t;
    light.uArrived!.value = arrived;

    // A star lights up when the edge reaches its distance.
    bubble.stars.forEach(({ star }, i) => {
      const target = wave >= star.ly ? 1 : 0;
      const value = lit[i] ?? 0;
      if (still || frame.dt === 0) {
        lit[i] = target;
      } else {
        // The flash belongs to the growth: a bubble found already full does not sparkle.
        if (grew && target === 1 && value === 0) flash[i] = 1;
        lit[i] = value + (target - value) * Math.min(1, frame.dt * 5);
        if (Math.abs(target - (lit[i] ?? 0)) < 0.002) lit[i] = target;
        flash[i] = (flash[i] ?? 0) * Math.exp(-frame.dt / 0.7);
      }
    });
    (geometry.getAttribute('aLit') as BufferAttribute).needsUpdate = true;
    (geometry.getAttribute('aFlash') as BufferAttribute).needsUpdate = true;

    const uniforms = (stars.material as ShaderMaterial).uniforms;
    uniforms.uFade!.value = frame.fade;
    uniforms.uPixelRatio!.value = frame.pixelRatio;
    uniforms.uTime!.value = t;
    // On a small screen the bubble is small: its stars are smaller too.
    uniforms.uScale!.value = Math.min(1, Math.max(0.62, (frame.pxPerUnit * frame.viewWidth) / 700));

    // Depth layout: the stars rock a few degrees around the Sun, so that near and far are felt.
    if (layout === 'depth') {
      rocking.setFromAxisAngle(axis.set(Math.cos(t * 0.11), Math.sin(t * 0.11), 0), 0.11 * Math.sin(t * 0.33));
      cluster.quaternion.copy(rocking);
    }
    rest.forEach((p, i) => now[i]?.copy(p).applyQuaternion(cluster.quaternion));

    // The two notes: «raggiunta dalla tua luce» follows the edge from star to star,
    // «la tua luce non ci è ancora arrivata» comes when the edge has stopped.
    const latest = lastReached();
    const step = still ? 1 : Math.min(1, frame.dt * 3.5);
    for (let i = 0; i < count; i++) reachedNote[i] = (reachedNote[i] ?? 0) + ((i === latest ? 1 : 0) - (reachedNote[i] ?? 0)) * step;
    waitingNote += ((wave >= radius ? 1 : 0) - waitingNote) * step;
  };

  // ── The words.
  const nextFeatured = bubble.stars.findIndex((item) => !item.reached && featured.has(item.star.name));
  /** The star that carries «raggiunta dalla tua luce» when the bubble is full. */
  let lastFeaturedReached = -1;
  bubble.stars.forEach((item, i) => {
    if (item.reached && featured.has(item.star.name)) lastFeaturedReached = i;
  });
  const order = bubble.stars.map((_, i) => i).sort((a, b) => {
    const rank = (i: number): number => {
      const at = FEATURED.indexOf(bubble.stars[i]?.star.name ?? '');
      return at < 0 ? FEATURED.length + i : at;
    };
    return rank(a) - rank(b);
  });
  /**
   * Where the words of the edge sit: up and to the left, in the widest gap between the
   * stars, with the text outside the bubble. Where the screen is too narrow for that, they
   * sit above the bubble instead.
   */
  const EDGE_LEFT = (150 * Math.PI) / 180;
  const EDGE_ABOVE = (108 * Math.PI) / 180;
  /** Width in pixels of a text of `size` pixels, a little generous. */
  const widthOf = (text: string, size: number): number => text.length * size * 0.52 + 6;
  const growingText = (years: number): string => (years >= 2 ? LABELS.bubble.whenYears.replace('{anni}', String(years)) : years === 1 ? LABELS.bubble.whenOne : '');
  const finalText = bubble.exact ? LABELS.bubble.today : LABELS.bubble.atTen;
  /** The longest words the edge will carry while the bubble grows. */
  const longest = widthOf(growingText(Math.max(2, Math.floor(radius))), 15);

  s.liveLabels = (frame: LevelFrame): LabelSpec[] => {
    // The words leave soon after the stop: on a bubble that shrinks they would pile up.
    const around = smoothstep(s.exponent - 0.75, s.exponent - 0.45, frame.e) * (1 - smoothstep(s.exponent + 0.2, s.exponent + 0.42, frame.e));
    if (around < 0.01) return [];
    const out: LabelSpec[] = [];
    const px = frame.pxPerUnit;
    const small = px * frame.viewWidth < 420;
    const full = wave >= radius;
    const taken: Box[] = [];
    // The warm dot and its words, to the right of the Sun.
    taken.push({ x: -14, y: -16, width: 150, height: 32 });

    // The words on the edge: her age while the bubble grows, then today. Their place at
    // the end is kept free from the start, so that no name has to move aside on the way.
    const roomLeft = frame.free.width / 2 - radius * px * Math.abs(Math.cos(EDGE_LEFT)) - 12;
    const toTheLeft = roomLeft > longest + 8;
    const angle = toTheLeft ? EDGE_LEFT : EDGE_ABOVE;
    const side: Side = toTheLeft ? 'left' : 'above';
    const reach = (r: number): Vec3 => [sun[0] + r * Math.cos(angle), sun[1] + r * Math.sin(angle), sun[2]];
    const end = reach(radius * 1.02);
    taken.push(boxOn(side, (end[0] - sun[0]) * px, -(end[1] - sun[1]) * px, widthOf(finalText, small ? 18 : 22), 30));
    const edgeText = full ? finalText : growingText(Math.floor(wave + 1e-6));
    // «oggi» is said aloud, in the typeface of the titles; the years on the way are quieter.
    if (edgeText) out.push({ id: full ? 'edge/today' : 'edge', text: edgeText, at: reach(wave * 1.02), kind: full ? 'title' : 'place', align: side, opacity: around });

    const dots = now.map((p) => ({ x: p.x * px - 7, y: -p.y * px - 7, width: 14, height: 14 }));
    const clear = (box: Box, self: number): boolean => !taken.some((other) => overlaps(box, other)) && !dots.some((dot, k) => k !== self && overlaps(box, dot));

    for (const i of order) {
      const item = bubble.stars[i];
      const p = now[i];
      if (!item || !p) continue;
      const name = item.star.name;
      const main = featured.has(name);
      const size = main ? 15 : 13;
      const x = p.x * px;
      const y = -p.y * px;
      const waits = i === nextFeatured;
      const carries = waits || (i === lastFeaturedReached && !small);
      const outer: Side = y > 0 ? 'below' : 'above';
      // A star outside the bubble has its name on its outer side, clear of the edge.
      const away: Side = Math.abs(x) > Math.abs(y) ? (x > 0 ? 'right' : 'left') : outer;
      // The star that waits has two lines to place: beside it only if the long one fits in the picture.
      const beside = frame.free.width / 2 - Math.abs(x) - 12 > widthOf(UI.bubble.starNotYet, 12);
      const waitingSide: Side = away === outer || beside ? away : outer;
      const sides = waits ? [waitingSide] : item.reached ? SIDES : [away, ...SIDES.filter((other) => other !== away)];
      let placed: { side: Side; box: Box } | null = null;
      for (const candidate of sides) {
        const box = boxOn(candidate, x, y, widthOf(name, size), size + 6);
        if (!clear(box, i)) continue;
        placed = { side: candidate, box };
        break;
      }
      // The two stars that carry a note are always named; the others only where there is room.
      if (!placed && (waits || i === lastFeaturedReached) && sides[0]) placed = { side: sides[0], box: boxOn(sides[0], x, y, widthOf(name, size), size + 6) };
      if (!placed) continue;
      taken.push(placed.box);
      const strength = waits ? 1 : 0.5 + 0.5 * (lit[i] ?? 0);
      const at: Vec3 = [sun[0] + p.x, sun[1] + p.y, sun[2] + p.z];
      out.push({ id: name, text: name, at, kind: main ? 'place' : 'note', align: placed.side, opacity: around * strength });

      // The note: under the name on the outer side for the star that waits; for a star just
      // reached, on the side of the star that the name leaves free. The place of the two
      // notes of the full bubble is kept from the start.
      const text = waits ? UI.bubble.starNotYet : UI.bubble.starReached;
      const shown = waits ? waitingNote : small ? 0 : (reachedNote[i] ?? 0);
      if (!carries && shown < 0.01) continue;
      // For the star that waits the two lines go outwards together: the note beyond the
      // name above or below the star, under the name beside it.
      const stacked = !waits ? 0 : waitingSide === 'above' ? -22 : waitingSide === 'below' ? 22 : 19;
      const noteSide: Side = waits ? waitingSide : placed.side === 'below' ? 'above' : 'below';
      const box = boxOn(noteSide, x, y + stacked, widthOf(text, 12), 19);
      if (carries) taken.push(box);
      if (shown > 0.01) out.push({ id: `${name}/note`, text, at: [at[0], at[1] - stacked / px, at[2]], kind: 'note', align: noteSide, opacity: around * shown });
    }
    return out;
  };
});
