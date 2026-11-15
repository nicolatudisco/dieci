import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NEARBY_STARS } from '../src/content/data.ts';
import { ANCHORS, AU } from '../src/engine/stage.ts';
import { galacticLonLat, stageFromEquatorial } from '../src/levels/sky.ts';
import { PLANETS, planet, planetPosition } from '../src/levels/solar-system.ts';

const near = (actual: number, expected: number, tolerance: number, message?: string): void => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message ?? ''} expected ${expected} ± ${tolerance}, got ${actual}`);
};

test('known directions land on their galactic coordinates', () => {
  // Sagittarius A*, the centre of the galaxy: longitude 0 (or 360), latitude 0.
  const centre = galacticLonLat(17.7611, -29.0078);
  near(Math.min(centre.lon, 360 - centre.lon), 0, 0.1, 'Sgr A* lon');
  near(centre.lat, 0, 0.1, 'Sgr A* lat');
  // The north galactic pole.
  near(galacticLonLat(12.8567, 27.13).lat, 90, 0.1, 'pole');
  // The Orion Nebula: longitude 209°, latitude -19.4°.
  const orion = galacticLonLat(5.588, -5.39);
  near(orion.lon, 209.0, 0.3, 'Orion lon');
  near(orion.lat, -19.4, 0.3, 'Orion lat');
});

test('on the stage the galactic centre is up and longitude grows counter-clockwise', () => {
  const centre = stageFromEquatorial(17.7611, -29.0078, 1);
  near(centre[0], 0, 0.01);
  near(centre[1], 1, 0.01);
  // Longitude 90° (towards Cygnus, RA 21h12m Dec +48°20') is on the left.
  const cygnus = stageFromEquatorial(21.2, 48.33, 1);
  near(cygnus[0], -1, 0.02);
  // The Orion Nebula is where the stage anchor puts it: same direction from the Sun.
  const orion = stageFromEquatorial(5.588, -5.39, 1);
  const anchor = [ANCHORS.orionNebula[0] - ANCHORS.sun[0], ANCHORS.orionNebula[1] - ANCHORS.sun[1]] as const;
  const length = Math.hypot(anchor[0], anchor[1]);
  const flat = Math.hypot(orion[0], orion[1]);
  near(orion[0] / flat, anchor[0] / length, 0.02);
  near(orion[1] / flat, anchor[1] / length, 0.02);
});

test('nearby stars keep their true distance in three dimensions', () => {
  for (const star of NEARBY_STARS) {
    const [x, y, z] = stageFromEquatorial(star.raHours, star.decDeg, star.ly);
    near(Math.hypot(x, y, z), star.ly, 1e-6, star.name);
  }
  // Proxima and Alpha Centauri are neighbours in the sky and in space.
  const proxima = stageFromEquatorial(14.495, -62.68, 4.24);
  const alpha = stageFromEquatorial(14.66, -60.83, 4.37);
  assert.ok(Math.hypot(proxima[0] - alpha[0], proxima[1] - alpha[1], proxima[2] - alpha[2]) < 0.3);
});

test('the Earth of the planet table is where the stage anchors put it', () => {
  const [x, y] = planetPosition(planet('earth'));
  near(x, (ANCHORS.earth[0] - ANCHORS.sun[0]) / AU, 1e-9);
  near(y, (ANCHORS.earth[1] - ANCHORS.sun[1]) / AU, 1e-9);
});

test('planets are in order of distance, with sensible orbits', () => {
  const sizes = PLANETS.map((p) => p.au);
  assert.deepEqual([...sizes].sort((a, b) => a - b), sizes);
  near(planet('jupiter').au, 5.2, 0.01);
  near(planet('neptune').au, 30.1, 0.1);
});
