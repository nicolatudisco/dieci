import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NODES, U_MAX, U_MIN } from '../src/engine/journey.ts';
import { REGIONS, SOUNDS, TICKS, regionWeights, tickAt, tickPartials, tickSemitones } from '../src/audio/soundscape.ts';

test('the regions of the background add up to one everywhere, and never jump', () => {
  let before = regionWeights(U_MIN);
  for (let u = U_MIN; u <= U_MAX; u += 0.01) {
    const now = regionWeights(u);
    const sum = REGIONS.reduce((s, r) => s + now[r], 0);
    assert.ok(Math.abs(sum - 1) < 1e-9, `at u = ${u.toFixed(2)} they add up to ${sum}`);
    for (const r of REGIONS) assert.ok(Math.abs(now[r] - before[r]) < 0.03, `${r} jumps at u = ${u.toFixed(2)}`);
    before = now;
  }
});

test('each part of the journey has its colour', () => {
  const at = (id: string): number => NODES.find((node) => node.id === id)?.u ?? NaN;
  assert.equal(regionWeights(at('apertura')).opening, 1);
  assert.equal(regionWeights(at('rifredi')).home, 1);
  assert.equal(regionWeights(at('giove')).planets, 1);
  assert.equal(regionWeights(at('bolla')).stars, 1);
  assert.equal(regionWeights(at('universo')).stars, 1);
  assert.equal(regionWeights(at('googol')).numbers, 1);
  assert.equal(regionWeights(at('finale')).finale, 1);
  // Brighter as the journey goes out, until the numbers.
  assert.ok(SOUNDS.home.cutoff < SOUNDS.planets.cutoff && SOUNDS.planets.cutoff < SOUNDS.stars.cutoff && SOUNDS.stars.cutoff < SOUNDS.numbers.cutoff);
});

test('a chime for every power the counter ticks through, in order', () => {
  assert.equal(TICKS.length, 32);
  assert.equal(tickAt(0), 0);
  assert.equal(tickAt(13.7), 14);
  assert.equal(tickAt(26.94), 27);
  const googol = NODES.find((node) => node.id === 'googol');
  assert.equal(tickAt(googol?.u ?? NaN), TICKS.indexOf('100'));
});

test('each chime is a step higher than the one before, and the sound never leaves its register', () => {
  const centre = (index: number): number => tickPartials(index).reduce((sum, p) => sum + p.gain * Math.log2(p.freq), 0);
  const first = centre(0);
  for (let i = 0; i < TICKS.length; i++) {
    const step = tickSemitones(i + 1) - tickSemitones(i);
    assert.ok(step === 2 || step === 3, `from chime ${i} to the next: ${step} semitones`);
    const partials = tickPartials(i);
    assert.ok(Math.abs(partials.reduce((s, p) => s + p.gain, 0) - 1) < 1e-9);
    for (const p of partials) assert.ok(p.freq > 60 && p.freq < 2200, `chime ${i}: ${p.freq.toFixed(0)} Hz`);
    assert.ok(Math.abs(centre(i) - first) < 0.6, `chime ${i} drifts out of its register`);
  }
});
