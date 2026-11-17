/**
 * Drawing kit of the geographic levels (M2): roads, rails and rivers as lines, water and
 * green as areas, lamps and windows as points, the night lights of NASA as a picture.
 *
 * Two rules make neighbouring levels coincide without seeing each other:
 * - every layer is drawn with MAX blending (each channel keeps the brighter of what is
 *   there and what arrives). Light on the night never piles up where lines overlap, and a
 *   level that fades out over a neighbour drawing the same roads simply vanishes into it;
 * - the look of the roads depends only on the exponent (`roadLook`), not on the level.
 *
 * Lines have their true width (a road is as wide as the real one), but never less than a
 * minimum in pixels: at 100 m they are streets, at 10 km threads of light. A line thinner
 * than its true width would allow is dimmed in proportion, so small streets stay quiet.
 */
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  CustomBlending,
  AdditiveBlending,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  MaxEquation,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  ShapeUtils,
  Vector2,
  Vector3,
  Vector4,
  type ColorRepresentation,
  type IUniform,
  type Texture,
} from 'three';
import type { LevelFrame } from '../../engine/level.ts';
import type { Box, GeoArea, GeoLine } from './format.ts';

export interface GeoUniforms {
  uFade: IUniform<number>;
  uPixelRatio: IUniform<number>;
  uPxPerUnit: IUniform<number>;
  uTime: IUniform<number>;
  /** Soft rectangular mask, local units: x0, y0, x1, y1. */
  uMask: IUniform<Vector4>;
  /** Width of the soft edge of the mask, local units. */
  uMaskSoft: IUniform<number>;
  /** Round soft edge, local units: centre x, centre y, inner and outer radius (outer 0 = off). */
  uRound: IUniform<Vector4>;
}

/** `box` in metres from the starting point; `unit` metres per local unit. */
export function geoUniforms(box: Box, soft: number, unit: number): GeoUniforms {
  return {
    uFade: { value: 1 },
    uPixelRatio: { value: 1 },
    uPxPerUnit: { value: 1 },
    uTime: { value: 0 },
    uMask: { value: new Vector4(box[0] / unit, box[1] / unit, box[2] / unit, box[3] / unit) },
    uMaskSoft: { value: soft / unit },
    uRound: { value: new Vector4(0, 0, 0, 0) },
  };
}

export function updateGeoUniforms(u: GeoUniforms, frame: LevelFrame): void {
  u.uFade.value = frame.fade;
  u.uPixelRatio.value = frame.pixelRatio;
  u.uPxPerUnit.value = frame.pxPerUnit;
  u.uTime.value = frame.time;
}

const MASK_GLSL = /* glsl */ `
  uniform vec4 uMask;
  uniform float uMaskSoft;
  uniform vec4 uRound;
  float boxMask(vec2 p) {
    vec2 d = min(p - uMask.xy, uMask.zw - p);
    float edge = min(d.x, d.y);
    float m = smoothstep(0.0, uMaskSoft, edge);
    if (uRound.w > 0.0) m *= 1.0 - smoothstep(uRound.z, uRound.w, length(p - uRound.xy));
    return m;
  }`;

/** Max blending: see the comment at the top. Colours must be premultiplied by alpha. */
function maxBlend(material: ShaderMaterial): ShaderMaterial {
  material.blending = CustomBlending;
  material.blendEquation = MaxEquation;
  material.blendEquationAlpha = MaxEquation;
  material.transparent = true;
  material.depthTest = false;
  material.depthWrite = false;
  return material;
}

// ───────────────────────────────────────────────────────────────────────────── palettes

/** Up to 16 classes per layer (road classes with the bridge bit). */
export const PALETTE_SIZE = 16;

export interface Palette {
  readonly colors: Vector3[];
  /** Brightness of each class, 0..1 (0 hides the class). */
  readonly gains: number[];
}

function makePalette(): Palette {
  return {
    colors: Array.from({ length: PALETTE_SIZE }, () => new Vector3()),
    gains: Array.from({ length: PALETTE_SIZE }, () => 0),
  };
}

const tmpColor = new Color();

/** Sets class `cls` to a CSS colour (converted to linear) and a brightness. */
export function setClass(p: Palette, cls: number, color: ColorRepresentation, gain = 1): void {
  tmpColor.set(color);
  p.colors[cls]?.set(tmpColor.r, tmpColor.g, tmpColor.b);
  p.gains[cls] = gain;
}

/** Linear interpolation of two CSS colours, as a CSS colour for `setClass`. */
export function mixColor(a: ColorRepresentation, b: ColorRepresentation, t: number): Color {
  return new Color(a).lerp(new Color(b), Math.min(1, Math.max(0, t)));
}

// ───────────────────────────────────────────────────────────────────────────── lines

const LINE_VERTEX = /* glsl */ `
  attribute vec2 aA;
  attribute vec2 aB;
  attribute float aHalf;
  attribute float aClass;
  uniform float uPxPerUnit;
  uniform float uMinPx;
  uniform float uThinDim;
  uniform float uCaps;
  uniform vec3 uColors[${PALETTE_SIZE}];
  uniform float uGains[${PALETTE_SIZE}];
  varying vec2 vWorld;
  varying float vAlong;
  varying float vAcross;
  varying float vLen;
  varying float vHalf;
  varying vec3 vColor;
  void main() {
    vec2 d = aB - aA;
    float len = length(d);
    vec2 t = len > 0.0 ? d / len : vec2(1.0, 0.0);
    vec2 n = vec2(-t.y, t.x);
    float minHalf = 0.5 * uMinPx / uPxPerUnit;
    float halfW = max(aHalf, minHalf);
    // One CSS pixel of room for the antialiased edge.
    float h = halfW + 1.0 / uPxPerUnit;
    float atB = step(0.5, position.x);
    float cap = uCaps * h;
    vec2 p = mix(aA - t * cap, aB + t * cap, atB) + n * position.y * h;
    vAlong = mix(-cap, len + cap, atB);
    vAcross = position.y * h;
    vLen = len;
    vHalf = halfW;
    int k = int(aClass + 0.5);
    float gain = uGains[k] * mix(1.0, clamp(aHalf / halfW, 0.0, 1.0), uThinDim);
    vColor = uColors[k] * gain;
    vec4 world = modelMatrix * vec4(p, 0.0, 1.0);
    vWorld = world.xy;
    gl_Position = projectionMatrix * viewMatrix * world;
  }`;

const LINE_FRAGMENT = /* glsl */ `
  ${MASK_GLSL}
  uniform float uPxPerUnit;
  uniform float uPixelRatio;
  uniform float uFade;
  uniform float uOpacity;
  uniform float uSoft;
  varying vec2 vWorld;
  varying float vAlong;
  varying float vAcross;
  varying float vLen;
  varying float vHalf;
  varying vec3 vColor;
  void main() {
    float beyond = vAlong < 0.0 ? -vAlong : max(vAlong - vLen, 0.0);
    float dist = length(vec2(beyond, vAcross));
    float px = 1.0 / (uPxPerUnit * uPixelRatio);
    float solid = 1.0 - smoothstep(vHalf - 0.5 * px, vHalf + 0.5 * px, dist);
    // A soft line is brightest on its axis and fades out at its half width.
    float soft = exp(-3.0 * (dist * dist) / (vHalf * vHalf));
    float a = mix(solid, soft, uSoft) * boxMask(vWorld) * uOpacity * uFade;
    if (a <= 0.002) discard;
    gl_FragColor = vec4(vColor * a, a);
    #include <colorspace_fragment>
  }`;

export interface LineStyle {
  /** Minimum width in CSS pixels. */
  readonly minPx: number;
  /** Multiplies the true width (1 = true). */
  readonly widthScale?: number;
  /** 0: thin lines keep full brightness; 1: dimmed by how much thinner they are than drawn. */
  readonly thinDim?: number;
  /** 0: solid line with round ends; 1: soft glow, open ends (it is drawn additively). */
  readonly soft?: number;
  readonly opacity?: number;
  /** Lines with no width in the data get this one, in metres. */
  readonly defaultWidth?: number;
  /** Keep only some classes. */
  readonly filter?: (line: GeoLine) => boolean;
}

export interface LineLayer {
  readonly mesh: Mesh;
  readonly palette: Palette;
  readonly material: ShaderMaterial;
  /** Changes the minimum width (in CSS pixels) at run time. */
  setMinPx(px: number): void;
  setOpacity(o: number): void;
  /** Draws only this share (0..1) of the segments or lights: the adaptive quality. */
  setShare(share: number): void;
}

interface Segments {
  readonly a: Float32Array;
  readonly b: Float32Array;
  readonly half: Float32Array;
  readonly cls: Float32Array;
  readonly count: number;
}

function segments(count: number): Segments {
  return { a: new Float32Array(count * 2), b: new Float32Array(count * 2), half: new Float32Array(count), cls: new Float32Array(count), count };
}

interface SegmentStyle {
  readonly minPx: number;
  readonly thinDim: number;
  readonly soft: number;
  readonly caps: boolean;
  readonly additive: boolean;
  readonly opacity: number;
}

/** One instanced quad per segment: thousands of streets (or lights) in one draw call. */
function segmentMesh(seg: Segments, style: SegmentStyle, uniforms: GeoUniforms): LineLayer {
  const geometry = new InstancedBufferGeometry();
  // x: 0 at A, 1 at B; y: side.
  geometry.setAttribute('position', new BufferAttribute(new Float32Array([0, -1, 0, 1, -1, 0, 1, 1, 0, 0, 1, 0]), 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  geometry.setAttribute('aA', new InstancedBufferAttribute(seg.a, 2));
  geometry.setAttribute('aB', new InstancedBufferAttribute(seg.b, 2));
  geometry.setAttribute('aHalf', new InstancedBufferAttribute(seg.half, 1));
  geometry.setAttribute('aClass', new InstancedBufferAttribute(seg.cls, 1));
  geometry.instanceCount = seg.count;

  const palette = makePalette();
  const material = new ShaderMaterial({
    uniforms: {
      ...uniforms,
      uMinPx: { value: style.minPx },
      uThinDim: { value: style.thinDim },
      uCaps: { value: style.caps ? 1 : 0 },
      uSoft: { value: style.soft },
      uOpacity: { value: style.opacity },
      uColors: { value: palette.colors },
      uGains: { value: palette.gains },
    },
    vertexShader: LINE_VERTEX,
    fragmentShader: LINE_FRAGMENT,
  });
  if (style.additive) {
    material.blending = AdditiveBlending;
    material.transparent = true;
    material.depthTest = false;
    material.depthWrite = false;
  } else maxBlend(material);
  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  return {
    mesh,
    palette,
    material,
    setMinPx: (px) => {
      material.uniforms.uMinPx!.value = px;
    },
    setOpacity: (o) => {
      material.uniforms.uOpacity!.value = o;
    },
    setShare: (share) => {
      geometry.instanceCount = Math.max(1, Math.floor(seg.count * share));
    },
  };
}

/** Lines at their true width (never thinner than `minPx`), one draw call per layer. */
export function makeLines(lines: readonly GeoLine[], unit: number, style: LineStyle, uniforms: GeoUniforms): LineLayer {
  let count = 0;
  const keep = style.filter ? lines.filter(style.filter) : lines;
  for (const line of keep) count += Math.max(0, line.points.length / 2 - 1);
  const seg = segments(count);
  const scale = (style.widthScale ?? 1) / unit;
  let k = 0;
  for (const line of keep) {
    const p = line.points;
    const w = 0.5 * (line.width > 0 ? line.width : (style.defaultWidth ?? 0)) * scale;
    for (let i = 0; i + 3 < p.length; i += 2) {
      seg.a[2 * k] = (p[i] ?? 0) / unit;
      seg.a[2 * k + 1] = (p[i + 1] ?? 0) / unit;
      seg.b[2 * k] = (p[i + 2] ?? 0) / unit;
      seg.b[2 * k + 1] = (p[i + 3] ?? 0) / unit;
      seg.half[k] = w;
      seg.cls[k] = line.cls;
      k++;
    }
  }
  const soft = style.soft ?? 0;
  return segmentMesh(seg, { minPx: style.minPx, thinDim: style.thinDim ?? 0, soft, caps: soft === 0, additive: soft > 0, opacity: style.opacity ?? 1 }, uniforms);
}

/** A light on the ground: where (metres), how large (radius in metres) and which class of the palette. */
export interface Light {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly cls: number;
}

export interface LightStyle {
  readonly minPx: number;
  /** 1: a soft glow (pools of lamp light); 0: a sharp dot (a lit window). */
  readonly soft: number;
  readonly opacity?: number;
  /** Additive: lights pile up into a glow. Otherwise max blending. */
  readonly additive?: boolean;
}

/** Round lights at their true size, never smaller than `minPx`. */
export function makeLights(lights: readonly Light[], unit: number, style: LightStyle, uniforms: GeoUniforms): LineLayer {
  const seg = segments(lights.length);
  lights.forEach((l, k) => {
    seg.a[2 * k] = seg.b[2 * k] = l.x / unit;
    seg.a[2 * k + 1] = seg.b[2 * k + 1] = l.y / unit;
    seg.half[k] = l.radius / unit;
    seg.cls[k] = l.cls;
  });
  return segmentMesh(seg, { minPx: style.minPx, thinDim: 0, soft: style.soft, caps: true, additive: style.additive ?? false, opacity: style.opacity ?? 1 }, uniforms);
}

// ───────────────────────────────────────────────────────────────────────────── areas

const AREA_VERTEX = /* glsl */ `
  attribute float aClass;
  uniform vec3 uColors[${PALETTE_SIZE}];
  uniform float uGains[${PALETTE_SIZE}];
  varying vec2 vWorld;
  varying vec3 vColor;
  void main() {
    int k = int(aClass + 0.5);
    vColor = uColors[k] * uGains[k];
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xy;
    gl_Position = projectionMatrix * viewMatrix * world;
  }`;

const AREA_FRAGMENT = /* glsl */ `
  ${MASK_GLSL}
  uniform float uFade;
  uniform float uOpacity;
  varying vec2 vWorld;
  varying vec3 vColor;
  void main() {
    float a = boxMask(vWorld) * uOpacity * uFade;
    gl_FragColor = vec4(vColor * a, a);
    #include <colorspace_fragment>
  }`;

export interface AreaLayer {
  readonly mesh: Mesh;
  readonly palette: Palette;
  setOpacity(o: number): void;
}

/** Filled areas (with holes), triangulated once with the earcut of three.js. */
export function makeAreas(areas: readonly GeoArea[], unit: number, uniforms: GeoUniforms, filter?: (a: GeoArea) => boolean): AreaLayer {
  const positions: number[] = [];
  const classes: number[] = [];
  const toVectors = (ring: Float64Array): Vector2[] => {
    const out: Vector2[] = [];
    for (let i = 0; i + 1 < ring.length; i += 2) out.push(new Vector2((ring[i] ?? 0) / unit, (ring[i + 1] ?? 0) / unit));
    return out;
  };
  for (const area of filter ? areas.filter(filter) : areas) {
    const [outer, ...holes] = area.rings;
    if (!outer || outer.length < 6) continue;
    const contour = toVectors(outer);
    const holeVectors = holes.map(toVectors).filter((h) => h.length >= 3);
    if (ShapeUtils.isClockWise(contour)) contour.reverse();
    for (const h of holeVectors) if (!ShapeUtils.isClockWise(h)) h.reverse();
    const all = [...contour, ...holeVectors.flat()];
    for (const tri of ShapeUtils.triangulateShape(contour, holeVectors)) {
      for (const index of tri) {
        const v = all[index];
        if (!v) continue;
        positions.push(v.x, v.y, 0);
        classes.push(area.cls);
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('aClass', new BufferAttribute(new Float32Array(classes), 1));
  const palette = makePalette();
  const material = maxBlend(
    new ShaderMaterial({
      uniforms: { ...uniforms, uOpacity: { value: 1 }, uColors: { value: palette.colors }, uGains: { value: palette.gains } },
      vertexShader: AREA_VERTEX,
      fragmentShader: AREA_FRAGMENT,
    }),
  );
  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  return {
    mesh,
    palette,
    setOpacity: (o) => {
      material.uniforms.uOpacity!.value = o;
    },
  };
}

// ───────────────────────────────────────────────────────────────────────────── night lights

const NIGHT_VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec2 vWorld;
  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xy;
    gl_Position = projectionMatrix * viewMatrix * world;
  }`;

const NIGHT_FRAGMENT = /* glsl */ `
  ${MASK_GLSL}
  uniform sampler2D uMap;
  uniform float uFade;
  uniform float uOpacity;
  uniform float uFloor;
  uniform float uGamma;
  uniform vec3 uDim;
  uniform vec3 uBright;
  varying vec2 vUv;
  varying vec2 vWorld;
  void main() {
    float v = texture2D(uMap, vUv).r;
    float b = pow(clamp((v - uFloor) / (1.0 - uFloor), 0.0, 1.0), uGamma);
    vec3 color = mix(uDim, uBright, b) * b;
    float a = boxMask(vWorld) * uOpacity * uFade;
    gl_FragColor = vec4(color * a, max(color.r, max(color.g, color.b)) * a);
    #include <colorspace_fragment>
  }`;

export interface NightStyle {
  /** Grey level (0..1) below which there is no light: the faint haze of the source. */
  readonly floor?: number;
  readonly gamma?: number;
  /** Colour of the faint lights and of the brightest ones. */
  readonly dim?: ColorRepresentation;
  readonly bright?: ColorRepresentation;
  readonly opacity?: number;
}

export interface NightLayer {
  readonly mesh: Mesh;
  readonly material: ShaderMaterial;
  setOpacity(o: number): void;
}

/** The picture of the night lights, lying where it belongs on the map. */
export function makeNight(texture: Texture, box: Box, unit: number, uniforms: GeoUniforms, style: NightStyle = {}): NightLayer {
  const [x0, y0, x1, y1] = box;
  const geometry = new PlaneGeometry((x1 - x0) / unit, (y1 - y0) / unit);
  const material = maxBlend(
    new ShaderMaterial({
      uniforms: {
        ...uniforms,
        uMap: { value: texture },
        uOpacity: { value: style.opacity ?? 1 },
        uFloor: { value: style.floor ?? 0.08 },
        uGamma: { value: style.gamma ?? 1.35 },
        uDim: { value: new Color(style.dim ?? '#c9772e') },
        uBright: { value: new Color(style.bright ?? '#ffe7bf') },
      },
      vertexShader: NIGHT_VERTEX,
      fragmentShader: NIGHT_FRAGMENT,
    }),
  );
  const mesh = new Mesh(geometry, material);
  mesh.position.set((x0 + x1) / 2 / unit, (y0 + y1) / 2 / unit, 0);
  mesh.frustumCulled = false;
  return {
    mesh,
    material,
    setOpacity: (o) => {
      material.uniforms.uOpacity!.value = o;
    },
  };
}

// ───────────────────────────────────────────────────────────────────────────── the look of the roads

/**
 * How a road looks at exponent `e`. Seen from close by it is asphalt, with the pools of
 * light of the lamps (points of their own); from farther away a thin warm thread grows
 * along it, the lamps seen together, until the streets are threads of light. The same for
 * every level, so their hand-overs cannot be seen.
 */
export function roadLook(e: number): { asphalt: Color; warmth: number } {
  const t = Math.min(1, Math.max(0, (e - 2.15) / 1.1));
  return { asphalt: new Color(ASPHALT_NEAR), warmth: t * t * (3 - 2 * t) };
}

/** The asphalt of the streets, lit by the lamps: a little lighter than the night around. */
export const ASPHALT_NEAR = '#1a1b23';
/** The thread of lamp light along a street, seen from far away. */
export const LAMPLIGHT = '#eca45a';

/** Clean-up of everything a layer owns. */
export function disposeMesh(mesh: Mesh): void {
  mesh.geometry.dispose();
  const m = mesh.material;
  if (Array.isArray(m)) for (const x of m) x.dispose();
  else m.dispose();
}
