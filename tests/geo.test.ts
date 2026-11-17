import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { centreAt } from '../src/engine/stage.ts';
import { decodeGeo, decodePoints, insideRing, ringBox, type GeoFileRaw } from '../src/levels/geo/format.ts';

const read = (name: string): GeoFileRaw => JSON.parse(fs.readFileSync(new URL(`../public/data/${name}`, import.meta.url), 'utf8')) as GeoFileRaw;

test('geodata: differences decode to absolute metres', () => {
  assert.deepEqual([...decodePoints([10, 20, 5, -5, -15, 0], 0.5)], [5, 10, 7.5, 7.5, 0, 7.5]);
  const file = decodeGeo({
    v: 1,
    q: 0.1,
    box: [0, 0, 1, 1],
    lines: { road: [[2, 95, 0, 0, 100, 0]] },
    areas: { green: [[1, [0, 0, 10, 0, 0, 10, -10, 0]]] },
    points: { here: [1, 2] },
  });
  const road = file.lines.road?.[0];
  assert.equal(road?.cls, 2);
  assert.equal(road?.width, 9.5);
  assert.deepEqual([...(road?.points ?? [])], [0, 0, 10, 0]);
  const ring = file.areas.green?.[0]?.rings[0];
  assert.ok(ring && insideRing(ring, 0.5, 0.5) && !insideRing(ring, 1.5, 0.5));
  assert.deepEqual(ringBox(ring), [0, 0, 1, 1]);
});

test('geodata: the street in front of the starting point is close and plausible', () => {
  const { street } = decodeGeo(read('rifredi.json'));
  assert.ok(street, 'rifredi.json has the street');
  const distance = Math.hypot(...street.centre);
  assert.ok(distance > 3 && distance < 25, `centre line ${distance.toFixed(1)} m away`);
  assert.ok(street.width > 5 && street.width < 30, `width ${street.width} m`);
  assert.ok(street.angle >= 0 && street.angle < 180);
});

test('geodata: the former Officine Galileo and the station are where the texts say', () => {
  const city = decodeGeo(read('city.json'));
  const ring = city.areas.officine?.[0]?.rings[0];
  assert.ok(ring, 'the outline of the former Officine Galileo is in city.json');
  let near = Infinity;
  let far = 0;
  for (let i = 0; i < ring.length; i += 2) {
    const d = Math.hypot(ring[i] ?? 0, ring[i + 1] ?? 0);
    near = Math.min(near, d);
    far = Math.max(far, d);
  }
  // «Qui, per circa 70 anni…»: within the view of 1 km of `quartiere` (see stage.ts).
  assert.ok(near > 600 && far < 1100, `${near.toFixed(0)}–${far.toFixed(0)} m`);
  const station = city.points.station;
  assert.ok(station && Math.hypot(...station) < 400, 'the station of Rifredi is close');
  const duomo = city.points.duomo;
  // «Da Rifredi al Duomo ci sono circa 3 chilometri».
  assert.ok(duomo && Math.hypot(...duomo) > 2500 && Math.hypot(...duomo) < 3700);
});

test('quartiere: she, the station and the whole former Officine Galileo are inside the view of 1 km', () => {
  const city = decodeGeo(read('city.json'));
  const [cx, cy] = centreAt(3);
  const inside = (x: number, y: number) => Math.abs(x - cx) < 460 && Math.abs(y - cy) < 460;
  assert.ok(inside(0, 0), '«Tu sei qui»');
  const station = city.points.station;
  assert.ok(station && inside(...station), 'the station');
  const ring = city.areas.officine?.[0]?.rings[0];
  assert.ok(ring);
  for (let i = 0; i < ring.length; i += 2) assert.ok(inside(ring[i] ?? 0, ring[i + 1] ?? 0), `vertex ${i / 2}`);
});
