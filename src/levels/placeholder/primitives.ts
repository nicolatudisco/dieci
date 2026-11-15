/**
 * Small drawing kit shared by the placeholder levels: flat soft shapes, thin rings and
 * points of light. Everything is resolution independent (edges are antialiased in the
 * shader, ring lines keep a constant width in pixels at any zoom).
 *
 * Fade convention: every material made here reads the same `uFade` uniform object, so a
 * level fades all its content by writing `shared.uFade.value = frame.fade` once per frame.
 */
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Mesh,
  NormalBlending,
  PlaneGeometry,
  Points,
  ShaderMaterial,
  Vector2,
  type ColorRepresentation,
  type IUniform,
  type Object3D,
} from 'three';

export interface SharedUniforms {
  uFade: IUniform<number>;
  uPixelRatio: IUniform<number>;
  uTime: IUniform<number>;
}

export function sharedUniforms(): SharedUniforms {
  return { uFade: { value: 1 }, uPixelRatio: { value: 1 }, uTime: { value: 0 } };
}

/** Deterministic pseudo-random generator: the same seed always draws the same scene. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ───────────────────────────────────────────────────────────────────────────── shapes

const SHAPE_VERTEX = /* glsl */ `
  varying vec2 vP;
  varying vec2 vWorld;
  void main() {
    vP = position.xy;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xy;
    gl_Position = projectionMatrix * viewMatrix * world;
  }`;

const SHAPE_FRAGMENT = /* glsl */ `
  uniform int uKind;        // 0 rounded box, 1 ellipse, 2 ring
  uniform vec2 uHalf;       // half size in local units
  uniform float uRadius;    // corner radius (box) or radius (ring)
  uniform float uSoft;      // softness of the edge, in local units
  uniform float uLine;      // ring: line width in CSS pixels
  uniform vec3 uColor;
  uniform vec3 uRim;        // colour of the edge that faces the light
  uniform float uRimWidth;  // local units, 0 = no rim
  uniform float uRimStrength;
  uniform vec2 uLight;      // unit vector towards the light, in screen axes
  uniform vec2 uMask;       // radial mask around the level origin (inner, outer); 0 = off
  uniform float uOpacity;
  uniform float uFade;
  uniform float uPixelRatio;
  varying vec2 vP;
  varying vec2 vWorld;

  float sdBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }
  float sdEllipse(vec2 p, vec2 r) {
    float k0 = length(p / r);
    float k1 = length(p / (r * r));
    return k0 * (k0 - 1.0) / max(k1, 1e-6);
  }

  void main() {
    vec3 color = uColor;
    float alpha;
    if (uKind == 2) {
      // Derivative of the SIGNED distance: the absolute value has a kink on the line itself.
      float signed_ = length(vP) - uRadius;
      float px = fwidth(signed_);
      float half_ = 0.5 * uLine * uPixelRatio * px;
      alpha = 1.0 - smoothstep(half_ - 0.5 * px, half_ + 0.5 * px, abs(signed_));
    } else {
      float d = uKind == 1 ? sdEllipse(vP, uHalf) : sdBox(vP, uHalf, uRadius);
      float px = fwidth(d);
      alpha = 1.0 - smoothstep(-0.5 * uSoft - px, 0.5 * uSoft + px, d);
      if (uRimWidth > 0.0) {
        vec2 n = normalize(vec2(dFdx(d), dFdy(d)) + 1e-9);
        float rim = smoothstep(-uRimWidth, 0.0, d) * max(dot(n, uLight), 0.0);
        color = mix(color, uRim, rim * uRimStrength);
      }
    }
    if (uMask.y > 0.0) alpha *= 1.0 - smoothstep(uMask.x, uMask.y, length(vWorld));
    gl_FragColor = vec4(color, alpha * uOpacity * uFade);
    #include <colorspace_fragment>
  }`;

export interface ShapeOptions {
  kind: 'box' | 'ellipse' | 'ring';
  /** Half size in local units. For a ring only `half[0]` is used, as the radius. */
  half: readonly [number, number];
  /** Corner radius of a box. A box with `radius = min(half)` is a capsule. */
  radius?: number;
  color: ColorRepresentation;
  opacity?: number;
  /** Softness of the edge in local units (shadows, glows). */
  soft?: number;
  /** Ring line width in CSS pixels. */
  line?: number;
  /** Warm edge on the side that faces the light. `strength` 0..1, default 1. */
  rim?: { color: ColorRepresentation; width: number; light: readonly [number, number]; strength?: number };
  /** Fades the shape out between these two distances from the level origin. */
  mask?: readonly [number, number];
  additive?: boolean;
  /** Higher is drawn later (on top). */
  order?: number;
}

export function makeShape(options: ShapeOptions, shared: SharedUniforms): Mesh {
  const ring = options.kind === 'ring';
  const [hx, hy] = options.half;
  const soft = options.soft ?? 0;
  const padX = ring ? hx * 0.3 : soft + hx * 0.04;
  const padY = ring ? hx * 0.3 : soft + hy * 0.04;
  const light = options.rim?.light ?? [0, 1];
  const lightLength = Math.hypot(light[0], light[1]) || 1;

  const material = new ShaderMaterial({
    uniforms: {
      ...shared,
      uKind: { value: ring ? 2 : options.kind === 'ellipse' ? 1 : 0 },
      uHalf: { value: new Vector2(hx, hy) },
      uRadius: { value: ring ? hx : Math.min(options.radius ?? 0, Math.min(hx, hy)) },
      uSoft: { value: soft },
      uLine: { value: options.line ?? 1.25 },
      uColor: { value: new Color(options.color) },
      uRim: { value: new Color(options.rim?.color ?? options.color) },
      uRimWidth: { value: options.rim?.width ?? 0 },
      uRimStrength: { value: options.rim?.strength ?? 1 },
      uLight: { value: new Vector2(light[0] / lightLength, light[1] / lightLength) },
      uMask: { value: new Vector2(options.mask?.[0] ?? 0, options.mask?.[1] ?? 0) },
      uOpacity: { value: options.opacity ?? 1 },
    },
    vertexShader: SHAPE_VERTEX,
    fragmentShader: SHAPE_FRAGMENT,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: options.additive ? AdditiveBlending : NormalBlending,
  });
  const size = ring ? [2 * (hx + padX), 2 * (hx + padX)] : [2 * (hx + padX), 2 * (hy + padY)];
  const mesh = new Mesh(new PlaneGeometry(size[0], size[1]), material);
  mesh.renderOrder = options.order ?? 0;
  return mesh;
}

// ───────────────────────────────────────────────────────────────────────────── points

const DOTS_VERTEX = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aPhase;
  uniform float uPixelRatio;
  uniform float uTime;
  uniform float uSizeScale;
  varying vec3 vColor;
  varying float vTwinkle;
  void main() {
    vColor = aColor;
    // Constant at uTime = 0, so static screenshots are complete and reproducible.
    vTwinkle = 0.82 + 0.18 * sin(uTime * (0.5 + aPhase * 1.3) + aPhase * 6.2831853);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = max(1.0, aSize * uSizeScale * uPixelRatio);
  }`;

const DOTS_FRAGMENT = /* glsl */ `
  uniform float uFade;
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vTwinkle;
  void main() {
    float r = length(gl_PointCoord - 0.5) * 2.0;
    float core = 1.0 - smoothstep(0.0, 0.45, r);
    float halo = pow(max(0.0, 1.0 - r), 2.2);
    float alpha = (core * 0.7 + halo * 0.5) * vTwinkle * uOpacity * uFade;
    gl_FragColor = vec4(vColor, alpha);
    #include <colorspace_fragment>
  }`;

export interface DotsData {
  /** xyz in local units. */
  positions: Float32Array;
  /** Diameter in CSS pixels. */
  sizes: Float32Array;
  /** Linear RGB, 0..1. */
  colors: Float32Array;
  /** 0..1, decorrelates the twinkle. */
  phases: Float32Array;
}

/** Points of light with a soft halo, additive, constant size in pixels. */
export function makeDots(data: DotsData, shared: SharedUniforms, opacity = 1): Points {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(data.positions, 3));
  geometry.setAttribute('aSize', new BufferAttribute(data.sizes, 1));
  geometry.setAttribute('aColor', new BufferAttribute(data.colors, 3));
  geometry.setAttribute('aPhase', new BufferAttribute(data.phases, 1));
  const material = new ShaderMaterial({
    uniforms: { ...shared, uSizeScale: { value: 1 }, uOpacity: { value: opacity } },
    vertexShader: DOTS_VERTEX,
    fragmentShader: DOTS_FRAGMENT,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const points = new Points(geometry, material);
  // The camera sits inside the cloud while zooming: never cull it as a whole.
  points.frustumCulled = false;
  return points;
}

/** Frees the GPU resources of everything under `root`. */
export function disposeTree(root: Object3D): void {
  root.traverse((object) => {
    const item = object as Partial<Mesh>;
    item.geometry?.dispose();
    const material = item.material;
    if (Array.isArray(material)) for (const m of material) m.dispose();
    else material?.dispose();
  });
}
