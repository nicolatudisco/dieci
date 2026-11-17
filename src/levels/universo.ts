/**
 * The observable universe: a sphere 46.5 billion light-years in radius with us at the centre.
 *
 * - Inside, the cosmic web: the very tile of `rete-cosmica` (src/cosmic-web.ts) repeated as
 *   a picture with mipmaps. At this scale its filaments are finer than a pixel and become the
 *   grain of the universe, exactly: no other web is invented. Brighter through the middle
 *   (we look through more of the sphere there), it thins out towards the first galaxies,
 *   about 33 billion light-years away.
 * - Then a dark band: the time before the first stars, when there was only dark gas.
 * - Then the edge: the oldest light, inspired by the cosmic microwave background, a thin
 *   shell of mottled light, brighter where it is seen edge-on, turning very slowly.
 * - The warm dot at the centre: us. Then, in Act II, it all shrinks to a point of light.
 *
 * Units: tens of billions of light-years, around us.
 */
import {
  AdditiveBlending,
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  Matrix3,
  Mesh,
  PlaneGeometry,
  RedFormat,
  RepeatWrapping,
  ShaderMaterial,
  UnsignedByteType,
  Vector2,
  Vector3,
} from 'three';
import { OBSERVABLE_UNIVERSE_RADIUS_LY } from '../content/data.ts';
import { LY } from '../engine/stage.ts';
import { asyncSketch } from './async-sketch.ts';
import { webData } from './web-data.ts';

/** The first galaxies: beyond about 33 billion light-years (today's distance of light that left them at redshift ~12) there are none yet. */
const FIRST_GALAXIES_LY = 33e9;

/** The two looks of the oldest light, to be chosen by Nicola (M5, step 8): 'peach' or 'planck'. */
const PALETTE: 'peach' | 'planck' = 'peach';

const QUAD_VERTEX = /* glsl */ `
  varying vec2 vP;
  void main() {
    vP = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;

const WEB_FRAGMENT = /* glsl */ `
  uniform sampler2D uWeb;
  uniform float uTile;       // side of the tile, local units
  uniform vec2 uOrigin;      // where we are in the tile, local units
  uniform mat3 uInverse;     // from the stage back to the tile (rotation)
  uniform float uGalaxies;   // radius of the first galaxies, local units
  uniform float uLevel;
  uniform float uFade;
  uniform vec3 uCool;
  uniform vec3 uYoung;
  varying vec2 vP;
  void main() {
    vec2 tile = (uInverse * vec3(vP, 0.0)).xy + uOrigin;
    // A little sharper than the mipmaps would pick: the grain of the galaxies stays visible.
    float b = texture2D(uWeb, tile / uTile, -0.6).r;
    // Contrast: the knots and the big filaments stand out, the thin walls fade.
    float density = pow(b * b * 8.0, 1.7);
    float x = length(vP) / uGalaxies;
    // Looking through a ball of galaxies: more of them along the line of sight in the middle.
    float column = sqrt(max(0.0, 1.0 - x * x));
    float edge = 1.0 - smoothstep(0.82, 1.0, x);
    vec3 c = mix(uCool, uYoung, smoothstep(0.35, 1.0, x)) * density * (0.35 + 0.65 * column) * edge;
    gl_FragColor = vec4(c * uLevel * uFade, 1.0);
    #include <colorspace_fragment>
  }`;

const SHELL_FRAGMENT = /* glsl */ `
  uniform float uR;          // radius of the sphere, local units
  uniform float uHalf;       // half size of the square, local units
  uniform float uTurn;       // radians: the sphere turns very slowly
  uniform float uPxPerUnit;
  uniform float uGlow;       // 0..1: a point of light when the universe is tiny
  uniform float uFade;
  uniform vec3 uLow;
  uniform vec3 uHigh;
  uniform vec3 uRim;
  varying vec2 vP;

  float hash13(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.zyx + 31.32);
    return fract((p.x + p.y) * p.z);
  }
  float noise3(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    float a = mix(mix(hash13(i), hash13(i + vec3(1, 0, 0)), u.x), mix(hash13(i + vec3(0, 1, 0)), hash13(i + vec3(1, 1, 0)), u.x), u.y);
    float b = mix(mix(hash13(i + vec3(0, 0, 1)), hash13(i + vec3(1, 0, 1)), u.x), mix(hash13(i + vec3(0, 1, 1)), hash13(i + vec3(1, 1, 1)), u.x), u.y);
    return mix(a, b, u.z) * 2.0 - 1.0;
  }
  // Spots of the oldest light: fade to the mean before they are smaller than a couple of pixels.
  float spots(vec3 p, float px) {
    float sum = 0.0;
    float amp = 0.55;
    float f = 11.0;
    for (int i = 0; i < 4; i++) {
      float keep = 1.0 - smoothstep(0.2, 0.5, f * px);
      sum += amp * keep * noise3(p * f + float(i) * 11.7);
      f *= 2.1;
      amp *= 0.55;
    }
    return sum;
  }
  vec3 turn(vec3 p) {
    float c = cos(uTurn);
    float s = sin(uTurn);
    return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
  }

  void main() {
    vec2 p = vP * (uHalf / uR);
    float rho = length(p);
    float px = fwidth(rho);
    vec3 c = vec3(0.0);
    if (rho < 1.0) {
      float mu = sqrt(1.0 - rho * rho);
      // A thin shell seen at a slant is brighter: towards the rim the line of sight crosses more of it.
      float slant = min(1.0 / max(mu, 0.06), 9.0);
      float front = spots(turn(vec3(p, mu)), px);
      float back = spots(turn(vec3(p, -mu)), px);
      vec3 cf = mix(uLow, uHigh, smoothstep(-0.45, 0.45, front));
      vec3 cb = mix(uLow, uHigh, smoothstep(-0.45, 0.45, back));
      // Only towards the rim (the web shows through the face; between the two, the dark band).
      c = (cf * 0.9 + cb * 0.45) * 0.004 * slant * slant * smoothstep(0.8, 0.98, rho);
    }
    // The edge itself, and a breath of light just outside it.
    float line = exp(-pow((rho - 1.0) / max(px * 1.3, 1e-4), 2.0));
    float halo = step(1.0, rho) * exp(-(rho - 1.0) / 0.018) * 0.12;
    c += uRim * (0.45 * line + halo);
    // When the universe has become a point: light, not size.
    float dpx = rho * uR * uPxPerUnit;
    c += uRim * uGlow * (0.7 * exp(-dpx / 2.4) + 0.12 / (1.0 + dpx * dpx / 50.0)) * (1.0 - smoothstep(14.0, 30.0, dpx));
    gl_FragColor = vec4(c * uFade, 1.0);
    #include <colorspace_fragment>
  }`;

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function linear(hex: string): Vector3 {
  const n = parseInt(hex.slice(1), 16);
  const lin = (v: number): number => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return new Vector3(lin((n >> 16) & 255), lin((n >> 8) & 255), lin(n & 255));
}

const PALETTES = {
  // Warm and pale, like light that has travelled for almost 14 billion years.
  peach: { low: '#5a3a4a', high: '#f3d2bd', rim: '#f6dfcf' },
  // From deep blue to pale peach, like the maps of the Planck satellite.
  planck: { low: '#1d3f8f', high: '#f2c9a8', rim: '#f2dccd' },
} as const;

export default asyncSketch(async (s) => {
  const data = await webData();
  const perMly = s.units(1e6 * LY);
  const radius = s.units(OBSERVABLE_UNIVERSE_RADIUS_LY * LY);
  const galaxies = s.units(FIRST_GALAXIES_LY * LY);

  // The web as a picture, repeated: the same tile as the galaxies of `rete-cosmica`.
  const { width } = data.texture;
  const texture = new DataTexture(data.texture.data, width, width, RedFormat, UnsignedByteType);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  s.onDispose(() => texture.dispose());

  const { origin, rotation, tile } = data.frame;
  const inverse = new Matrix3().set(Math.cos(rotation), Math.sin(rotation), 0, -Math.sin(rotation), Math.cos(rotation), 0, 0, 0, 1);
  const webMaterial = new ShaderMaterial({
    uniforms: {
      uWeb: { value: texture },
      uTile: { value: tile * perMly },
      uOrigin: { value: new Vector2(origin[0] * perMly, origin[1] * perMly) },
      uInverse: { value: inverse },
      uGalaxies: { value: galaxies },
      uLevel: { value: 0.05 },
      uFade: { value: 1 },
      uCool: { value: linear('#b9c8ff') },
      uYoung: { value: linear('#9fb2ff') },
    },
    vertexShader: QUAD_VERTEX,
    fragmentShader: WEB_FRAGMENT,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const web = new Mesh(new PlaneGeometry(galaxies * 2.05, galaxies * 2.05), webMaterial);
  web.frustumCulled = false;
  web.renderOrder = 1;

  const palette = PALETTES[PALETTE];
  const shellMaterial = new ShaderMaterial({
    uniforms: {
      uR: { value: radius },
      uHalf: { value: radius * 1.12 },
      uTurn: { value: 0 },
      uPxPerUnit: { value: 1 },
      uGlow: { value: 0 },
      uFade: { value: 1 },
      uLow: { value: linear(palette.low) },
      uHigh: { value: linear(palette.high) },
      uRim: { value: linear(palette.rim) },
    },
    vertexShader: QUAD_VERTEX,
    fragmentShader: SHELL_FRAGMENT,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const shell = new Mesh(new PlaneGeometry(2, 2), shellMaterial);
  shell.frustumCulled = false;
  shell.renderOrder = 2;
  s.scene.add(web, shell);

  s.every((frame) => {
    const e = frame.e;
    // The picture takes over from the galaxies of `rete-cosmica` as they become finer than pixels.
    const grain = smoothstep(25.75, 26.35, e);
    webMaterial.uniforms.uLevel!.value = 0.05 * grain;
    webMaterial.uniforms.uFade!.value = frame.fade;
    web.visible = grain * frame.fade > 0.003;
    // The shell, and its point of light once it is only a few pixels wide.
    const radiusPx = radius * frame.pxPerUnit;
    const glow = 1 - smoothstep(6, 26, radiusPx);
    const half = Math.max(radius * 1.12, 32 / Math.max(frame.pxPerUnit, 1e-12));
    shell.scale.set(half, half, 1);
    const u = shellMaterial.uniforms;
    u.uHalf!.value = half;
    u.uPxPerUnit!.value = frame.pxPerUnit;
    u.uGlow!.value = glow;
    u.uFade!.value = frame.fade;
    u.uTurn!.value = frame.isStatic || s.ctx.reducedMotion ? 0.6 : 0.6 + frame.time * 0.004;
  });
});
