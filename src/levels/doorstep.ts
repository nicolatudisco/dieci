/**
 * Her, on the doorstep: one metre of a street in Rifredi at night, seen from above.
 *
 * She sits on the threshold of a big closed door, knees bent, feet on the asphalt, hands
 * on the threshold, face turned up to the stars (towards the camera). A soft, flat
 * silhouette: no facial features and nothing that could make her recognisable.
 * The warm light of a street lamp far to the left draws a long shadow to the right.
 *
 * This is the picture the journey starts from (the level of `partenza`) and the one the
 * finale finds again inside the warm dot, through the lens.
 *
 * Units: metres. Origin: «Tu sei qui», on her chest. +y is towards the door.
 * Her figure spans about 59 × 74 cm, from y = +0.21 (hair) to y = -0.53 (toes).
 * Nothing here is real geography: no house number, plate or sign.
 */
import { Color, Mesh, PlaneGeometry, Scene, ShaderMaterial, Vector2 } from 'three';
import { disposeTree, makeShape, sharedUniforms, type ShapeOptions } from './placeholder/primitives.ts';

// Night palette. Clothes and skin are tones of the same blue: a silhouette, not a portrait.
const TOP = '#33406d';
const TOP_DARK = '#283256';
const TROUSERS = '#1c2440';
const THIGH = '#222b4c';
const SHOE = '#12172a';
const SKIN = '#6f799f';
const FACE = '#7c87b0';
const HAIR = '#0f1424';
const STONE = '#1d2334';
const STONE_EDGE = '#59607c';
const DOOR = '#121727';
const WALL_LINE = '#343b57';
const BUILDING = '#06080d';
const LAMP = '#f2b673';

/** The front edge of the threshold and the line of the wall, in metres from her chest. */
const STEP_EDGE_Y = -0.21;
const WALL_Y = 0.26;

/** Direction towards the street lamp, far to the left and a little towards the street. */
const LIGHT: readonly [number, number] = [-0.98, -0.2];
/** Everything on the ground fades out between these distances from her (metres). */
const GROUND_MASK: readonly [number, number] = [2.3, 3.3];

const GROUND_FRAGMENT = /* glsl */ `
  uniform vec3 uAsphalt;
  uniform vec3 uLamp;
  uniform vec2 uMask;
  uniform float uFade;
  varying vec2 vP;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }

  void main() {
    // Fine grain of the asphalt at three sizes; each one fades out before it gets
    // smaller than a pixel, so nothing shimmers while zooming out.
    float px = fwidth(vP.x);
    float fine = (noise(vP * 300.0) - 0.5) * (1.0 - smoothstep(0.25, 1.0, px * 300.0));
    float mid = (noise(vP * 42.0) - 0.5) * (1.0 - smoothstep(0.25, 1.0, px * 42.0));
    float wide = noise(vP * 3.1 + 7.0) - 0.5;
    float grain = fine * 0.55 + mid * 0.4 + wide * 0.3;
    // The lamp is far to the left: its light thins out towards the right.
    float lamp = smoothstep(3.2, -3.4, vP.x + vP.y * 0.25);
    vec3 color = uAsphalt * (1.0 + grain * 1.6) + uLamp * lamp * lamp * (0.02 + grain * 0.022);
    float alpha = 1.0 - smoothstep(uMask.x, uMask.y, length(vP));
    gl_FragColor = vec4(color, alpha * uFade);
    #include <colorspace_fragment>
  }`;

const GROUND_VERTEX = /* glsl */ `
  varying vec2 vP;
  void main() {
    vP = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;

export interface DoorstepOptions {
  /** The warm dot on her chest, drawn in the picture (the finale: «in quel pallino ci sei te»). */
  readonly dot?: boolean;
}

export class Doorstep {
  readonly scene = new Scene();
  private readonly shared = sharedUniforms();
  private order = 0;

  constructor(options: DoorstepOptions = {}) {
    this.addGround();
    this.addDoorstep();
    this.addShadow();
    this.addFigure();
    if (options.dot) this.addDot();
  }

  private add(options: ShapeOptions, x: number, y: number, degrees = 0): Mesh {
    const mesh = makeShape({ ...options, order: ++this.order }, this.shared);
    mesh.position.set(x, y, 0);
    mesh.rotation.z = (degrees * Math.PI) / 180;
    this.scene.add(mesh);
    return mesh;
  }

  /** The same shape on both sides of her. */
  private pair(options: ShapeOptions, x: number, y: number, degrees = 0): void {
    this.add(options, -x, y, -degrees);
    this.add(options, x, y, degrees);
  }

  private addGround(): void {
    const material = new ShaderMaterial({
      uniforms: {
        uFade: this.shared.uFade,
        uAsphalt: { value: new Color('#10131d') },
        uLamp: { value: new Color(LAMP) },
        uMask: { value: new Vector2(GROUND_MASK[0], GROUND_MASK[1]) },
      },
      vertexShader: GROUND_VERTEX,
      fragmentShader: GROUND_FRAGMENT,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const ground = new Mesh(new PlaneGeometry(7, 7), material);
    ground.renderOrder = ++this.order;
    this.scene.add(ground);
  }

  private addDoorstep(): void {
    const mask = GROUND_MASK;
    // The building: everything beyond the line of the wall is dark.
    this.add({ kind: 'box', half: [3.6, 1.6], color: BUILDING, mask }, 0, WALL_Y + 1.6);
    // The threshold: a slab of stone as wide as the door, across the frame, behind her.
    const depth = (WALL_Y - STEP_EDGE_Y) / 2;
    this.add({ kind: 'box', half: [1.7, depth], radius: 0.012, color: STONE, mask }, 0, STEP_EDGE_Y + depth);
    // Its front edge catches a little of the lamp light.
    this.add({ kind: 'box', half: [1.7, 0.005], color: STONE_EDGE, opacity: 0.85, mask }, 0, STEP_EDGE_Y + 0.005);
    // The line of the wall, and the closed door just beyond the threshold.
    this.add({ kind: 'box', half: [3.6, 0.004], color: WALL_LINE, opacity: 0.9, mask }, 0, WALL_Y);
    this.add({ kind: 'box', half: [1.55, 0.03], color: DOOR, mask }, 0, WALL_Y + 0.034);
    // The seam between the two leaves of the door.
    this.add({ kind: 'box', half: [0.003, 0.03], color: WALL_LINE, opacity: 0.7 }, 0.04, WALL_Y + 0.034);
  }

  private addShadow(): void {
    // Long and soft, away from the lamp: first the legs on the asphalt, then the body on the stone.
    const shadow = { kind: 'box', color: '#000000', soft: 0.1 } as const;
    this.add({ ...shadow, half: [0.46, 0.07], radius: 0.07, opacity: 0.3 }, 0.56, -0.33, 5);
    this.add({ ...shadow, half: [0.7, 0.12], radius: 0.12, opacity: 0.4 }, 0.72, 0.0, 5);
  }

  /**
   * Seen from straight above, a seated child is mostly head and shoulders, with the lap in
   * front: thighs foreshortened, knees up, the tips of the feet beyond the knees.
   */
  private addFigure(): void {
    const rim = (width: number, strength = 0.4) => ({ color: LAMP, width, light: LIGHT, strength }) as const;

    // Feet on the asphalt, toes a little outwards.
    this.pair({ kind: 'ellipse', half: [0.042, 0.085], color: SHOE, rim: rim(0.01, 0.3) }, 0.1, -0.44, 8);
    // Shins, seen almost end-on under the knees: short and dark.
    this.pair({ kind: 'box', half: [0.04, 0.07], radius: 0.04, color: SHOE }, 0.094, -0.355, 3);
    // Arms, down and out to the hands that rest on the threshold beside her.
    this.pair({ kind: 'box', half: [0.034, 0.115], radius: 0.034, color: TOP_DARK, rim: rim(0.01) }, 0.21, -0.0725, 33.7);
    this.pair({ kind: 'ellipse', half: [0.033, 0.042], color: SKIN, soft: 0.006 }, 0.262, -0.155, 33.7);
    // Hips, on the edge of the threshold, and thighs rising towards the knees.
    this.add({ kind: 'box', half: [0.135, 0.06], radius: 0.055, color: TROUSERS }, 0, -0.11);
    this.pair({ kind: 'box', half: [0.062, 0.125], radius: 0.062, color: THIGH, rim: rim(0.012) }, 0.086, -0.215, 2);
    // Shoulders and chest in one soft shape: she leans back a little.
    this.add({ kind: 'box', half: [0.17, 0.095], radius: 0.085, color: TOP, rim: rim(0.014) }, 0, 0.0);
    // Head: hair, and the face turned up to the sky. No features.
    this.add({ kind: 'ellipse', half: [0.094, 0.104], color: HAIR }, 0, 0.108);
    this.add({ kind: 'ellipse', half: [0.052, 0.062], color: FACE, soft: 0.016 }, 0, 0.094);
  }

  /** «Tu sei qui», on her chest: a small warm light. */
  private addDot(): void {
    this.add({ kind: 'ellipse', half: [0.075, 0.075], color: '#ffab45', opacity: 0.34, soft: 0.07, additive: true }, 0, 0);
    this.add({ kind: 'ellipse', half: [0.019, 0.019], color: '#ffe9b8', soft: 0.008 }, 0, 0);
  }

  /** `fade` is the opacity of the whole picture; with time frozen `time` is 0. */
  update(fade: number, pixelRatio: number, time: number): void {
    this.shared.uFade.value = fade;
    this.shared.uPixelRatio.value = pixelRatio;
    this.shared.uTime.value = time;
  }

  dispose(): void {
    disposeTree(this.scene);
    this.scene.clear();
  }
}
