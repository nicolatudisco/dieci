import assert from 'node:assert/strict';
import { test } from 'node:test';
import { STOPS } from '../src/content/levels.ts';
import { CAMERA_DISTANCE, levelView, makeFraming, projectLocal, projectStage } from '../src/engine/framing.ts';
import { ANCHORS, AU, LY, centreAt, youOffsetAt } from '../src/engine/stage.ts';

const distance = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0] - b[0], a[1] - b[1]);

test('anchors are at their true distances', () => {
  assert.ok(Math.abs(distance(ANCHORS.sun, ANCHORS.earth) / AU - 1) < 1e-12);
  assert.ok(Math.abs(distance(ANCHORS.moon, ANCHORS.earth) - 3.844e8) < 1);
  assert.ok(Math.abs(distance(ANCHORS.voyager1, ANCHORS.earth) / 2.5902068371e13 - 1) < 1e-9);
  assert.ok(Math.abs(distance(ANCHORS.orionNebula, ANCHORS.sun) / LY - 1344) < 1e-6);
  assert.ok(Math.abs(distance(ANCHORS.galacticCentre, ANCHORS.sun) / LY - 26000) < 1e-5);
  assert.ok(Math.abs(distance(ANCHORS.andromeda, ANCHORS.galacticCentre) / LY - 2.5e6) < 1e-3);
});

test('«Tu sei qui» never leaves the frame, at any scale', () => {
  for (let e = -0.35; e <= 26.94; e += 0.01) {
    const [x, y] = youOffsetAt(e);
    assert.ok(Math.hypot(x, y) < 0.45, `e=${e.toFixed(2)}: offset ${Math.hypot(x, y).toFixed(3)}`);
  }
});

test('the centre track is continuous', () => {
  let previous = youOffsetAt(-0.35);
  for (let e = -0.349; e <= 26.94; e += 0.001) {
    const current = youOffsetAt(e);
    assert.ok(distance(current, previous) < 0.004, `jump at e=${e.toFixed(3)}`);
    previous = current;
  }
});

test('the Sun stays exactly centred from `sole` to `pianeti-lontani`', () => {
  for (const e of [11.6, 11.9, 12.3, 12.7, 13]) assert.deepEqual(centreAt(e), ANCHORS.sun);
});

test('the subject of the off-centre stops is inside the frame', () => {
  const inFrame = (e: number, p: readonly number[]) => {
    const c = centreAt(e);
    return distance(p, c) / 10 ** e;
  };
  assert.ok(inFrame(13.7, ANCHORS.voyager1) < 0.3);
  assert.ok(inFrame(13.7, ANCHORS.sun) < 0.3);
  assert.ok(inFrame(19.4, ANCHORS.orionNebula) < 0.3);
  assert.ok(inFrame(19.4, ANCHORS.sun) < 0.3);
  assert.ok(inFrame(22.8, ANCHORS.andromeda) < 0.25);
  assert.ok(inFrame(22.8, ANCHORS.galacticCentre) < 0.25);
  assert.ok(inFrame(11.6, ANCHORS.earth) < 0.4);
});

test('every stop of Act I has a keyframe-defined centre', () => {
  for (const stop of STOPS.filter((s) => s.kind === 'space')) {
    const c = centreAt(stop.exponent);
    assert.ok(c.every(Number.isFinite), stop.id);
  }
});

test('framing: the «largo» is the short side of the free area minus the margin', () => {
  const f = makeFraming(1180, 820, { x: 0, y: 100, width: 800, height: 600 }, 3, [0, 0, 0]);
  assert.equal(f.cx, 400);
  assert.equal(f.cy, 400);
  assert.ok(Math.abs(f.largoPx - 552) < 1e-9);
  // The centre of the view lands on the centre of the free area...
  const centre = projectStage(f, [0, 0, 0]);
  assert.deepEqual([centre.x, centre.y, centre.scale], [400, 400, 1]);
  // ...and half a view width (500 m at e = 3) is half the «largo», y up.
  const edge = projectStage(f, [500, 500, 0]);
  assert.ok(Math.abs(edge.x - 676) < 1e-9 && Math.abs(edge.y - 124) < 1e-9);
  // Points behind the camera are not visible.
  assert.equal(projectStage(f, [0, 0, CAMERA_DISTANCE * 1000 * 1.1]).visible, false);
});

test('a level sees small numbers even at the edge of the universe', () => {
  const e = 26.94;
  const f = makeFraming(1440, 900, { x: 0, y: 0, width: 1440, height: 900 }, e, centreAt(e));
  const view = levelView(f, 1e10 * LY, ANCHORS.earth);
  assert.ok(Math.abs(view.viewWidth - 9.206) < 0.01);
  assert.ok(view.target.every((v) => Math.abs(v) < 1e-9));
  const p = projectLocal(f, view, [4.6, 0, 0]);
  const q = projectStage(f, [ANCHORS.earth[0] + 4.6e10 * LY, ANCHORS.earth[1], ANCHORS.earth[2]]);
  assert.ok(Math.abs(p.x - q.x) < 1e-6 && Math.abs(p.y - q.y) < 1e-6);
});

test('precision: a level origin far from the stage origin still gives exact local coordinates', () => {
  // The Milky Way level, 26,000 light-years from «Tu sei qui», at its own stop.
  const e = 21.2;
  const f = makeFraming(1000, 1000, { x: 0, y: 0, width: 1000, height: 1000 }, e, centreAt(e));
  const view = levelView(f, 1e4 * LY, ANCHORS.galacticCentre);
  assert.deepEqual(view.target, [0, 0, 0]);
  const sun = projectStage(f, ANCHORS.sun);
  const local = projectLocal(f, view, [0, -2.6, 0]);
  assert.ok(Math.abs(sun.x - local.x) < 1e-3 && Math.abs(sun.y - local.y) < 1e-3);
});
