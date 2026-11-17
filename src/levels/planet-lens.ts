/**
 * Bodies drawn inside the lenses of M3 (the Moon, Jupiter and its moons, Saturn): spheres
 * with their real pictures, lit from the direction of the Sun. A lens is a small scene of
 * its own, looked at along -z (see LensSpec in engine/level.ts): never enlarge a body in
 * the scene itself.
 *
 * The light is a plain direction (no three.js lights): the same in every lens, cheap, and
 * the shadow line is soft like the real one seen from far away.
 */
import { Color, Mesh, ShaderMaterial, SphereGeometry, Vector3, type ColorRepresentation, type Texture } from 'three';
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
  mesh.rotation.y = -Math.PI / 2;
  if (options.polarRadius !== undefined) mesh.scale.set(1, options.polarRadius / options.radius, 1);
  return mesh;
}
