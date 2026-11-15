import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Clock } from '../src/engine/clock.ts';
import { VOYAGER_1 } from '../src/content/data.ts';
import { parseRoute } from '../src/route.ts';

test('no parameters: the opening, or the first stop in static mode', () => {
  assert.deepEqual(parseRoute(''), { u: -1, overlay: null, isStatic: false, debug: false });
  assert.deepEqual(parseRoute('?static=1'), { u: 0, overlay: null, isStatic: true, debug: false });
  assert.equal(parseRoute('?debug=1').debug, true);
});

test('?s is the exponent, Act I only', () => {
  assert.equal(parseRoute('?s=13.7').u, 13.7);
  assert.equal(parseRoute('?s=13,7').u, 13.7);
  assert.equal(parseRoute('?s=-3').u, 0);
  assert.equal(parseRoute('?s=40').u, 26.94);
  assert.equal(parseRoute('?s=abc&static=1').u, 0);
});

test('?stop accepts every stop and the five views', () => {
  assert.equal(parseRoute('?stop=bolla').u, 17.5);
  assert.equal(parseRoute('?stop=googol').u, 33);
  assert.equal(parseRoute('?stop=apertura&static=1').u, -1);
  assert.equal(parseRoute('?stop=finale').u, 37);
  assert.equal(parseRoute('?stop=epilogo').u, 38.5);
  assert.deepEqual(parseRoute('?stop=disco&static=1'), { u: 13.7, overlay: 'disco', isStatic: true, debug: false });
  assert.deepEqual(parseRoute('?stop=fonti'), { u: 38.5, overlay: 'fonti', isStatic: false, debug: false });
  assert.equal(parseRoute('?stop=nonesiste').u, -1);
});

test('precedence: stop, then u, then s', () => {
  assert.equal(parseRoute('?stop=terra&s=3&u=30').u, 7.2);
  assert.equal(parseRoute('?u=28&s=3').u, 28);
  assert.equal(parseRoute('?u=99').u, 38.5);
  assert.equal(parseRoute('?u=-5').u, -1);
});

test('the static clock is frozen on the Voyager light-day moment', () => {
  const clock = new Clock(true);
  clock.tick(1000);
  clock.tick(5000);
  assert.equal(clock.time, 0);
  assert.equal(clock.dt, 0);
  assert.equal(clock.now().toISOString(), new Date(VOYAGER_1.lightDayDateUTC).toISOString());

  const live = new Clock(false);
  live.tick(1000);
  live.tick(1016);
  assert.ok(Math.abs(live.dt - 0.016) < 1e-9);
  live.tick(60_000);
  assert.equal(live.dt, 0.1);
});
