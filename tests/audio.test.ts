import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NODES, U_MAX, U_MIN } from '../src/engine/journey.ts';
import { REGIONS, SOUNDS, TICKS, chimeNote, regionWeights, tickAt } from '../src/audio/soundscape.ts';

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

test('each chime is a step of the pentatonic higher, over two octaves, then the climb starts again', () => {
  const semitones = (i: number): number => 12 * Math.log2(chimeNote(i) / chimeNote(0));
  for (let i = 0; i < TICKS.length; i++) {
    const f = chimeNote(i);
    assert.ok(f >= 329 && f <= 1110, `chime ${i}: ${f.toFixed(0)} Hz, between E4 and C♯6`);
    const step = Math.round(semitones(i + 1) - semitones(i));
    if ((i + 1) % 10 === 0) assert.equal(Math.round(semitones(i + 1)), 0, `chime ${i + 1} starts again from E4`);
    else assert.ok(step === 2 || step === 3, `from chime ${i} to the next: ${step} semitones`);
  }
});

test('the background has no noise in it, and more space as the journey goes out', () => {
  assert.ok(SOUNDS.home.space < SOUNDS.planets.space && SOUNDS.planets.space < SOUNDS.stars.space && SOUNDS.stars.space <= SOUNDS.numbers.space);
  for (const region of REGIONS) assert.ok(SOUNDS[region].voices.every((voice) => voice.type === 'sine' || voice.type === 'triangle'));
});
