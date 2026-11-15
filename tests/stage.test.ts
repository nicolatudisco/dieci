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

test('a lens stays inside the free area, away from its object and from what it must not cover', async () => {
  const { makeFraming, placeLens, LENS_CAPTION_ROOM } = await import('../src/engine/framing.ts');
  const free = { x: 0, y: 170, width: 390, height: 290 };
  const f = makeFraming(390, 844, free, 13, [0, 0, 0]);
  const marker = { x: 190 - 120, y: 322 - 18, width: 240, height: 36 };
  for (const anchor of [{ x: 232, y: 302 }, { x: 60, y: 200 }, { x: 370, y: 440 }, { x: 195, y: 315 }]) {
    for (const preferred of [0, 70, 180, 270]) {
      const lens = placeLens(f, anchor, preferred, [marker]);
      assert.ok(lens.x - lens.radius >= free.x && lens.x + lens.radius <= free.x + free.width, 'inside, horizontally');
      assert.ok(lens.y - lens.radius >= free.y && lens.y + lens.radius + LENS_CAPTION_ROOM <= free.y + free.height + 0.5, 'inside, with its text');
      assert.ok(Math.hypot(lens.x - anchor.x, lens.y - anchor.y) > lens.radius, 'does not cover its own object');
    }
  }
  // With room to spare, the preferred direction is kept, and so is the previous one.
  const wide = makeFraming(1180, 820, { x: 0, y: 0, width: 760, height: 820 }, 13, [0, 0, 0]);
  assert.equal(placeLens(wide, { x: 380, y: 410 }, 70).angle, 70);
  assert.equal(placeLens(wide, { x: 380, y: 410 }, 70, [], 110).angle, 110);
});
