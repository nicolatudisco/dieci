/**
 * The stop `pianeti-lontani`: the orbits of the four giant planets around a Sun that is
 * already a small bright star; Jupiter, Uranus and Neptune as points of light with their
 * names; the Earth only the warm dot.
 *
 * The lens: Saturn with its real picture (Solar System Scope), flattened at the poles as the
 * real one (its polar radius is nine tenths of the equatorial one), the rings in its
 * equatorial plane at their true size compared with the globe (the picture runs from 1.17 to
 * 2.33 radii of Saturn: the Cassini division falls where it is), opened towards us, and the
 * shadow of the globe on the rings, on the side away from the Sun.
 *
 * Units: astronomical units. Origin: the Sun.
 */
import { Group, Scene } from 'three';
import { LABELS } from '../content/labels.ts';
import { asyncSketch } from './async-sketch.ts';
import { rgb } from './placeholder/bodies.ts';
import { lightFor, makeBody, makeRings } from './planet-lens.ts';
import { drawOrbit, drawPlanet, placePlanet } from './sole.ts';
import { PLANETS, planet } from './solar-system.ts';
import { drawSun } from './sun.ts';
import { acquire, loadColorTexture } from './textures.ts';

/** Saturn in the lens: equatorial radius, polar over equatorial (54,364 / 60,268 km). */
const SATURN_RADIUS = 1.2;
const SATURN_FLATTENING = 0.902;
/** Where the picture of the rings begins and ends, in radii of Saturn. */
const RINGS: readonly [number, number] = [1.166, 2.328];
/** How much the rings are opened towards us, and the slant of the whole planet, degrees. */
const OPENING = 22;
const SLANT = -14;

export default asyncSketch(async (s) => {
  const [globe, rings] = await Promise.all([
    acquire('saturn', () => loadColorTexture('textures/saturn.webp'), (t) => t.dispose()),
    acquire('saturn-ring', () => loadColorTexture('textures/saturn-ring.webp'), (t) => t.dispose()),
  ]);
  s.onDispose(globe.release);
  s.onDispose(rings.release);

  drawSun(s);
  for (const p of PLANETS.filter((q) => q.au > 2)) drawOrbit(s, p, 0.42);
  // Names come in late: at the stop before, Jupiter is named by its lens.
  drawPlanet(s, planet('jupiter'), 'above', 12.8);
  drawPlanet(s, planet('uranus'), 'below', 12.8);
  drawPlanet(s, planet('neptune'), 'above', 12.8);
  const saturn = planet('saturn');
  const at = placePlanet(s, saturn);
  s.dot(at, 7, rgb(saturn.color));

  const light = lightFor(saturn.angle, 40);
  const scene = new Scene();
  const planetGroup = new Group();
  planetGroup.rotation.order = 'ZYX';
  planetGroup.rotation.x = (OPENING * Math.PI) / 180;
  planetGroup.rotation.z = (SLANT * Math.PI) / 180;
  planetGroup.add(makeBody({ map: globe.value, light, radius: SATURN_RADIUS, polarRadius: SATURN_RADIUS * SATURN_FLATTENING, ambient: 0.04, gain: 1.15 }));
  const ring = makeRings({ map: rings.value, inner: SATURN_RADIUS * RINGS[0], outer: SATURN_RADIUS * RINGS[1], light, planetRadius: SATURN_RADIUS });
  planetGroup.add(ring.mesh);
  scene.add(planetGroup);
  ring.aim();
  s.lens({ id: 'saturn', at, scene, fieldWidth: 6.4, angle: 70, label: LABELS.places.saturn, from: 12.75 });
});
