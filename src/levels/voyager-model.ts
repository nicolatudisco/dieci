/**
 * Voyager 1, drawn by us: stylised but recognisable. No asset, a few dozen simple shapes.
 *
 * What makes it Voyager: the big white dish, the ten-sided body behind it, the three booms
 * (instruments on one side, the three nuclear batteries on the other, the long thin
 * magnetometer boom), the two whip antennas at a right angle, and the Golden Record bolted
 * to the side of the body.
 *
 * Units are metres and proportions are the real ones (dish 3.7 m, magnetometer boom 13 m,
 * whips 10 m), with two exceptions made for legibility in a small lens: rods are thicker
 * than the real ones and the Golden Record is drawn a little larger than its 30 cm.
 *
 * Axes of the model: +y is where the dish looks (always towards the Earth), the instrument
 * boom is along +x, the batteries along -x.
 */
import {
  BoxGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  LatheGeometry,
  Mesh,
  MeshStandardMaterial,
  TorusGeometry,
  Vector2,
  Vector3,
  type BufferGeometry,
  type ColorRepresentation,
} from 'three';

const DISH_RADIUS = 1.83;
/** Focal length of the dish: its profile is the parabola y = r² / (4 f). */
const DISH_FOCAL = 1.25;
const BUS_RADIUS = 0.89;
const BUS_HEIGHT = 0.47;
const BUS_Y = -0.62;
const ROD = 0.045;

const UP = new Vector3(0, 1, 0);

function matte(color: ColorRepresentation, roughness = 0.75): MeshStandardMaterial {
  return new MeshStandardMaterial({ color, roughness, metalness: 0 });
}

export interface VoyagerModel {
  readonly root: Group;
  /** The material of the Golden Record: its glow can be animated. */
  readonly record: MeshStandardMaterial;
}

export function buildVoyager(): VoyagerModel {
  const root = new Group();
  const white = matte('#f3f2ec', 0.6);
  white.side = DoubleSide;
  const pale = matte('#c9cedd');
  const metal = matte('#aab2c8', 0.5);
  const dark = matte('#3a3e4b', 0.85);
  const darker = matte('#262933', 0.9);
  const record = new MeshStandardMaterial({ color: '#f2c45c', roughness: 0.35, metalness: 0, emissive: '#7a5210', emissiveIntensity: 1 });

  const add = (geometry: BufferGeometry, material: MeshStandardMaterial, x = 0, y = 0, z = 0): Mesh => {
    const mesh = new Mesh(geometry, material);
    mesh.position.set(x, y, z);
    root.add(mesh);
    return mesh;
  };

  /** A rod between two points. */
  const rod = (from: Vector3, to: Vector3, material: MeshStandardMaterial, radius = ROD): Mesh => {
    const length = from.distanceTo(to);
    const mesh = new Mesh(new CylinderGeometry(radius, radius, length, 6), material);
    mesh.position.copy(from).add(to).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(UP, to.clone().sub(from).normalize());
    root.add(mesh);
    return mesh;
  };

  // The dish, with its rim, the small mirror in front of it and the three struts that hold it.
  const profile: Vector2[] = [];
  for (let i = 0; i <= 14; i++) {
    const r = (DISH_RADIUS * i) / 14;
    profile.push(new Vector2(r, (r * r) / (4 * DISH_FOCAL)));
  }
  add(new LatheGeometry(profile, 48), white);
  const rimY = (DISH_RADIUS * DISH_RADIUS) / (4 * DISH_FOCAL);
  add(new TorusGeometry(DISH_RADIUS, 0.035, 6, 48), pale, 0, rimY, 0).rotation.x = Math.PI / 2;
  const mirrorY = DISH_FOCAL * 0.92;
  add(new CylinderGeometry(0.2, 0.27, 0.1, 20), pale, 0, mirrorY, 0);
  add(new CylinderGeometry(0.05, 0.16, 0.34, 12), metal, 0, 0.17, 0);
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + 0.5;
    const r = 1.25;
    rod(new Vector3(r * Math.cos(a), (r * r) / (4 * DISH_FOCAL), r * Math.sin(a)), new Vector3(0.2 * Math.cos(a), mirrorY, 0.2 * Math.sin(a)), metal, 0.025);
  }

  // The ten-sided body, hung under the dish, with a pale band at its two edges.
  const bus = add(new CylinderGeometry(BUS_RADIUS, BUS_RADIUS, BUS_HEIGHT, 10), dark, 0, BUS_Y, 0);
  (bus.material as MeshStandardMaterial).flatShading = true;
  for (const side of [-1, 1]) add(new CylinderGeometry(BUS_RADIUS + 0.02, BUS_RADIUS + 0.02, 0.05, 10), metal, 0, BUS_Y + (side * BUS_HEIGHT) / 2, 0);
  add(new CylinderGeometry(0.45, 0.8, 0.4, 10, 1, true), darker, 0, BUS_Y + BUS_HEIGHT / 2 + 0.2, 0);

  // The Golden Record, on the middle of one of the ten faces: the one turned to +z.
  const apothem = BUS_RADIUS * Math.cos(Math.PI / 10);
  const face = new Group();
  // CylinderGeometry puts its first vertex on +z: half a step turns a face there.
  bus.rotation.y = Math.PI / 10;
  const disc = new Mesh(new CylinderGeometry(0.21, 0.21, 0.03, 32), record);
  disc.rotation.x = Math.PI / 2;
  disc.position.set(0, BUS_Y, apothem + 0.03);
  const hub = new Mesh(new CylinderGeometry(0.05, 0.05, 0.04, 16), matte('#b98a2c', 0.5));
  hub.rotation.x = Math.PI / 2;
  hub.position.set(0, BUS_Y, apothem + 0.035);
  face.add(disc, hub);
  root.add(face);

  // Instrument boom: a strut, two small boxes along it, the platform with the cameras.
  rod(new Vector3(BUS_RADIUS * 0.9, BUS_Y, 0), new Vector3(3.1, BUS_Y + 0.25, 0), metal);
  add(new BoxGeometry(0.26, 0.22, 0.22), pale, 1.7, BUS_Y + 0.22, 0.12);
  add(new BoxGeometry(0.2, 0.2, 0.2), pale, 2.3, BUS_Y + 0.02, -0.12);
  add(new BoxGeometry(0.55, 0.5, 0.45), pale, 3.3, BUS_Y + 0.28, 0);
  const camera = add(new CylinderGeometry(0.14, 0.14, 0.6, 14), white, 3.36, BUS_Y + 0.3, 0.42);
  camera.rotation.x = Math.PI / 2;
  const camera2 = add(new CylinderGeometry(0.09, 0.09, 0.5, 12), dark, 3.1, BUS_Y + 0.44, 0.4);
  camera2.rotation.x = Math.PI / 2;

  // The three nuclear batteries, in a row on the other side, held away from the instruments.
  const batteryStart = new Vector3(-BUS_RADIUS * 0.9, BUS_Y, 0);
  const batteryEnd = new Vector3(-4.05, BUS_Y - 0.55, 0);
  rod(batteryStart, new Vector3(-2.2, BUS_Y - 0.25, 0), metal);
  const along = batteryEnd.clone().sub(batteryStart).normalize();
  for (let k = 0; k < 3; k++) {
    const centre = new Vector3(-2.55 - k * 0.6, 0, 0);
    centre.y = BUS_Y - 0.25 + (centre.x + 2.2) * (along.y / along.x);
    const battery = add(new CylinderGeometry(0.21, 0.21, 0.52, 14), k % 2 ? dark : darker, centre.x, centre.y, 0);
    battery.quaternion.setFromUnitVectors(UP, along);
    const cap = add(new CylinderGeometry(0.235, 0.235, 0.05, 14), metal, centre.x - along.x * 0.28, centre.y - along.y * 0.28, 0);
    cap.quaternion.setFromUnitVectors(UP, along);
  }

  // The magnetometer boom: thirteen metres, thin as a fishing rod, with its two sensors.
  const magFrom = new Vector3(-0.5, BUS_Y - 0.2, -0.4);
  const magTo = magFrom.clone().add(new Vector3(-0.22, -0.8, -0.56).normalize().multiplyScalar(13));
  rod(magFrom, magTo, metal, 0.04);
  for (const share of [0.56, 1]) {
    const at = magFrom.clone().lerp(magTo, share);
    add(new BoxGeometry(0.16, 0.16, 0.16), pale, at.x, at.y, at.z);
  }

  // The two whip antennas, ten metres each, at a right angle to one another.
  const whipFrom = new Vector3(0.1, BUS_Y - 0.22, 0.2);
  // (a, -b, c) and (-a, -b, c) are perpendicular when a² = b² + c².
  for (const direction of [new Vector3(0.707, -0.4, 0.583), new Vector3(-0.707, -0.4, 0.583)]) {
    rod(whipFrom, whipFrom.clone().add(direction.normalize().multiplyScalar(10)), metal, 0.03);
  }

  return { root, record };
}
