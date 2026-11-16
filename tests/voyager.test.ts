import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LIGHT_DAY_KM, VOYAGER_1, VOYAGER_1_DISTANCE } from '../src/content/data.ts';
import { voyagerDistanceKm, voyagerMilestone } from '../src/voyager.ts';

const DAY = 86_400_000;
/** Horizons gives its vector tables in TDB: TDB - UTC = 69.184 s (see scripts/voyager-horizons.mjs). */
const tdb = (iso: string): Date => new Date(Date.parse(`${iso}Z`) - 69_184);

test('between two samples the table stays within 20 km of JPL Horizons', () => {
  // Geometric distances from the centre of the Earth, asked to Horizons one by one
  // (trajectory Voyager_1_ST+refit2022_m): none of these instants is a sample of the table.
  const heldOut: [string, number][] = [
    ['2026-11-16T12:00:00', 25_897_770_787.49],
    ['2026-11-18T10:17:00', 25_902_067_960.15],
    ['2026-11-19T18:00:00', 25_904_938_814.18],
    ['2027-03-10T07:00:00', 25_947_807_020.33],
    ['2027-03-22T19:30:00', 25_939_864_512.83],
    ['2031-08-22T13:30:00', 28_283_881_222.14],
    ['2040-06-01T03:00:00', 32_863_147_752.83],
  ];
  for (const [when, km] of heldOut) {
    const error = voyagerDistanceKm(tdb(when)) - km;
    assert.ok(Math.abs(error) < 20, `${when}: off by ${error.toFixed(1)} km`);
  }
});

test('the table says one light-day at the moment data.ts says', () => {
  const moment = Date.parse(VOYAGER_1.lightDayDateUTC);
  // At about 25 km/s, 40 km is less than two seconds.
  assert.ok(Math.abs(voyagerDistanceKm(new Date(moment)) - LIGHT_DAY_KM) < 40);
  assert.ok(voyagerDistanceKm(new Date(moment - 60_000)) < LIGHT_DAY_KM);
  assert.ok(voyagerDistanceKm(new Date(moment + 60_000)) > LIGHT_DAY_KM);
  assert.equal(voyagerMilestone(new Date(moment - 1)), 'before');
  assert.equal(voyagerMilestone(new Date(moment)), 'after');
});

test('after that moment Voyager 1 is never again closer than one light-day', () => {
  // «Dal 18 novembre 2026 è a più di un giorno-luce da noi» must stay true for ever, even in
  // the months in which the Earth catches up with the probe.
  const moment = Date.parse(VOYAGER_1.lightDayDateUTC);
  const end = VOYAGER_1_DISTANCE.startMs + (VOYAGER_1_DISTANCE.km.length - 1) * VOYAGER_1_DISTANCE.stepMs;
  for (let ms = moment + 60_000; ms < end + 400 * DAY; ms += DAY / 4) {
    assert.ok(voyagerDistanceKm(new Date(ms)) > LIGHT_DAY_KM, new Date(ms).toISOString());
  }
});

test('the distance from the Earth shrinks for a part of every year', () => {
  // The reason for UI.voyager.sincePageOpenedCloser.
  const rate = (iso: string): number => voyagerDistanceKm(new Date(Date.parse(iso) + 1000)) - voyagerDistanceKm(new Date(iso));
  assert.ok(rate('2026-11-18T12:00:00Z') > 24, 'November: more than 24 km every second');
  assert.ok(rate('2027-03-10T12:00:00Z') < -7, 'March: closer every second');
  assert.ok(rate('2027-07-10T12:00:00Z') > 0, 'July: away again');
  assert.ok(rate('2033-03-10T12:00:00Z') < 0, 'and so every year');
});

test('outside the years of the table the distance goes on without a jump', () => {
  const { startMs, stepMs, km } = VOYAGER_1_DISTANCE;
  const end = startMs + (km.length - 1) * stepMs;
  for (const edge of [startMs, end]) {
    const jump = voyagerDistanceKm(new Date(edge + 1000)) - voyagerDistanceKm(new Date(edge - 1000));
    assert.ok(Math.abs(jump) < 120, `jump of ${jump.toFixed(1)} km around ${new Date(edge).toISOString()}`);
  }
  // Ten years past the table: farther, at the speed of the probe.
  const later = voyagerDistanceKm(new Date(end + 3652.5 * DAY));
  assert.ok(Math.abs(later - (km[km.length - 1] ?? 0) - 3652.5 * 86_400 * VOYAGER_1.speedKmS) < 1);
});
