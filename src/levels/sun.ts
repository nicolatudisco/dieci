/**
 * The Sun, for every level that draws it (`sole`, `giove`, `pianeti-lontani`, and through
 * placeholder/bodies.ts also `voyager`, `oort` and `bolla`): always on the anchor `sun`.
 *
 * - The disc at its true size (695,700 km of radius), white-hot, darker towards the edge.
 * - The corona, at its true size too, a few radii of soft streamers that change slowly.
 * - The glare: the light of a star seen from close by, a halo with soft rays, measured in
 *   PIXELS (it is light, not size), only while the Sun is the middle of the scene: it fades
 *   between 10^13.1 and 10^13.6, and from Voyager on the Sun is a star.
 * - A point of light that never gets smaller (as before M3): from far away it is all that
 *   is left.
 *
 * Several levels draw the Sun at once while they cross-fade: the halo is drawn with MAX
 * blending, so two of them never add up into a brighter Sun.
 */
import { CustomBlending, MaxEquation, Mesh, PlaneGeometry, ShaderMaterial, Vector2, type Camera, type WebGLRenderer } from 'three';
import { CAMERA_DISTANCE } from '../engine/framing.ts';
import { ANCHORS, AU, type Vec3 } from '../engine/stage.ts';
import type { Sketch } from './placeholder/sketch.ts';
import { SUN_RADIUS_AU } from './solar-system.ts';

/** Largest reach of the glare, in CSS pixels. */
const GLARE_PX = 170;
/** Where the glare fades: from here on the Sun is a star. */
const GLARE_FADE: readonly [number, number] = [13.1, 13.6];

const VERTEX = /* glsl */ `
  varying vec2 vP;
  void main() {
    vP = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;

const FRAGMENT = /* glsl */ `
  uniform float uHalf;        // half size of the square, local units
  uniform float uRadius;      // radius of the Sun, local units
  uniform float uPxPerUnit;   // CSS pixels per local unit
  uniform float uGlare;
  uniform float uFade;
  uniform float uTime;
  varying vec2 vP;
  void main() {
    vec2 p = vP * uHalf;
    float r = length(p);
    float rho = r / uRadius;
    float px = r * uPxPerUnit;
    float a = atan(p.y, p.x);
    float t = uTime;

    // The disc, darker towards the edge.
    float aa = max(fwidth(rho), 1e-4);
    float disc = 1.0 - smoothstep(1.0 - aa, 1.0 + aa, rho);
    float mu = sqrt(max(0.0, 1.0 - rho * rho));
    vec3 face = mix(vec3(1.0, 0.66, 0.34), vec3(1.0, 0.97, 0.9), pow(mu, 0.45)) * (0.6 + 0.4 * mu);

    // Soft streamers: a few slow waves around the circle.
    float s = (0.5 + 0.5 * sin(a * 3.0 + 0.7 + 0.05 * t)) * (0.6 + 0.4 * sin(a * 7.0 - 1.3 - 0.08 * t));
    float n = 0.55 + 0.45 * sin(a * 13.0 + 2.1 + 0.11 * t) * sin(a * 5.0 - 0.13 * t);
    float streak = pow(clamp(s * n, 0.0, 1.0), 2.0);
    float out_ = step(1.0, rho);
    float corona = (exp(-(rho - 1.0) / 0.3) * 0.8 + streak * exp(-(rho - 1.0) / 2.0) * 0.4) * out_;

    // The glare, in pixels: a bright core, a halo that thins out to nothing, fine soft rays.
    float rays = 0.5 + 0.5 * sin(a * 11.0 + 0.4 + 0.04 * t) * sin(a * 17.0 - 0.9 - 0.06 * t);
    rays = pow(rays, 3.0);
    float glare = exp(-px / 5.0) * 0.9
      + 0.12 / (1.0 + pow(px / 13.0, 2.0))
      + (0.25 * streak + 0.35 * rays) * exp(-px / 15.0) * 0.35;
    glare *= uGlare * (1.0 - smoothstep(0.7, 1.0, length(vP)));

    vec3 color = face * disc + vec3(1.0, 0.86, 0.62) * corona + vec3(1.0, 0.84, 0.58) * glare;
    gl_FragColor = vec4(color * uFade, 1.0);
    #include <colorspace_fragment>
  }`;

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

const size = new Vector2();

/** The Sun on its anchor, in the units of `s`. Returns where it is. */
export function drawSun(s: Sketch): Vec3 {
  const at = s.local(ANCHORS.sun);
  const radius = s.units(SUN_RADIUS_AU * AU);
  const metresPerUnit = 1 / s.units(1);
  const material = new ShaderMaterial({
    uniforms: {
      ...s.uniforms,
      uHalf: { value: radius * 12 },
      uRadius: { value: radius },
      uPxPerUnit: { value: 1 },
      uGlare: { value: 1 },
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
  const halo = new Mesh(new PlaneGeometry(2, 2), material);
  halo.position.set(at[0], at[1], at[2]);
  halo.frustumCulled = false;
  // Each frame, just before it is drawn: how big a pixel is, and so how far the glare reaches.
  halo.onBeforeRender = (renderer: WebGLRenderer, _scene, camera: Camera) => {
    const cam = camera as Camera & { fov?: number };
    const distance = cam.position.z - at[2];
    if (!(distance > 0) || cam.fov === undefined) return;
    renderer.getSize(size);
    const pxPerUnit = size.y / (2 * distance * Math.tan((cam.fov * Math.PI) / 360));
    const e = Math.log10((distance / CAMERA_DISTANCE) * metresPerUnit);
    const half = Math.max(GLARE_PX / pxPerUnit, radius * 12);
    material.uniforms.uPxPerUnit!.value = pxPerUnit;
    material.uniforms.uGlare!.value = 1 - smoothstep(GLARE_FADE[0], GLARE_FADE[1], e);
    material.uniforms.uHalf!.value = half;
    halo.scale.setScalar(half);
    halo.updateMatrixWorld();
    halo.modelViewMatrix.multiplyMatrices(camera.matrixWorldInverse, halo.matrixWorld);
  };
  halo.renderOrder = -1;
  s.scene.add(halo);
  s.dot(at, 24, [1, 0.94, 0.8], 0.9);
  return at;
}
