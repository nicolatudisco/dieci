import assert from 'node:assert/strict';
import { test } from 'node:test';
import { VOYAGER_1 } from '../src/content/data.ts';
import { JUICE_POSITION } from '../src/content/juice-position.ts';
import { juiceFromSun, juicePlace } from '../src/juice.ts';

const FIXED = new Date(VOYAGER_1.lightDayDateUTC);

test('the table is whole and has no jumps', () => {
  const { xy } = JUICE_POSITION;
  assert.equal(xy.length % 2, 0);
  assert.ok(xy.length / 2 > 400);
  for (let i = 1; i < xy.length / 2; i++) {
    const jump = Math.hypot(xy[2 * i]! - xy[2 * i - 2]!, xy[2 * i + 1]! - xy[2 * i - 1]!);
    const r = Math.hypot(xy[2 * i]!, xy[2 * i + 1]!);
    // In five days the frame turns with the Earth by about 5° (0.09 r), and the probe moves a
    // few tens of km/s (under 0.07 AU).
    assert.ok(jump < 0.1 * r + 0.07, `jump of ${jump.toFixed(3)} AU at row ${i}`);
  }
});

test('on the day of the screenshots (18 November 2026) Juice is still close to home', () => {
  const p = juicePlace(FIXED);
  assert.equal(p.arrived, false);
  // Horizons: 0.85 AU from the Sun and 0.34 AU from the Earth.
  assert.ok(Math.abs(juiceFromSun(FIXED) - 0.85) < 0.02);
  // The Earth is about 0.99 AU from the Sun in November, on the +x axis.
  assert.ok(Math.abs(Math.hypot(p.x - 0.988, p.y) - 0.34) < 0.03);
});

test('in 2031 it is out at the distance of Jupiter, and after July it is there', () => {
  assert.ok(juiceFromSun(new Date('2031-06-24T00:00:00Z')) > 5.1);
  assert.equal(juicePlace(new Date('2031-08-01T00:00:00Z')).arrived, true);
  assert.equal(juicePlace(new Date('2031-07-01T00:00:00Z')).arrived, false);
});
