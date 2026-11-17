import assert from 'node:assert/strict';
import { test } from 'node:test';
import { WEB, basins, distanceToOutline, fft2, findLaniakea, inside, makeField, sample } from '../src/cosmic-web.ts';
import { ANCHORS, LY } from '../src/engine/stage.ts';

const near = (actual: number, expected: number, tolerance: number, message?: string): void => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message ?? ''} expected ${expected} ± ${tolerance}, got ${actual}`);
};

test('the FFT goes there and back', () => {
  const n = 16;
  const re = Float64Array.from({ length: n * n }, (_, i) => Math.sin(i * 0.37) + (i % 5));
  const im = new Float64Array(n * n);
  const copy = re.slice();
  fft2(re, im, n, false);
  fft2(re, im, n, true);
  for (let i = 0; i < n * n; i++) {
    near(re[i]!, copy[i]!, 1e-9);
    near(im[i]!, 0, 1e-9);
  }
});

const field = makeField();
const label = basins(field);
const laniakea = findLaniakea(field, label, WEB.us, WEB.attractorAngle);

test('the web is the same every time', () => {
  const again = makeField();
  for (const k of [0, 1234, 99_999, 262_143]) {
    assert.equal(again.slideX[k], field.slideX[k]);
    assert.equal(again.density[k], field.density[k]);
  }
});

test('the web has walls and filaments around emptier voids', () => {
  let dense = 0;
  let empty = 0;
  for (const d of field.density) {
    if (d > 2) dense++;
    if (d < 0.6) empty++;
  }
  const share = (count: number): number => count / field.density.length;
  assert.ok(share(dense) > 0.08 && share(dense) < 0.5, `dense cells: ${share(dense)}`);
  assert.ok(share(empty) > 0.15, `emptied cells: ${share(empty)}`);
});

test('Laniakea: about 520 million light-years across, with us near its edge', () => {
  near(laniakea.width, 520, 30, 'width');
  assert.ok(inside(laniakea.outline, 0, 0), 'we are inside');
  const edge = distanceToOutline(laniakea.outline, 0, 0);
  assert.ok(edge > 10 && edge < 60, `distance from the edge: ${edge}`);
  // Our galaxy is in a sheet or a filament, not in a void.
  assert.ok(sample(field, field.density, WEB.us[0], WEB.us[1]) > 1.2);
});

test('the Great Attractor is at its true longitude, a few hundred million light-years away', () => {
  const [x, y] = laniakea.attractor;
  near((Math.atan2(y, x) * 180) / Math.PI, WEB.attractorAngle, 0.5, 'angle');
  const distance = Math.hypot(x, y);
  assert.ok(distance > 150 && distance < 320, `distance: ${distance}`);
});

test('the stage anchor of Laniakea is the centre of our basin', () => {
  near(laniakea.centroid[0], WEB.centre[0], 1, 'x');
  near(laniakea.centroid[1], WEB.centre[1], 1, 'y');
  near((ANCHORS.laniakea[0] - ANCHORS.earth[0]) / (1e6 * LY), WEB.centre[0], 1e-6);
  near((ANCHORS.laniakea[1] - ANCHORS.earth[1]) / (1e6 * LY), WEB.centre[1], 1e-6);
});

test('what the scenes draw: about 100,000 galaxies in Laniakea, a picture of the whole web', async () => {
  const { buildWebData } = await import('../src/cosmic-web.ts');
  const data = buildWebData();
  const count = data.laniakea.density.length;
  assert.ok(count > 85_000 && count < 120_000, `galaxies in Laniakea: ${count}`);
  for (const set of [data.laniakea, data.around, data.web]) {
    for (const d of set.density) assert.ok(d > 0 && Number.isFinite(d));
    for (const p of set.positions) assert.ok(Number.isFinite(p));
  }
  // No galaxy of the web on top of the Local Group.
  for (let i = 0; i < data.web.positions.length; i += 2) assert.ok(Math.hypot(data.web.positions[i]!, data.web.positions[i + 1]!) >= 6);
  let sum = 0;
  for (const v of data.texture.data) sum += v;
  const mean = sum / data.texture.data.length;
  assert.ok(mean > 20 && mean < 120, `mean of the picture: ${mean}`);
});
