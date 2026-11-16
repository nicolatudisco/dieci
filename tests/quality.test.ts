import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AdaptiveQuality, QUALITY_LADDER } from '../src/engine/quality.ts';

function run(quality: AdaptiveQuality, seconds: number, fps: number): number {
  let changes = 0;
  const dt = 1 / fps;
  for (let t = 0; t < seconds; t += dt) if (quality.step(dt)) changes++;
  return changes;
}

test('a device that keeps up stays at full quality', () => {
  const quality = new AdaptiveQuality();
  assert.equal(run(quality, 60, 60), 0);
  assert.equal(run(quality, 60, 120), 0);
  assert.equal(quality.level, 0);
  assert.deepEqual(quality.current, QUALITY_LADDER[0]);
});

test('a single slow frame or a pause changes nothing', () => {
  const quality = new AdaptiveQuality();
  run(quality, 5, 60);
  assert.equal(quality.step(0.035), false);
  assert.equal(quality.step(0.5), false);
  assert.equal(run(quality, 5, 60), 0);
  assert.equal(quality.level, 0);
});

test('slow frames take quality down within a few seconds, one step at a time', () => {
  const quality = new AdaptiveQuality();
  run(quality, 3, 30);
  assert.equal(quality.level, 1);
  run(quality, 30, 30);
  assert.equal(quality.level, QUALITY_LADDER.length - 1, 'reaches the bottom and stays there');
});

test('when the device recovers, quality comes back slowly', () => {
  const quality = new AdaptiveQuality();
  run(quality, 3, 30);
  assert.equal(quality.level, 1);
  run(quality, 5, 60);
  assert.equal(quality.level, 1, 'not yet');
  run(quality, 7, 60);
  assert.equal(quality.level, 0);
});

test('a step up that does not hold is given up: no flicker between two levels', () => {
  const quality = new AdaptiveQuality();
  run(quality, 3, 30); // down to 1
  run(quality, 12, 60); // back up to 0
  assert.equal(quality.level, 0);
  run(quality, 3.2, 30); // too much: down again
  assert.equal(quality.level, 1);
  const changes = run(quality, 60, 60);
  assert.equal(changes, 0, 'stays put for a long while');
  assert.equal(quality.level, 1);
});
