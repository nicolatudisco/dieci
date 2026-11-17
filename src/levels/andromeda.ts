/**
 * Andromeda and the Local Group: millions of light-years, and every galaxy where it really is
 * (content/cosmos.ts: true galactic longitude, true distance from the Sun).
 *
 * - The Milky Way is the very galaxy of `via-lattea` (same shader, same place, MAX
 *   blending): while the view widens it shrinks without a seam, and becomes a small bright
 *   spiral with the warm dot on it.
 * - Beside it the two Magellanic Clouds; down and to the left Andromeda (tilted, as we know
 *   it) and the Triangulum Galaxy; around the two giants, the dozens of small galaxies of the
 *   catalogue, as points of light as bright as they really are.
 * - Andromeda is only a few pixels wide on a phone: its lens shows it as photographs do,
 *   with its two small companions M32 and M110.
 *
 * Units: millions of light-years, around the middle of the Local Group.
 */
import { Group, Scene } from 'three';
import { LOCAL_DWARFS, LOCAL_GIANTS, MILKY_WAY } from '../content/cosmos.ts';
import { LABELS } from '../content/labels.ts';
import { ANCHORS, LY, type Vec3 } from '../engine/stage.ts';
import { andromedaLook, magellanicLook, makeGalaxy, milkyWayLook, triangulumLook, type Galaxy } from './galaxy.ts';
import { makeShape, sharedUniforms } from './placeholder/primitives.ts';
import { sketch } from './placeholder/sketch.ts';
import { stageFromGalactic } from './sky.ts';

const RAD = Math.PI / 180;

/** Until here the Milky Way stays full whatever the fade of the level (its twin in `via-lattea` is leaving). */
const MILKY_WAY_OWN_FADE_FROM = 23;

/** Andromeda on screen: the long axis turned this much (composition), the disc tilted as we see it. */
const ANDROMEDA_TURN = 38;

/** The scene inside the lens: Andromeda as photographs show it, with M32 and M110. */
function andromedaLens(): Scene {
  const scene = new Scene();
  const galaxy = makeGalaxy(andromedaLook(1), { glow: false });
  galaxy.update(120, 1);
  galaxy.mesh.rotation.order = 'ZXY';
  galaxy.mesh.rotation.set(LOCAL_GIANTS.andromeda.inclinationDeg * RAD, 0, ANDROMEDA_TURN * RAD);
  scene.add(galaxy.mesh);
  // M32, a small round elliptical galaxy just off the bulge; M110, a larger faint oval further out.
  const shared = sharedUniforms();
  const m32 = makeShape({ kind: 'ellipse', half: [0.045, 0.04], color: '#fff0dc', opacity: 0.85, soft: 0.07, additive: true, order: 2 }, shared);
  m32.position.set(0.12, -0.2, 0);
  const m110 = makeShape({ kind: 'ellipse', half: [0.09, 0.05], color: '#f2e6d6', opacity: 0.55, soft: 0.12, additive: true, order: 2 }, shared);
  m110.position.set(-0.32, 0.5, 0);
  m110.rotation.z = -50 * RAD;
  scene.add(m32, m110);
  return scene;
}

export default sketch((s) => {
  const perLy = s.units(LY);
  const sun = s.local(ANCHORS.sun);
  /** A galaxy of the catalogue, from its longitude and distance. */
  const place = (l: number, ly: number): Vec3 => {
    const [x, y] = stageFromGalactic(l, ly * perLy);
    return [sun[0] + x, sun[1] + y, sun[2]];
  };
  const galaxies: { galaxy: Galaxy; own: boolean }[] = [];
  const add = (galaxy: Galaxy, at: Vec3, order: number, own = true): Galaxy => {
    galaxy.mesh.position.set(at[0], at[1], at[2]);
    galaxy.mesh.renderOrder = order;
    s.scene.add(galaxy.mesh);
    galaxies.push({ galaxy, own });
    return galaxy;
  };

  // The Milky Way: the same as in `via-lattea`.
  const centre = s.local(ANCHORS.galacticCentre);
  const milkyWayRadius = MILKY_WAY.radiusLy * perLy;
  const milkyWay = makeGalaxy(milkyWayLook(milkyWayRadius));
  milkyWay.mesh.position.set(centre[0], centre[1], centre[2]);
  milkyWay.mesh.renderOrder = 1;
  s.scene.add(milkyWay.mesh);

  // The Magellanic Clouds.
  const { lmc, smc, andromeda, triangulum } = LOCAL_GIANTS;
  const large = add(makeGalaxy(magellanicLook(lmc.radiusLy * perLy, true)), place(lmc.l, lmc.ly), 2);
  large.mesh.rotation.z = 20 * RAD;
  const small = add(makeGalaxy(magellanicLook(smc.radiusLy * perLy, false)), place(smc.l, smc.ly), 2);
  small.mesh.rotation.z = -35 * RAD;

  // Andromeda and Triangulum, tilted.
  const m31At = s.local(ANCHORS.andromeda);
  const m31 = add(makeGalaxy(andromedaLook(andromeda.radiusLy * perLy)), m31At, 2);
  m31.mesh.rotation.order = 'ZXY';
  m31.mesh.rotation.set(andromeda.inclinationDeg * RAD, 0, ANDROMEDA_TURN * RAD);
  const m33At = place(triangulum.l, triangulum.ly);
  const m33 = add(makeGalaxy(triangulumLook(triangulum.radiusLy * perLy)), m33At, 2);
  m33.mesh.rotation.order = 'ZXY';
  m33.mesh.rotation.set(triangulum.inclinationDeg * RAD, 0, -20 * RAD);

  // The small galaxies: points of light as bright as they are (absolute magnitude).
  const count = LOCAL_DWARFS.length;
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const colors = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  LOCAL_DWARFS.forEach((dwarf, i) => {
    positions.set(place(dwarf.l, dwarf.ly), i * 3);
    const absolute = dwarf.vmag - 5 * Math.log10(dwarf.ly / 3.26156 / 10);
    const bright = Math.min(1, Math.max(0, (-absolute - 7) / 9));
    sizes[i] = 1.8 + 2.4 * bright;
    const level = 0.45 + 0.45 * bright;
    colors.set([level * 0.95, level * 0.93, level], i * 3);
    phases[i] = (i * 0.618) % 1;
  });
  const dwarfs = s.dots({ positions, sizes, colors, phases });
  dwarfs.renderOrder = 3;

  const group = new Group();
  s.scene.add(group);

  // Words: light, and only where they do not crowd. «Tu sei qui» is to the right of the warm dot.
  s.label({ id: 'milky-way', text: LABELS.places.milkyWay, at: [centre[0], centre[1] - milkyWayRadius, centre[2]], align: 'below', from: 22.35, to: 23.4 });
  const smcAt = place(smc.l, smc.ly);
  s.label({ id: 'magellanic', text: LABELS.places.magellanicClouds, at: [smcAt[0], smcAt[1] + smc.radiusLy * perLy, smcAt[2]], kind: 'note', align: 'above', from: 21.75, to: 22.15 });
  // On a small screen the lens of Andromeda needs that room: the name of Triangulum is left out.
  const triangulumLabel = { id: 'triangulum', text: LABELS.places.triangulum, at: [m33At[0], m33At[1] - triangulum.radiusLy * perLy, m33At[2]] as Vec3, kind: 'note' as const, align: 'below' as const };
  s.liveLabels = (frame) => {
    const shown = Math.min(1, Math.max(0, (frame.e - 22.25) / 0.2)) * Math.min(1, Math.max(0, (23.5 - frame.e) / 0.2));
    return frame.free.width >= 520 && shown > 0.01 ? [{ ...triangulumLabel, opacity: shown }] : [];
  };
  s.lens({ id: 'andromeda', at: m31At, scene: andromedaLens(), fieldWidth: 1.85, angle: 150, label: LABELS.places.andromeda, from: 22.4, to: 23.25 });

  s.tick = (frame) => {
    // Until its twin of `via-lattea` has left, the Milky Way does not follow the fade of the level.
    milkyWay.update(frame.pxPerUnit, frame.u < MILKY_WAY_OWN_FADE_FROM ? 1 : frame.fade);
    for (const { galaxy } of galaxies) galaxy.update(frame.pxPerUnit, frame.fade);
  };
});
