/**
 * Bodies drawn inside the lenses of M3 (the Moon, Jupiter and its moons, Saturn): spheres
 * with their real pictures, lit from the direction of the Sun. A lens is a small scene of
 * its own, looked at along -z (see LensSpec in engine/level.ts): never enlarge a body in
 * the scene itself.
 *
 * The light is a plain direction (no three.js lights): the same in every lens, cheap, and
 * the shadow line is soft like the real one seen from far away.
 */
import { Color, DoubleSide, Mesh, RingGeometry, ShaderMaterial, SphereGeometry, Vector3, type ColorRepresentation, type Texture } from 'three';
import type { Vec3 } from '../engine/stage.ts';

const VERTEX = /* glsl */ `
  varying vec3 vNormal;
  varying vec2 vUv;
  void main() {
    vNormal = normalize(mat3(modelMatrix) * normal);
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;

const FRAGMENT = /* glsl */ `
  uniform sampler2D uMap;
  uniform bool uHasMap;
  uniform vec3 uColor;
  uniform vec3 uLight;
  uniform float uAmbient;
  uniform float uGain;
  varying vec3 vNormal;
  varying vec2 vUv;
  void main() {
    vec3 n = normalize(vNormal);
    float mu = dot(n, uLight);
    vec3 albedo = uHasMap ? texture2D(uMap, vUv).rgb : uColor;
    // A soft shadow line, and a little light on the night side (from far away, the faint
    // glow of what is around), so that the whole disc is felt.
    float lit = smoothstep(-0.04, 0.18, mu) * max(mu, 0.0);
    vec3 color = albedo * (uAmbient + uGain * lit);
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }`;

/**
 * The light inside the lens of a planet drawn at `angleDegrees` around the Sun (as in
 * solar-system.ts): from the planet towards the Sun on screen, and turned towards whoever
 * looks by `towardsViewer` degrees, so that the disc is mostly lit, as a planet beyond the
 * Earth always is when we look at it.
 */
export function lightFor(angleDegrees: number, towardsViewer: number): Vec3 {
  const a = ((angleDegrees + 180) * Math.PI) / 180;
  const v = (towardsViewer * Math.PI) / 180;
  return [Math.cos(a) * Math.cos(v), Math.sin(a) * Math.cos(v), Math.sin(v)];
}

export interface BodyOptions {
  /** Picture in plate carrée (longitude 0 in the middle), or a plain colour. */
  readonly map?: Texture;
  readonly color?: ColorRepresentation;
  /** Unit vector towards the Sun, in the axes of the lens (+z towards whoever looks). */
  readonly light: Vec3;
  /** Light on the night side (0..1) and strength of the sunlight. */
  readonly ambient?: number;
  readonly gain?: number;
  /** Equatorial and polar radius, in the units of the lens. */
  readonly radius: number;
  readonly polarRadius?: number;
  /** Detail of the sphere. */
  readonly segments?: number;
  /** Turn around the polar axis, radians: which longitude faces whoever looks (0 = longitude 0). */
  readonly turn?: number;
}

/**
 * A lit sphere. Longitude 0 of the picture faces whoever looks (+z), north is up: for the
 * Moon, the face we always see from the Earth.
 */
export function makeBody(options: BodyOptions): Mesh {
  const material = new ShaderMaterial({
    uniforms: {
      uMap: { value: options.map ?? null },
      uHasMap: { value: Boolean(options.map) },
      uColor: { value: new Color(options.color ?? '#ffffff') },
      uLight: { value: new Vector3(...options.light).normalize() },
      uAmbient: { value: options.ambient ?? 0.03 },
      uGain: { value: options.gain ?? 1.2 },
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
  });
  const segments = options.segments ?? 96;
  const mesh = new Mesh(new SphereGeometry(options.radius, segments, Math.round(segments * 0.66)), material);
  // In SphereGeometry the middle of the picture looks along +x: turn it towards +z.
  mesh.rotation.y = -Math.PI / 2 + (options.turn ?? 0);
  if (options.polarRadius !== undefined) mesh.scale.set(1, options.polarRadius / options.radius, 1);
  return mesh;
}

const RING_VERTEX = /* glsl */ `
  varying vec2 vLocal;
  varying vec3 vWorld;
  void main() {
    vLocal = position.xy;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }`;

const RING_FRAGMENT = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uInner;
  uniform float uOuter;
  uniform vec3 uLight;
  uniform vec3 uNormal;     // of the plane of the rings, in the axes of the lens
  uniform vec3 uCentre;     // of the planet
  uniform float uPlanet;    // its radius
  varying vec2 vLocal;
  varying vec3 vWorld;
  void main() {
    float u = (length(vLocal) - uInner) / (uOuter - uInner);
    vec4 tex = texture2D(uMap, vec2(clamp(u, 0.0, 1.0), 0.5));
    // The shadow of the planet: does the way towards the Sun cross the globe?
    vec3 oc = vWorld - uCentre;
    float b = dot(oc, uLight);
    float h = b * b - (dot(oc, oc) - uPlanet * uPlanet);
    float shadow = step(b, 0.0) * smoothstep(0.0, 0.08 * uPlanet * uPlanet, h);
    float lit = 0.35 + 0.8 * sqrt(abs(dot(uNormal, uLight)));
    vec3 color = tex.rgb * lit * (1.0 - 0.85 * shadow);
    gl_FragColor = vec4(color, tex.a * 0.95 * step(0.0, u) * step(u, 1.0));
    #include <colorspace_fragment>
  }`;

export interface RingOptions {
  /** One row of colour and transparency, from the inner to the outer edge. */
  readonly map: Texture;
  /** Inner and outer radius of the picture, in the units of the lens. */
  readonly inner: number;
  readonly outer: number;
  readonly light: Vec3;
  /** Radius of the planet, for its shadow. */
  readonly planetRadius: number;
}

/**
 * Rings in the equatorial plane of a body made with makeBody (add both to the same group,
 * centred on the origin). Call `aim()` after turning the group, so that light and shadow
 * know where the plane of the rings is.
 */
export function makeRings(options: RingOptions): { mesh: Mesh; aim: () => void } {
  const material = new ShaderMaterial({
    uniforms: {
      uMap: { value: options.map },
      uInner: { value: options.inner },
      uOuter: { value: options.outer },
      uLight: { value: new Vector3(...options.light).normalize() },
      uNormal: { value: new Vector3(0, 1, 0) },
      uCentre: { value: new Vector3() },
      uPlanet: { value: options.planetRadius },
    },
    vertexShader: RING_VERTEX,
    fragmentShader: RING_FRAGMENT,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
  });
  const mesh = new Mesh(new RingGeometry(options.inner, options.outer, 192, 1), material);
  // RingGeometry lies in the xy plane: lay it in the equatorial plane (xz), normal +y.
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = 1;
  return {
    mesh,
    aim: () => {
      mesh.updateWorldMatrix(true, false);
      const normal = new Vector3(0, 0, 1).transformDirection(mesh.matrixWorld);
      material.uniforms.uNormal!.value.copy(normal);
      material.uniforms.uCentre!.value.setFromMatrixPosition(mesh.matrixWorld);
    },
  };
}
