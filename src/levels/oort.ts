/**
 * The Oort cloud: a huge hollow shell of small icy bodies around the Sun, which by now is
 * one star among the others.
 *
 * - It is drawn as what the text says it is: separate points, far from one another, with
 *   no haze at all. «Si chiama nube, ma non è fatta di vapore.»
 * - The points are placed in three dimensions and the whole shell turns very slowly, so
 *   that it reads as a sphere; the far side is fainter than the near one. Leaving the
 *   Voyager stop, the camera travels out through it.
 * - A few comets fall from the shell towards the Sun along hair-thin paths, slowly far
 *   away and fast near the Sun, as Kepler's laws want. They have no tail: so far from the
 *   Sun the ice does not melt.
 * - One of the points has a lens: an icy block, seen from close by.
 *
 * Units: thousands of astronomical units. The cloud starts a few thousand AU from the Sun
 * and thins out towards 100,000 AU (NASA, «Oort Cloud: Facts»).
 */
import {
  AdditiveBlending,
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  IcosahedronGeometry,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshStandardMaterial,
  Points,
  Scene,
  ShaderMaterial,
  Vector3,
} from 'three';
import { LABELS } from '../content/labels.ts';
import type { Vec3 } from '../engine/stage.ts';
import { drawSun } from './placeholder/bodies.ts';
import { mulberry32 } from './placeholder/primitives.ts';
import { sketch } from './placeholder/sketch.ts';

/** As many as a large screen can take; a small one draws a share of them (see `tick`). */
const BODIES = 7000;
const INNER = 2.5;
/** Thinner and thinner out to here; the true edge is not sharp (about 100,000 AU). */
const OUTER = 90;

/**
 * Where the block of the lens is: the shell turns around the line from the Sun to it.
 * In the upper half of the picture, so that the lens can hang below it.
 */
const BLOCK: Vec3 = [52, 31, 12];

const ICE_VERTEX = /* glsl */ `
  attribute float aSize;
  attribute float aLevel;
  attribute float aPhase;
  uniform float uPixelRatio;
  uniform float uTime;
  uniform float uRadius;
  varying float vLevel;
  void main() {
    vec4 view = modelViewMatrix * vec4(position, 1.0);
    vec4 centre = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    // -1 on the far side of the shell, +1 on the side towards whoever looks.
    float depth = clamp((view.z - centre.z) / uRadius, -1.0, 1.0);
    float near = 0.5 + 0.5 * depth;
    float twinkle = 0.85 + 0.15 * sin(uTime * (0.4 + aPhase) + aPhase * 6.2831853);
    vLevel = aLevel * mix(0.5, 1.0, near) * twinkle;
    gl_Position = projectionMatrix * view;
    gl_PointSize = max(1.0, aSize * mix(0.8, 1.25, near) * uPixelRatio);
  }`;

const ICE_FRAGMENT = /* glsl */ `
  uniform float uFade;
  uniform vec3 uColor;
  varying float vLevel;
  void main() {
    float r = length(gl_PointCoord - 0.5) * 2.0;
    float core = 1.0 - smoothstep(0.0, 0.5, r);
    float halo = pow(max(0.0, 1.0 - r), 2.4);
    gl_FragColor = vec4(uColor, (core * 0.85 + halo * 0.5) * vLevel * uFade);
    #include <colorspace_fragment>
  }`;

function iceMaterial(color: string): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { uFade: { value: 1 }, uPixelRatio: { value: 1 }, uTime: { value: 0 }, uRadius: { value: OUTER }, uColor: { value: new Color(color) } },
    vertexShader: ICE_VERTEX,
    fragmentShader: ICE_FRAGMENT,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: AdditiveBlending,
  });
}

function icePoints(positions: Float32Array, sizes: Float32Array, levels: Float32Array, phases: Float32Array, color: string): Points {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('aSize', new BufferAttribute(sizes, 1));
  geometry.setAttribute('aLevel', new BufferAttribute(levels, 1));
  geometry.setAttribute('aPhase', new BufferAttribute(phases, 1));
  const points = new Points(geometry, iceMaterial(color));
  // The camera travels through the shell: never cull it as a whole.
  points.frustumCulled = false;
  return points;
}

/** The bodies of the cloud: few near the Sun, most of them half-way out, thinning to the edge. */
function shell(): Points {
  const random = mulberry32(1950);
  const positions = new Float32Array(BODIES * 3);
  const sizes = new Float32Array(BODIES);
  const levels = new Float32Array(BODIES);
  const phases = new Float32Array(BODIES);
  for (let i = 0; i < BODIES; i++) {
    const inner = random() < 0.07;
    // A thick-walled bubble: seen from outside, a little denser towards its rim.
    const r = inner ? INNER + 22 * random() ** 1.4 : 32 + (OUTER - 32) * ((random() + random()) / 2) ** 0.9;
    const z = random() * 2 - 1;
    const a = random() * Math.PI * 2;
    const flat = Math.sqrt(1 - z * z);
    positions.set([r * flat * Math.cos(a), r * flat * Math.sin(a), r * z], i * 3);
    const bright = random() ** 4;
    sizes[i] = 2 + 2.6 * bright;
    levels[i] = 0.42 + 0.28 * random() + 0.3 * bright;
    phases[i] = random();
  }
  return icePoints(positions, sizes, levels, phases, '#cfe0ff');
}

/** A comet on its way in: a long thin ellipse with the Sun at one focus. */
interface Comet {
  /** Semi-major axis and eccentricity. */
  readonly a: number;
  readonly e: number;
  /** Unit vectors of its plane: towards the point nearest to the Sun, and across. */
  readonly p: Vector3;
  readonly q: Vector3;
  /** Seconds one fall takes on screen, and where in its cycle the comet is at time zero. */
  readonly period: number;
  readonly offset: number;
}

function comet(far: Vec3, bend: Vec3, e: number, period: number, offset: number): Comet {
  const from = new Vector3(...far);
  const p = from.clone().normalize().negate();
  const q = new Vector3(...bend);
  q.addScaledVector(p, -q.dot(p)).normalize();
  return { a: from.length() / (1 + e), e, p, q, period, offset };
}

/** Where the comet is when its eccentric anomaly is `E` (π far away, 0 nearest to the Sun). */
function cometAt(c: Comet, E: number, out: Vector3): Vector3 {
  const along = c.a * (Math.cos(E) - c.e);
  const across = c.a * Math.sqrt(1 - c.e * c.e) * Math.sin(E);
  return out.copy(c.p).multiplyScalar(along).addScaledVector(c.q, across);
}

/** Kepler's equation, M = E - e sin E, solved for E. */
function eccentricAnomaly(M: number, e: number): number {
  let E = M + e * Math.sin(M);
  for (let i = 0; i < 12; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  return E;
}

// Their true orbits are thinner still: seen from here, a straight line into the Sun.
const COMETS: readonly Comet[] = [
  comet([-58, 36, 18], [0.5, 0.6, 0.2], 0.988, 46, 0.38),
  comet([-22, -66, 9], [0.9, -0.2, 0.3], 0.985, 54, 0.62),
  comet([-34, 64, -20], [0.8, 0.3, -0.4], 0.991, 62, 0.14),
];
const PATH_STEPS = 72;
/** Paths and comets stop this far from the Sun: closer in, they belong to another scale. */
const PATH_END = 2;
/** They are drawn only around the stop: on the way here they would be huge arcs across an empty view. */
const COMETS_FROM: readonly [number, number] = [15.7, 16.15];

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** The inbound half of the orbit of a comet, as a thin line that grows brighter towards the Sun. */
function cometPath(c: Comet): Line {
  const positions = new Float32Array((PATH_STEPS + 1) * 3);
  const colors = new Float32Array((PATH_STEPS + 1) * 3);
  const point = new Vector3();
  const tint = new Color('#9fb4f2');
  // From the far point to where the comet is `PATH_END` from the Sun: r = a (1 - e cos E).
  const last = Math.acos(Math.min(1, (1 - PATH_END / c.a) / c.e));
  for (let i = 0; i <= PATH_STEPS; i++) {
    const t = i / PATH_STEPS;
    cometAt(c, Math.PI - t * (Math.PI - last), point).toArray(positions, i * 3);
    // Additive blending: a darker colour is a fainter line.
    const level = 0.05 + 0.22 * t * t;
    colors.set([tint.r * level, tint.g * level, tint.b * level], i * 3);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  const line = new Line(geometry, new LineBasicMaterial({ vertexColors: true, transparent: true, blending: AdditiveBlending, depthTest: false, depthWrite: false }));
  line.frustumCulled = false;
  return line;
}

/** An icy block for the lens: a lumpy, dark body with a few brighter patches of clean ice. */
function iceBlock(): Mesh {
  const geometry = new IcosahedronGeometry(1, 4);
  const position = geometry.getAttribute('position');
  const colors = new Float32Array(position.count * 3);
  const v = new Vector3();
  const rock = new Color('#7d8aa8');
  const ice = new Color('#dfeaff');
  const color = new Color();
  for (let i = 0; i < position.count; i++) {
    v.fromBufferAttribute(position, i);
    // A potato, not a ball: long on one side, with bumps and a couple of hollows.
    const bumps =
      0.16 * Math.sin(2.1 * v.x + 1.3) * Math.cos(1.7 * v.y - 0.4) +
      0.11 * Math.sin(3.4 * v.y + 2.2 * v.z) +
      0.07 * Math.cos(5.1 * v.z - 3.3 * v.x + 0.8) +
      0.04 * Math.sin(9.0 * v.x + 7.0 * v.y + 5.0 * v.z);
    const patch = Math.max(0, Math.sin(3.1 * v.x - 1.2) * Math.sin(2.7 * v.y + 0.6) * Math.sin(2.3 * v.z + 2.0));
    v.multiplyScalar(1 + bumps);
    v.x *= 1.28;
    v.y *= 0.92;
    position.setXYZ(i, v.x, v.y, v.z);
    color.copy(rock).lerp(ice, Math.min(1, patch * 2.4));
    colors.set([color.r, color.g, color.b], i * 3);
  }
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return new Mesh(geometry, new MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0, flatShading: true }));
}

export default sketch((s) => {
  const sun = drawSun(s);

  // Everything that belongs to the cloud turns together, around the line from the Sun to
  // the block of the lens: that block stays where the lens points.
  const cloud = new Group();
  const axis = new Vector3(...BLOCK).normalize();
  const bodies = shell();
  bodies.renderOrder = 100;
  cloud.add(bodies);

  const paths = COMETS.map(cometPath);
  for (const path of paths) {
    path.renderOrder = 101;
    cloud.add(path);
  }
  // The comets themselves: for each, a bright point and a soft glow around it.
  const heads = icePoints(
    new Float32Array(COMETS.length * 6),
    Float32Array.from({ length: COMETS.length * 2 }, (_, k) => (k % 2 ? 26 : 9)),
    new Float32Array(COMETS.length * 2).fill(1),
    new Float32Array(COMETS.length * 2).fill(0.5),
    '#eef4ff',
  );
  heads.renderOrder = 102;
  cloud.add(heads);
  s.scene.add(cloud);

  // The block of the lens is one of the bodies, a little brighter so that the thread has an end.
  const block = icePoints(new Float32Array(BLOCK), new Float32Array([5]), new Float32Array([0.95]), new Float32Array([0.2]), '#eef4ff');
  block.renderOrder = 103;
  s.scene.add(block);

  // The lens: sunlight comes from the Sun, which from here is only the brightest star.
  const scene = new Scene();
  const home = new Vector3(sun[0] - BLOCK[0], sun[1] - BLOCK[1], 0).normalize();
  const sunlight = new DirectionalLight('#fff3df', 3);
  sunlight.position.set(home.x, home.y, 0.8);
  scene.add(sunlight, new HemisphereLight('#a9bbff', '#10152e', 0.9), new AmbientLight('#8fa3e6', 0.2));
  const ice = iceBlock();
  ice.rotation.set(0.5, 0.4, -0.3);
  scene.add(ice);
  // Lens and name leave early: the next stop is the bubble, and nothing must sit on it.
  s.lens({ id: 'block', at: BLOCK, scene, fieldWidth: 3.5, angle: -80, label: LABELS.places.iceBlock, to: 16.6 });

  // Under the cloud: the upper half is where the lens goes when the screen is narrow.
  s.label({ id: 'cloud', text: LABELS.places.oortCloud, at: [sun[0], sun[1] - 60, sun[2]], kind: 'note', align: 'below', to: 16.6 });

  const point = new Vector3();
  const headPositions = heads.geometry.getAttribute('position') as BufferAttribute;
  const headLevels = heads.geometry.getAttribute('aLevel') as BufferAttribute;
  const materials = [bodies, heads, block].map((points) => points.material as ShaderMaterial);

  s.tick = (frame) => {
    const t = frame.time;
    for (const material of materials) {
      material.uniforms.uFade!.value = frame.fade;
      material.uniforms.uPixelRatio!.value = frame.pixelRatio;
      material.uniforms.uTime!.value = t;
    }
    // A small screen has room for fewer points: the same cloud must not turn into a fog.
    const largo = frame.pxPerUnit * frame.viewWidth;
    const room = Math.min(1, Math.max(0.3, (largo / 820) ** 1.5));
    bodies.geometry.setDrawRange(0, Math.max(1, Math.floor(BODIES * room * frame.quality)));
    // One turn in about six minutes, plus a little for every power of ten travelled.
    cloud.quaternion.setFromAxisAngle(axis, 0.0175 * t + 0.5 * (frame.e - s.exponent));
    ice.rotation.set(0.5 + 0.11 * t, 0.4 + 0.07 * t, -0.3);

    const comets = smoothstep(COMETS_FROM[0], COMETS_FROM[1], frame.e);
    COMETS.forEach((c, i) => {
      // One cycle: the fall, then a pause before the next comet takes the same road.
      const cycle = (t / c.period + c.offset) % 1;
      const fall = Math.min(1, cycle / 0.82);
      // Mean anomaly from just after the far point to the passage near the Sun.
      const E = eccentricAnomaly(Math.PI * (1 - 0.06 - 0.94 * fall), c.e);
      cometAt(c, E, point);
      headPositions.setXYZ(2 * i, point.x, point.y, point.z);
      headPositions.setXYZ(2 * i + 1, point.x, point.y, point.z);
      // It comes out of the dark at the start and goes out where its path ends, near the Sun.
      const shown = comets * Math.min(1, cycle / 0.06) * smoothstep(PATH_END, PATH_END * 2.5, point.length());
      headLevels.setX(2 * i, 1.4 * shown);
      headLevels.setX(2 * i + 1, 0.3 * shown);
      (paths[i]?.material as LineBasicMaterial).opacity = frame.fade * comets;
    });
    headPositions.needsUpdate = true;
    headLevels.needsUpdate = true;
  };
});
