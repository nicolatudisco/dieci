import assert from 'node:assert/strict';
import { test } from 'node:test';
import { STOPS } from '../src/content/levels.ts';
import {
  E_MAX,
  EPILOGUE,
  FINALE,
  FIRST_STOP,
  INTRO,
  NODES,
  cameraExponent,
  exponentAt,
  nearestStop,
  neighbour,
  nodeById,
  segmentAt,
  snapTarget,
  travelDuration,
} from '../src/engine/journey.ts';

test('the axis has the opening, every stop, the finale and the epilogue, in order', () => {
  assert.equal(NODES.length, STOPS.length + 3);
  assert.equal(NODES[0], INTRO);
  assert.equal(FIRST_STOP.id, 'partenza');
  assert.equal(NODES[NODES.length - 2], FINALE);
  assert.equal(NODES[NODES.length - 1], EPILOGUE);
  for (let i = 1; i < NODES.length; i++) {
    assert.ok(NODES[i].u > NODES[i - 1].u, `${NODES[i].id} must come after ${NODES[i - 1].id}`);
  }
});

test('in Act I the position is the exponent', () => {
  for (const stop of STOPS.filter((s) => s.kind === 'space')) {
    assert.equal(nodeById(stop.id)?.u, stop.exponent);
  }
  assert.equal(E_MAX, 26.94);
  assert.equal(exponentAt(13.7), 13.7);
  assert.equal(exponentAt(-1), 0);
  assert.equal(exponentAt(31), 26.94);
});

test('Act II stops sit at fixed steps, never at their exponents', () => {
  assert.deepEqual(
    ['oltre', 'atomi', 'googol', 'googolplex'].map((id) => nodeById(id)?.u),
    [29, 31, 33, 35],
  );
  assert.equal(FINALE.u, 37);
  assert.equal(EPILOGUE.u, 38.5);
});

test('the camera exponent is continuous and keeps growing past the universe', () => {
  assert.ok(Math.abs(cameraExponent(-1) - -0.35) < 1e-12);
  assert.equal(cameraExponent(0), 0);
  assert.equal(cameraExponent(12.3), 12.3);
  assert.equal(cameraExponent(E_MAX), E_MAX);
  assert.ok(cameraExponent(29) > 29.9);
  let previous = cameraExponent(-1);
  for (let u = -0.99; u <= 38.5; u += 0.01) {
    const e = cameraExponent(u);
    assert.ok(e >= previous && e - previous < 0.02, `jump at u=${u}`);
    previous = e;
  }
});

test('▶ always leads to the next node, ◀ never past the first stop', () => {
  assert.equal(neighbour(-1, 1)?.id, 'partenza');
  assert.equal(neighbour(0, 1)?.id, 'strada');
  assert.equal(neighbour(0.4, 1)?.id, 'strada');
  assert.equal(neighbour(13.7, 1)?.id, 'oort');
  assert.equal(neighbour(26.94, 1)?.id, 'oltre');
  assert.equal(neighbour(35, 1)?.id, 'finale');
  assert.equal(neighbour(38.5, 1), null);
  assert.equal(neighbour(0, -1), null);
  assert.equal(neighbour(0.4, -1)?.id, 'partenza');
  assert.equal(neighbour(29, -1)?.id, 'universo');
});

test('pressing ▶ from the first stop visits every node exactly once', () => {
  const visited: string[] = [];
  let node = neighbour(INTRO.u, 1);
  while (node) {
    visited.push(node.id);
    node = neighbour(node.u, 1);
  }
  assert.deepEqual(visited, NODES.slice(1).map((n) => n.id));
});

test('segments and nearest stop', () => {
  const seg = segmentAt(0.5);
  assert.equal(seg.from.id, 'partenza');
  assert.equal(seg.to.id, 'strada');
  assert.equal(seg.t, 0.5);
  assert.equal(segmentAt(100).from, EPILOGUE);
  assert.equal(nearestStop(15).id, 'voyager');
  assert.equal(nearestStop(15.1).id, 'oort');
  assert.equal(nearestStop(38).id, 'googolplex');
});

test('capture zones are narrower between close stops and never overlap', () => {
  assert.equal(snapTarget(3.2)?.id, 'quartiere');
  assert.equal(snapTarget(3.4), null);
  assert.equal(snapTarget(15), null);
  assert.equal(snapTarget(11.84)?.id, 'sole');
  assert.equal(snapTarget(11.9), null);
  assert.equal(snapTarget(12.06)?.id, 'giove');
  assert.equal(snapTarget(-0.5), null);
});

test('trips last 1.5 s for one power of ten and at most 3 s', () => {
  assert.equal(travelDuration(1), 1.5);
  assert.equal(travelDuration(-1), 1.5);
  assert.equal(travelDuration(2.7), 3);
  assert.equal(travelDuration(5), 3);
  assert.ok(travelDuration(0.1) < 1);
});
