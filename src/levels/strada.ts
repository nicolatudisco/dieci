/**
 * The stop `strada`: ten metres of the street at night, seen from above, with her still on
 * the doorstep. A generic street drawn by us: no house number, plate or sign.
 *
 * - The picture of her, the threshold and the door is the one of `partenza` (doorstep.ts),
 *   in the same place: as `partenza` fades out nothing moves.
 * - Around it: the pavement, the kerb, the carriageway with cars parked at an angle (the
 *   real street has angled parking on both sides), a street lamp and its pool of warm light,
 *   a manhole cover, the light of the first windows on the pavement, the line of the wall
 *   and a piece of roof.
 * - Kerb and carriageway are where the real ones are (src/content/street.ts), and the whole
 *   picture is turned like the real street (street.ts): the map of `rifredi` continues it.
 *
 * Units: metres. Origin: «Tu sei qui», on her chest. In the picture +y is towards the door.
 * Everything fades out between 16 and 26 m from her, into the map of `rifredi`.
 */
import { Group, Scene, type Mesh } from 'three';
import type { Level, LevelDef, LevelFrame } from '../engine/level.ts';
import { ASPHALT, BUILDING, Doorstep, LAMP, LIGHT, STONE_EDGE, WALL_Y, makeGround } from './doorstep.ts';
import { disposeTree, makeShape, mulberry32, sharedUniforms, type ShapeOptions } from './placeholder/primitives.ts';
import { KERB_DISTANCE, STREET_WIDTH, streetTurn } from './street.ts';

/** The carriageway, a little lighter than the pavement: the lamps light it. Shared with the map (geo/layers.ts). */
export const CARRIAGEWAY = '#171a24';
const ROOF = '#24171a';
const ROOF_ROW = '#140c0f';
const PAINT = '#c9ccd6';
const MASK: readonly [number, number] = [16, 26];

/** Cars at night: muted colours, no plates. */
const CAR_COLOURS = ['#3a2a33', '#2a3448', '#3b3f48', '#2f3a38', '#463c33'];

class Strada implements Level {
  readonly scene = new Scene();
  private readonly turn = new Group();
  private readonly picture = new Doorstep();
  private readonly shared = sharedUniforms();
  private order = -1000;

  constructor() {
    this.scene.add(this.turn);
    this.build();
    this.turn.add(this.picture.scene);
  }

  init(): void {}

  private add(options: ShapeOptions, x: number, y: number, degrees = 0): Mesh {
    const mesh = makeShape({ mask: MASK, ...options, order: ++this.order }, this.shared);
    mesh.position.set(x, y, 0);
    mesh.rotation.z = (degrees * Math.PI) / 180;
    this.turn.add(mesh);
    return mesh;
  }

  private build(): void {
    const K = KERB_DISTANCE;
    const W = STREET_WIDTH;

    // The pavement: the same asphalt as around her, much larger.
    const ground = makeGround(this.shared.uFade, 60, MASK, 0);
    ground.renderOrder = ++this.order;
    this.turn.add(ground);

    // The carriageway and its kerb.
    this.add({ kind: 'box', half: [30, W / 2], color: CARRIAGEWAY }, 0, -K - W / 2);
    this.add({ kind: 'box', half: [30, 0.075], color: STONE_EDGE, opacity: 0.5 }, 0, -K + 0.075);
    // The pool of light of the lamp, on the asphalt.
    const lampX = -3.6;
    this.add({ kind: 'ellipse', half: [4.6, 4.6], color: LAMP, opacity: 0.11, soft: 4.2, additive: true }, lampX, -K - 0.6);

    // Angled parking along the kerb: painted lines and a few cars.
    const depth = 4.6;
    const angle = 60;
    const slant = depth / Math.tan((angle * Math.PI) / 180);
    const length = depth / Math.sin((angle * Math.PI) / 180);
    const pitch = 2.7;
    const random = mulberry32(1909);
    for (let i = -6; i <= 6; i++) {
      const x = i * pitch;
      this.add({ kind: 'box', half: [0.05, length / 2], color: PAINT, opacity: 0.2 }, x - slant / 2, -K - depth / 2, 90 - angle);
      if ([-5, -4, -2, 1, 2, 3, 5].includes(i)) this.car(x + pitch / 2 - slant / 2, -K - depth / 2, 90 - angle, random);
    }

    // The building beyond the wall: dark (the picture of the doorstep has the same dark
    // behind the door, out to 3.3 m), then the eaves and the rows of tiles.
    const eaves = WALL_Y + 3.4;
    this.add({ kind: 'box', half: [30, 8], color: BUILDING }, 0, WALL_Y + 8);
    this.add({ kind: 'box', half: [30, 6], color: ROOF }, 0, eaves + 6);
    for (let k = 0; k < 36; k++) this.add({ kind: 'box', half: [30, 0.03], color: ROOF_ROW, opacity: 0.85 }, 0, eaves + 0.25 + k * 0.32);
    this.add({ kind: 'box', half: [30, 0.06], color: '#3a3240', opacity: 0.9 }, 0, eaves + 0.02);

    // Light from two ground-floor windows, spilling on the pavement at the edges of the scene.
    for (const x of [4.6, -6.8]) {
      this.add({ kind: 'box', half: [0.6, 1.1], radius: 0.3, color: '#ffc27a', opacity: 0.1, soft: 0.6, additive: true }, x, WALL_Y - 1.1);
      this.add({ kind: 'box', half: [0.55, 0.035], color: '#ffd9a0', opacity: 0.3 }, x, WALL_Y - 0.02);
    }

    // A manhole cover on the pavement.
    const mx = 2.4;
    const my = -K + 1.2;
    this.add({ kind: 'ellipse', half: [0.33, 0.33], color: '#1b2030', rim: { color: LAMP, width: 0.05, light: LIGHT, strength: 0.35 } }, mx, my);
    this.add({ kind: 'ellipse', half: [0.27, 0.27], color: '#121621' }, mx, my);
    for (let k = -2; k <= 2; k++) this.add({ kind: 'box', half: [0.22 * Math.sqrt(1 - (k / 3) ** 2), 0.012], color: '#262c3e' }, mx, my + k * 0.09);

    // The street lamp: its pole on the pavement, the arm over the road, the lit head.
    this.add({ kind: 'ellipse', half: [0.09, 0.09], color: '#262b3a' }, lampX, -K + 0.4);
    this.add({ kind: 'box', half: [0.035, 0.85], radius: 0.035, color: '#2e3445' }, lampX, -K - 0.45);
    this.add({ kind: 'ellipse', half: [0.8, 0.8], color: LAMP, opacity: 0.45, soft: 0.75, additive: true }, lampX, -K - 1.25);
    this.add({ kind: 'box', half: [0.16, 0.3], radius: 0.12, color: '#ffe2b0' }, lampX, -K - 1.25);
  }

  /** A parked car seen from above: body, roof, windscreen and rear window. */
  private car(x: number, y: number, degrees: number, random: () => number): void {
    const colour = CAR_COLOURS[Math.floor(random() * CAR_COLOURS.length)] ?? '#3b3f48';
    const flip = random() < 0.25 ? 180 : 0;
    const a = ((degrees + flip) * Math.PI) / 180;
    const at = (u: number, v: number): [number, number] => [x + u * Math.cos(a) - v * Math.sin(a), y + u * Math.sin(a) + v * Math.cos(a)];
    const deg = degrees + flip;
    this.add({ kind: 'box', half: [0.9, 2.2], radius: 0.42, color: '#000000', opacity: 0.35, soft: 0.25 }, ...at(0.12, -0.08), deg);
    this.add({ kind: 'box', half: [0.88, 2.15], radius: 0.4, color: colour, rim: { color: LAMP, width: 0.12, light: LIGHT, strength: 0.35 } }, x, y, deg);
    this.add({ kind: 'box', half: [0.72, 0.98], radius: 0.25, color: colour, opacity: 1 }, ...at(0, -0.25), deg);
    this.add({ kind: 'box', half: [0.7, 0.28], radius: 0.12, color: '#0b0e17' }, ...at(0, 0.85), deg);
    this.add({ kind: 'box', half: [0.66, 0.2], radius: 0.1, color: '#0b0e17' }, ...at(0, -1.33), deg);
    this.add({ kind: 'box', half: [0.6, 0.6], radius: 0.2, color: '#ffffff', opacity: 0.05 }, ...at(0, -0.25), deg);
  }

  update(frame: LevelFrame): void {
    this.shared.uFade.value = frame.fade;
    this.shared.uPixelRatio.value = frame.pixelRatio;
    this.shared.uTime.value = frame.time;
    this.picture.update(frame.fade, frame.pixelRatio, frame.time);
    this.turn.rotation.z = streetTurn(frame.e);
  }

  dispose(): void {
    disposeTree(this.scene);
    this.scene.clear();
    this.picture.dispose();
  }
}

export default function createStrada(_def: LevelDef): Level {
  return new Strada();
}

// Re-exported for the map: the pavement colour where the drawn street meets the real one.
export { ASPHALT };
