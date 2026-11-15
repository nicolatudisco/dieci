import assert from 'node:assert/strict';
import { test } from 'node:test';
import { STOPS } from '../src/content/levels.ts';
import { NODES, nodeById } from '../src/engine/journey.ts';
import { counterAt } from '../src/ui/counter-model.ts';

test('every stop of Act I shows its exponent rounded to the nearest integer', () => {
  for (const stop of STOPS.filter((s) => s.kind === 'space')) {
    const state = counterAt(stop.exponent);
    assert.equal(state.mode, 'space');
    assert.equal(state.exponent, String(Math.round(stop.exponent)), stop.id);
    assert.equal(state.line, stop.counterLine);
  }
  assert.equal(counterAt(26.94).exponent, '27');
  assert.equal(counterAt(26.94).width, '92 miliardi di anni-luce');
});

test('the counter ticks exactly once for every power of ten crossed', () => {
  let ticks = 0;
  let previous = counterAt(0).order;
  for (let u = 0; u <= 26.94; u += 0.001) {
    const order = counterAt(u).order;
    assert.ok(order === previous || order === previous + 1, `jump at u = ${u}`);
    if (order !== previous) ticks++;
    previous = order;
  }
  assert.equal(ticks, 27);
});

test('a long trip between two stops still ticks at every power in between', () => {
  // voyager (13.7) → oort (16.4): 10¹⁴, 10¹⁵, 10¹⁶.
  const seen = new Set<string>();
  for (let u = 13.7; u <= 16.4; u += 0.01) seen.add(counterAt(u).exponent);
  assert.deepEqual([...seen], ['14', '15', '16']);
});

test('the tick happens half-way between two powers', () => {
  assert.equal(counterAt(0.49).exponent, '0');
  assert.equal(counterAt(0.5).exponent, '1');
  assert.equal(counterAt(0.49).width, '3,1 m');
});

test('past the universe the counter keeps saying metres until the next stop is nearer', () => {
  const universe = nodeById('universo');
  const beyond = nodeById('oltre');
  assert.ok(universe && beyond);
  const middle = (universe.u + beyond.u) / 2;
  const before = counterAt(middle - 0.01);
  assert.equal(before.mode, 'space');
  assert.equal(before.exponent, '27');
  const after = counterAt(middle + 0.01);
  assert.equal(after.mode, 'number');
  assert.equal(after.exponent, '30');
  assert.equal(after.width, null);
});

test('Act II shows the numbers of its stops, never an interpolated one', () => {
  const expected: Record<string, string> = { oltre: '30', atomi: '80', googol: '100', googolplex: 'googol' };
  const numberNodes = NODES.filter((n) => n.kind === 'number');
  assert.equal(numberNodes.length, 4);
  for (const node of numberNodes) {
    assert.equal(counterAt(node.u).exponent, expected[node.id]);
    assert.equal(counterAt(node.u + 0.4).exponent, expected[node.id]);
  }
  // The order keeps growing, so the tick always rolls forward.
  const orders = numberNodes.map((n) => counterAt(n.u).order);
  assert.deepEqual([...orders].sort((a, b) => a - b), orders);
  assert.ok((orders[0] ?? 0) > counterAt(26.94).order);
});
