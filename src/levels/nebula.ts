/**
 * Clouds of gas and dust, and the field of stars around the Sun, for `nebulose` (M5).
 *
 * - `makeNebula`: one cloud on a square, procedural, with detail limited by the resolution:
 *   pink glowing gas (emission), blue dust lit by stars (reflection), dark dust that hides
 *   what is behind it (dark), the faint pink ring of a bubble blown by old stars (shell).
 *   Tiny clouds keep a halo of a few pixels: light, not size.
 * - `makeStarField`: stars at fixed places of the plane, in layers of cells that double in
 *   size; at any zoom the layer whose cells are about 22 pixels wide is shown and its
 *   neighbours fade, so the screen always holds about as many stars, and the ones that stay
 *   while the view widens are the brightest. They are the brightest of the millions of stars
 *   around the Sun: the rest is the faint glow of the galaxy behind. None inside the bubble.
 * - `orionLens`: the Orion Nebula as photographs show it, for its lens.
 */
import {
  AdditiveBlending,
  CustomBlending,
  Mesh,
  NormalBlending,
  OneFactor,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector3,
} from 'three';
import type { Nebula } from '../content/cosmos.ts';

function linear(hex: string): Vector3 {
  const n = parseInt(hex.slice(1), 16);
  const lin = (v: number): number => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return new Vector3(lin((n >> 16) & 255), lin((n >> 8) & 255), lin(n & 255));
}

const NOISE = /* glsl */ `
  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y) * 2.0 - 1.0;
  }
  // Octaves fade to their mean before they get finer than about two pixels ('px' in the same units as p).
  float fbm(vec2 p, float px, float seed) {
    float sum = 0.0;
    float amp = 0.5;
    float f = 1.0;
    for (int i = 0; i < 6; i++) {
      float keep = 1.0 - smoothstep(0.16, 0.42, f * px);
      sum += amp * keep * noise(p * f + vec2(seed + float(i) * 13.7, -seed + float(i) * 5.3));
      f *= 2.07;
      amp *= 0.55;
    }
    return sum;
  }`;

const QUAD_VERTEX = /* glsl */ `
  varying vec2 vP;
  void main() {
    vP = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;

const NEBULA_FRAGMENT = /* glsl */ `
  uniform int uKind;          // 0 emission, 1 reflection, 2 dark, 3 shell
  uniform float uHalf;        // half size of the square, in radii of the cloud
  uniform float uRadiusPx;    // radius of the cloud in CSS pixels
  uniform float uSquash;
  uniform float uSeed;
  uniform float uFade;
  uniform vec3 uColor;
  uniform vec3 uCore;
  varying vec2 vP;
  ${NOISE}
  void main() {
    vec2 p = vP * uHalf;                       // in radii of the cloud
    float px = length(fwidth(p)) * 0.7071;     // radii per device pixel
    vec2 e = vec2(p.x, p.y / uSquash);
    vec2 w = e + 0.45 * vec2(fbm(e * 1.3 + 2.0, px * 1.3, uSeed), fbm(e * 1.3 - 4.0, px * 1.3, uSeed + 3.0));
    float d = length(w);
    float n = fbm(w * 2.4, px * 2.4, uSeed + 7.0);
    float ridge = 1.0 - abs(fbm(w * 3.6 + 1.7, px * 3.6, uSeed + 11.0));
    // The halo of a cloud that is only a few pixels wide (light, not size).
    float dpx = length(p) * uRadiusPx;
    float small = 1.0 - smoothstep(3.0, 14.0, uRadiusPx);
    float halo = small * exp(-dpx / 2.2);
    if (uKind == 2) {
      float a = smoothstep(0.0, 0.9, exp(-d * d * 1.5) * (0.75 + 0.9 * n) - 0.12);
      // The edge of the dust, faintly lit by the stars nearby: warm brown, darker inside.
      float rim = smoothstep(0.05, 0.4, a) * (1.0 - smoothstep(0.45, 0.95, a)) * (0.6 + 0.8 * max(0.0, ridge - 0.3));
      vec3 c = mix(uColor * 0.12, uColor, rim);
      gl_FragColor = vec4(c, 0.75 * a * uFade);
    } else if (uKind == 3) {
      float broken = smoothstep(-0.25, 0.35, n);
      float ring = exp(-pow((d - 0.9) / 0.15, 2.0)) * broken * (0.6 + 0.6 * ridge);
      ring += 0.08 * exp(-d * d * 1.4) * max(0.0, n);
      gl_FragColor = vec4(uColor * ring, 1.0);
      gl_FragColor.rgb *= uFade;
    } else {
      float body = exp(-d * d * 2.0) * max(0.0, 0.55 + 1.1 * n) + 0.5 * exp(-d * d * 3.5) * pow(ridge, 3.0);
      float core = exp(-dot(p, p) * 30.0);
      vec3 c = uColor * body + uCore * core * 0.8 + mix(uColor, uCore, 0.5) * halo;
      gl_FragColor = vec4(c * uFade, 1.0);
    }
    #include <colorspace_fragment>
  }`;

const STYLES: Record<Nebula['kind'], { color: string; core: string; level: number }> = {
  emission: { color: '#e2507f', core: '#ffd6e4', level: 0.9 },
  reflection: { color: '#5f86ff', core: '#d8e4ff', level: 0.7 },
  dark: { color: '#4a2c26', core: '#4a2c26', level: 1 },
  shell: { color: '#b84a73', core: '#b84a73', level: 0.12 },
};
const KIND: Record<Nebula['kind'], number> = { emission: 0, reflection: 1, dark: 2, shell: 3 };

export interface Cloud {
  readonly mesh: Mesh;
  readonly kind: Nebula['kind'];
  /** Once a frame: CSS pixels per local unit and the opacity. */
  update(pxPerUnit: number, fade: number): void;
}

/** A cloud of radius `radius` (local units) at the origin of its mesh. */
export function makeNebula(nebula: Nebula, radius: number, seed: number): Cloud {
  const style = STYLES[nebula.kind];
  const kind = KIND[nebula.kind];
  const color = linear(style.color).multiplyScalar(style.level);
  const material = new ShaderMaterial({
    uniforms: {
      uKind: { value: kind },
      uHalf: { value: 1.6 },
      uRadiusPx: { value: 10 },
      uSquash: { value: nebula.squash ?? 1 },
      uSeed: { value: seed },
      uFade: { value: 1 },
      uColor: { value: color },
      uCore: { value: linear(style.core) },
    },
    vertexShader: QUAD_VERTEX,
    fragmentShader: NEBULA_FRAGMENT,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: nebula.kind === 'dark' ? NormalBlending : AdditiveBlending,
  });
  const mesh = new Mesh(new PlaneGeometry(2, 2), material);
  mesh.rotation.z = ((nebula.angle ?? 0) * Math.PI) / 180;
  mesh.frustumCulled = false;
  const u = material.uniforms;
  return {
    mesh,
    kind: nebula.kind,
    update(pxPerUnit, fade) {
      const radiusPx = radius * pxPerUnit;
      // A tiny bright cloud keeps a halo of a few pixels: the square grows to hold it.
      const halfPx = kind === 0 || kind === 1 ? Math.max(1.6 * radiusPx, 12) : 1.6 * radiusPx;
      const half = halfPx / Math.max(pxPerUnit, 1e-12);
      mesh.scale.set(half, half, 1);
      u.uHalf!.value = half / radius;
      u.uRadiusPx!.value = radiusPx;
      u.uFade!.value = fade;
      mesh.visible = fade > 0.003;
    },
  };
}

// ───────────────────────────────────────────────────────────────────────── the stars

const STARS_FRAGMENT = /* glsl */ `
  uniform float uFade;
  uniform float uTime;
  uniform float uCellPx;      // target size of a cell on screen, CSS pixels
  uniform float uPixelRatio;
  uniform float uHole;        // no star closer than this to the origin (local units)
  uniform float uDensity;     // 0..1 share of cells with a star (adaptive quality)
  varying vec2 vWorld;
  ${NOISE}

  // The star of one cell of one layer, as light at the point 'w'.
  vec3 star(vec2 w, vec2 cell, float size, float layer, float pxW) {
    vec2 id = cell + vec2(layer * 131.0, layer * 71.0);
    float h = hash12(id);
    if (h > uDensity) return vec3(0.0);
    vec2 at = (cell + 0.15 + 0.7 * vec2(hash12(id + 1.7), hash12(id + 8.3))) * size;
    float b = hash12(id + 4.1);
    b = b * b * b * b;
    float dpx = length(w - at) / pxW;
    float rpx = 0.5 + 1.35 * b;
    float light = exp(-dpx * dpx / (rpx * rpx)) * (0.22 + 1.0 * b) + 0.12 * b * exp(-dpx / (2.0 + 3.0 * b));
    float t = hash12(id + 2.9);
    vec3 tint = t < 0.15 ? vec3(1.0, 0.72, 0.5) : t < 0.45 ? vec3(1.0, 0.93, 0.82) : t < 0.85 ? vec3(0.85, 0.9, 1.0) : vec3(0.65, 0.78, 1.0);
    float twinkle = 0.85 + 0.15 * sin(uTime * (0.6 + h) + h * 40.0);
    return tint * light * twinkle;
  }

  void main() {
    vec2 w = vWorld;
    float pxW = length(fwidth(w)) * 0.7071 * uPixelRatio;   // local units per CSS pixel
    float level = log2(max(uCellPx * pxW, 1e-9));
    float k0 = floor(level);
    float t = level - k0;
    vec3 sum = vec3(0.0);
    for (int j = 0; j < 2; j++) {
      float k = k0 + float(j);
      float weight = j == 0 ? 1.0 - t : t;
      float size = exp2(k);
      vec2 g = w / size;
      vec2 base = floor(g - 0.5);
      for (int y = 0; y < 2; y++) {
        for (int x = 0; x < 2; x++) {
          sum += weight * star(w, base + vec2(float(x), float(y)), size, k, pxW);
        }
      }
    }
    // Clumpy: clouds of stars and thinner places.
    float clumps = max(0.0, 0.6 + 0.9 * fbm(w * 0.12, pxW * 0.12, 4.0));
    float hole = smoothstep(uHole, uHole * 1.8, length(w));
    gl_FragColor = vec4(sum * clumps * hole * uFade, 1.0);
    #include <colorspace_fragment>
  }`;

const STARS_VERTEX = /* glsl */ `
  varying vec2 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xy;
    gl_Position = projectionMatrix * viewMatrix * world;
  }`;

export interface StarField {
  readonly mesh: Mesh;
  /** Once a frame: the camera position (to keep the square under it), the view width, and the look. */
  update(cameraX: number, cameraY: number, viewWidth: number, fade: number, time: number, pixelRatio: number, quality: number): void;
}

/** The field of stars, in the plane z = 0 of the level, with no star within `hole` local units of the origin. */
export function makeStarField(hole: number): StarField {
  const material = new ShaderMaterial({
    uniforms: {
      uFade: { value: 1 },
      uTime: { value: 0 },
      uCellPx: { value: 26 },
      uPixelRatio: { value: 1 },
      uHole: { value: hole },
      uDensity: { value: 0.5 },
    },
    vertexShader: STARS_VERTEX,
    fragmentShader: STARS_FRAGMENT,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const mesh = new Mesh(new PlaneGeometry(1, 1), material);
  mesh.frustumCulled = false;
  const u = material.uniforms;
  return {
    mesh,
    update(cameraX, cameraY, viewWidth, fade, time, pixelRatio, quality) {
      // Wide enough for any shape of screen.
      const size = viewWidth * 7;
      mesh.position.set(cameraX, cameraY, 0);
      mesh.scale.set(size, size, 1);
      u.uFade!.value = fade;
      u.uTime!.value = time;
      u.uPixelRatio!.value = pixelRatio;
      u.uDensity!.value = 0.3 + 0.2 * quality;
      mesh.visible = fade > 0.003;
    },
  };
}

// ──────────────────────────────────────────────────────────────── the Orion Nebula

const ORION_FRAGMENT = /* glsl */ `
  uniform float uTime;
  varying vec2 vP;
  ${NOISE}
  void main() {
    vec2 p = vP;                                   // the field is 2 wide, the Trapezium at the origin
    float px = length(fwidth(p)) * 0.7071;
    vec2 w = p + 0.18 * vec2(fbm(p * 2.2 + 1.0, px * 2.2, 2.0), fbm(p * 2.2 - 3.0, px * 2.2, 5.0));
    // The wings: two lobes that open downwards and to the sides, like a bird with open wings.
    float wingL = exp(-pow(length((w - vec2(-0.32, -0.22)) * vec2(1.0, 1.45)), 2.0) * 3.2);
    float wingR = exp(-pow(length((w - vec2(0.36, -0.3)) * vec2(1.1, 1.3)), 2.0) * 3.0);
    float heart = exp(-dot(w, w) * 9.0);
    float n = fbm(w * 3.2, px * 3.2, 9.0);
    float ridge = 1.0 - abs(fbm(w * 4.5 + 2.3, px * 4.5, 13.0));
    float gas = (wingL + wingR) * max(0.0, 0.6 + 0.9 * n) + 0.45 * pow(ridge, 4.0) * (wingL + wingR + heart);
    // The dark bay that cuts into the bright heart from the east (the «fish's mouth»).
    float bay = exp(-pow(length((p - vec2(-0.2, 0.06)) * vec2(1.0, 2.2)), 2.0) * 22.0);
    gas *= 1.0 - 0.75 * bay;
    // M43, the small comma just to the north.
    float m43 = exp(-pow(length((w - vec2(0.02, 0.55)) * vec2(1.3, 1.0)), 2.0) * 30.0) * (0.7 + 0.5 * n);
    vec3 pink = vec3(0.95, 0.22, 0.42);
    vec3 rose = vec3(1.0, 0.55, 0.62);
    vec3 teal = vec3(0.45, 0.85, 0.9);
    vec3 c = pink * gas * 0.9 + rose * gas * gas * 0.35 + teal * heart * (0.9 + 0.3 * n) * (1.0 - 0.6 * bay) + pink * m43 * 0.8;
    // Faint dust around: the rest of the cloud of Orion.
    c += vec3(0.25, 0.09, 0.14) * max(0.0, fbm(p * 1.4 + 7.0, px * 1.4, 21.0) + 0.1) * 0.5;
    gl_FragColor = vec4(c, 0.0);
    #include <colorspace_fragment>
  }`;

/** The four stars of the Trapezium, which light the nebula from inside, and a few around. */
const TRAPEZIUM: readonly [number, number, number][] = [
  [0.0, 0.02, 1],
  [0.035, -0.012, 0.8],
  [-0.03, -0.02, 0.75],
  [0.012, -0.045, 0.6],
  [-0.62, 0.48, 0.45],
  [0.7, 0.35, 0.4],
  [0.52, -0.68, 0.35],
  [-0.75, -0.6, 0.3],
  [0.15, 0.82, 0.3],
];

const TRAPEZIUM_FRAGMENT = /* glsl */ `
  uniform vec3 uStars[${TRAPEZIUM.length}];
  varying vec2 vP;
  void main() {
    float px = length(fwidth(vP)) * 0.7071;
    vec3 c = vec3(0.0);
    for (int i = 0; i < ${TRAPEZIUM.length}; i++) {
      vec3 s = uStars[i];
      float d = length(vP - s.xy) / px;
      float r = 1.0 + 1.6 * s.z;
      c += vec3(0.85, 0.92, 1.0) * s.z * (exp(-d * d / (r * r)) * 1.2 + 0.25 * exp(-d / (3.0 * r)));
    }
    gl_FragColor = vec4(c, 0.0);
    #include <colorspace_fragment>
  }`;

/** The scene inside the lens of the Orion Nebula: field width 2.2, centred on the origin. */
export function orionLens(): Scene {
  const scene = new Scene();
  const additive = { transparent: true, depthTest: false, depthWrite: false, blending: CustomBlending, blendSrc: OneFactor, blendDst: OneFactor } as const;
  const gas = new Mesh(new PlaneGeometry(2.4, 2.4), new ShaderMaterial({ uniforms: { uTime: { value: 0 } }, vertexShader: QUAD_VERTEX, fragmentShader: ORION_FRAGMENT, ...additive }));
  const stars = new Mesh(
    new PlaneGeometry(2.4, 2.4),
    new ShaderMaterial({ uniforms: { uStars: { value: TRAPEZIUM.map(([x, y, b]) => new Vector3(x, y, b)) } }, vertexShader: QUAD_VERTEX, fragmentShader: TRAPEZIUM_FRAGMENT, ...additive }),
  );
  stars.renderOrder = 1;
  scene.add(gas, stars);
  return scene;
}
