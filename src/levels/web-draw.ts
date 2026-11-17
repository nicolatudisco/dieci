/**
 * Drawing the cosmic web (M5): galaxies as tiny points, flow lines, the soft edge of
 * Laniakea. Shared by `laniakea` and `rete-cosmica`; positions come from src/cosmic-web.ts in
 * millions of light-years around us, and each level hands over its own conversion.
 */
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  LineSegments,
  Mesh,
  Points,
  ShaderMaterial,
  Shape,
  ShapeGeometry,
  Vector2,
} from 'three';
import type { GalaxySet } from '../cosmic-web.ts';

/** From stage Mly (x, y) to local units of a level. */
export type ToLocal = (x: number, y: number) => readonly [number, number];

const POINT_VERTEX = /* glsl */ `
  attribute float aDensity;
  uniform float uPixelRatio;
  uniform float uSize;
  uniform float uLevel;
  varying float vLevel;
  varying float vWarm;
  void main() {
    float d = aDensity;
    // Galaxies in the knots and filaments shine more; the few in the voids are faint.
    vLevel = uLevel * (0.18 + 0.82 * smoothstep(0.4, 5.0, d));
    vWarm = smoothstep(4.0, 11.0, d);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = max(1.0, uSize * (0.85 + 0.45 * smoothstep(1.5, 9.0, d)) * uPixelRatio);
  }`;

const POINT_FRAGMENT = /* glsl */ `
  uniform float uFade;
  uniform vec3 uCool;
  uniform vec3 uWarm;
  varying float vLevel;
  varying float vWarm;
  void main() {
    float r = length(gl_PointCoord - 0.5) * 2.0;
    float a = 1.0 - smoothstep(0.3, 1.0, r);
    vec3 c = mix(uCool, uWarm, vWarm);
    gl_FragColor = vec4(c * a * vLevel * uFade, 1.0);
    #include <colorspace_fragment>
  }`;

export interface GalaxyPoints {
  readonly points: Points;
  readonly count: number;
  /** Once a frame: brightness (0..1, fade included), size in CSS pixels, share of points to draw. */
  update(level: number, size: number, share: number, pixelRatio: number): void;
}

export function makeGalaxyPoints(set: GalaxySet, toLocal: ToLocal, z = 0): GalaxyPoints {
  const count = set.density.length;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const [x, y] = toLocal(set.positions[i * 2]!, set.positions[i * 2 + 1]!);
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('aDensity', new BufferAttribute(set.density, 1));
  const material = new ShaderMaterial({
    uniforms: {
      uPixelRatio: { value: 1 },
      uSize: { value: 1.4 },
      uLevel: { value: 1 },
      uFade: { value: 1 },
      uCool: { value: new Color('#c9d6ff') },
      uWarm: { value: new Color('#ffe9c8') },
    },
    vertexShader: POINT_VERTEX,
    fragmentShader: POINT_FRAGMENT,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const points = new Points(geometry, material);
  points.frustumCulled = false;
  const u = material.uniforms;
  return {
    points,
    count,
    update(level, size, share, pixelRatio) {
      u.uLevel!.value = level;
      u.uSize!.value = size;
      u.uPixelRatio!.value = pixelRatio;
      points.visible = level > 0.003;
      geometry.setDrawRange(0, Math.max(1, Math.floor(count * Math.min(1, share))));
    },
  };
}

// ─────────────────────────────────────────────────────────────────────── flow lines

const FLOW_VERTEX = /* glsl */ `
  attribute float aToEnd;     // Mly still to go to the end of the line
  attribute float aFromStart; // Mly from the start
  attribute float aInside;
  varying float vToEnd;
  varying float vFromStart;
  varying float vInside;
  void main() {
    vToEnd = aToEnd;
    vFromStart = aFromStart;
    vInside = aInside;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;

const FLOW_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uFade;
  uniform float uInside;
  uniform float uOutside;
  uniform vec3 uColor;
  varying float vToEnd;
  varying float vFromStart;
  varying float vInside;
  void main() {
    // Soft dashes that slide towards the end of the line: the galaxies flowing down.
    float phase = fract((vToEnd + uTime * 9.0) / 46.0);
    float dash = 0.35 + 0.65 * smoothstep(0.0, 0.25, phase) * (1.0 - smoothstep(0.45, 0.9, phase));
    float ends = smoothstep(0.0, 40.0, vFromStart) * (0.4 + 0.6 * smoothstep(0.0, 60.0, vToEnd));
    float level = mix(uOutside, uInside, vInside);
    gl_FragColor = vec4(uColor * dash * ends * level * uFade, 1.0);
    #include <colorspace_fragment>
  }`;

export interface FlowLines {
  readonly lines: LineSegments;
  update(time: number, fade: number, inside: number, outside: number): void;
}

export function makeFlowLines(flows: { points: Float32Array; starts: Uint32Array; inside: Uint8Array }, toLocal: ToLocal): FlowLines {
  const positions: number[] = [];
  const toEnd: number[] = [];
  const fromStart: number[] = [];
  const insideFlags: number[] = [];
  const total = flows.points.length / 2;
  for (let line = 0; line < flows.starts.length; line++) {
    const start = flows.starts[line]!;
    const end = line + 1 < flows.starts.length ? flows.starts[line + 1]! : total;
    // Lengths along the line, from both ends.
    const along: number[] = [0];
    for (let p = start + 1; p < end; p++) {
      along.push(along[along.length - 1]! + Math.hypot(flows.points[p * 2]! - flows.points[p * 2 - 2]!, flows.points[p * 2 + 1]! - flows.points[p * 2 - 1]!));
    }
    const length = along[along.length - 1]!;
    for (let p = start; p < end - 1; p++) {
      for (const q of [p, p + 1]) {
        const [x, y] = toLocal(flows.points[q * 2]!, flows.points[q * 2 + 1]!);
        positions.push(x, y, 0);
        const s = along[q - start]!;
        fromStart.push(s);
        toEnd.push(length - s);
        insideFlags.push(flows.inside[line]!);
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('aToEnd', new BufferAttribute(new Float32Array(toEnd), 1));
  geometry.setAttribute('aFromStart', new BufferAttribute(new Float32Array(fromStart), 1));
  geometry.setAttribute('aInside', new BufferAttribute(new Float32Array(insideFlags), 1));
  const material = new ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uFade: { value: 1 }, uInside: { value: 0.3 }, uOutside: { value: 0.12 }, uColor: { value: new Color('#9fb6ff') } },
    vertexShader: FLOW_VERTEX,
    fragmentShader: FLOW_FRAGMENT,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const lines = new LineSegments(geometry, material);
  lines.frustumCulled = false;
  const u = material.uniforms;
  return {
    lines,
    update(time, fade, inside, outside) {
      u.uTime!.value = time;
      u.uFade!.value = fade;
      u.uInside!.value = inside;
      u.uOutside!.value = outside;
      lines.visible = fade > 0.003;
    },
  };
}

// ──────────────────────────────────────────────────────────── the edge of Laniakea

const EDGE_VERTEX = /* glsl */ `
  attribute float aSide;
  varying float vSide;
  void main() {
    vSide = aSide;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;

const EDGE_FRAGMENT = /* glsl */ `
  uniform float uFade;
  uniform vec3 uColor;
  varying float vSide;
  void main() {
    // A soft glow on both sides of the watershed, and a thin line on it.
    float glow = exp(-vSide * vSide * 6.0) * 0.022;
    float px = fwidth(vSide);
    float line = 1.0 - smoothstep(0.5 * px, 1.6 * px, abs(vSide));
    gl_FragColor = vec4(uColor * (glow + 0.16 * line) * uFade, 1.0);
    #include <colorspace_fragment>
  }`;

const FILL_FRAGMENT = /* glsl */ `
  uniform float uFade;
  uniform vec3 uColor;
  void main() {
    gl_FragColor = vec4(uColor * 0.006 * uFade, 1.0);
    #include <colorspace_fragment>
  }`;

export interface Edge {
  readonly band: Mesh;
  readonly fill: Mesh;
  update(fade: number): void;
}

/** The edge of a closed outline (x, y pairs, stage Mly): a soft band `width` local units wide each side, and a faint fill. */
export function makeEdge(outline: Float32Array, toLocal: ToLocal, width: number): Edge {
  const count = outline.length / 2;
  const local: [number, number][] = [];
  for (let i = 0; i < count; i++) local.push(toLocal(outline[i * 2]!, outline[i * 2 + 1]!) as [number, number]);
  const positions: number[] = [];
  const sides: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i < count; i++) {
    const [px, py] = local[(i + count - 1) % count]!;
    const [x, y] = local[i]!;
    const [nx, ny] = local[(i + 1) % count]!;
    let tx = nx - px;
    let ty = ny - py;
    const t = Math.hypot(tx, ty) || 1;
    tx /= t;
    ty /= t;
    positions.push(x - ty * width, y + tx * width, 0, x + ty * width, y - tx * width, 0);
    sides.push(-1, 1);
    const a = i * 2;
    const b = ((i + 1) % count) * 2;
    indices.push(a, a + 1, b, a + 1, b + 1, b);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('aSide', new BufferAttribute(new Float32Array(sides), 1));
  geometry.setIndex(indices);
  const color = new Color('#a9bcff');
  const blend = { transparent: true, depthTest: false, depthWrite: false, blending: AdditiveBlending } as const;
  const bandMaterial = new ShaderMaterial({ uniforms: { uFade: { value: 1 }, uColor: { value: color } }, vertexShader: EDGE_VERTEX, fragmentShader: EDGE_FRAGMENT, ...blend });
  const band = new Mesh(geometry, bandMaterial);
  band.frustumCulled = false;
  const shape = new Shape(local.map(([x, y]) => new Vector2(x, y)));
  const fillMaterial = new ShaderMaterial({
    uniforms: { uFade: { value: 1 }, uColor: { value: color } },
    vertexShader: /* glsl */ `void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: FILL_FRAGMENT,
    ...blend,
  });
  const fill = new Mesh(new ShapeGeometry(shape), fillMaterial);
  fill.frustumCulled = false;
  return {
    band,
    fill,
    update(fade) {
      bandMaterial.uniforms.uFade!.value = fade;
      fillMaterial.uniforms.uFade!.value = fade;
      band.visible = fade > 0.003;
      fill.visible = fade > 0.003;
    },
  };
}
