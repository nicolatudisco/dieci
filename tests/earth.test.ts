import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EARTH_LIGHT, globeLook } from '../src/levels/earth.ts';
import { EARTH_RADIUS } from '../src/engine/stage.ts';

/** Sun elevation (dot of the normal with the light) at `km` from the starting point, in direction (dx, dy). */
function sunAt(km: number, dx: number, dy: number): number {
  const c = (km * 1000) / EARTH_RADIUS;
  const length = Math.hypot(dx, dy);
  const n = [(Math.sin(c) * dx) / length, (Math.sin(c) * dy) / length, Math.cos(c)];
  return n[0]! * EARTH_LIGHT[0] + n[1]! * EARTH_LIGHT[1] + n[2]! * EARTH_LIGHT[2];
}

test('the light of the Earth is a unit vector', () => {
  assert.ok(Math.abs(Math.hypot(...EARTH_LIGHT) - 1) < 1e-12);
});

test('the starting point is in the night, and so is the whole of Italy seen at `italia`', () => {
  assert.ok(sunAt(0, 1, 0) < 0);
  // The view of `italia` is about 1,300 km across: even towards the Sun, 1,500 km away, still night.
  assert.ok(sunAt(1500, EARTH_LIGHT[0], EARTH_LIGHT[1]) < -0.05);
});

test('there is a crescent of day on the side of the Sun', () => {
  assert.ok(sunAt(6000, EARTH_LIGHT[0], EARTH_LIGHT[1]) > 0.3);
});

test('the globe shows its lights and coasts only once the map of Italy matches it', () => {
  const before = globeLook(6.5);
  assert.equal(before.lights, 0);
  assert.equal(before.coast, 0);
  assert.equal(before.land, 0);
  const after = globeLook(7.2);
  assert.equal(after.lights, 1);
  assert.equal(after.coast, 1);
  assert.equal(after.land, 1);
});
