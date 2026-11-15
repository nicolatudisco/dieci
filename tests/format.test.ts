import assert from 'node:assert/strict';
import { test } from 'node:test';
import { STOPS } from '../src/content/levels.ts';
import { formatNumber, formatWidth, roundSig, splitWidth } from '../src/ui/format.ts';

test('Italian separators', () => {
  assert.equal(formatNumber(0), '0');
  assert.equal(formatNumber(999), '999');
  assert.equal(formatNumber(1600), '1.600');
  assert.equal(formatNumber(25902068371), '25.902.068.371');
  assert.equal(formatNumber(8.6, 1), '8,6');
  assert.equal(formatNumber(10.0, 1), '10');
  assert.equal(formatNumber(1234.56, 1), '1.234,6');
});

test('two significant figures', () => {
  assert.equal(roundSig(1258.9, 2), 1300);
  assert.equal(roundSig(0.1057, 2), 0.11);
  assert.equal(roundSig(0, 2), 0);
});

test('the examples in CLAUDE.md', () => {
  assert.equal(formatWidth(1.6e6), '1.600 km');
  assert.equal(formatWidth(9.5e12), '9,5 miliardi di km');
});

test('the width shown at every stop of Act I', () => {
  const expected: Record<string, string> = {
    partenza: '1 m',
    strada: '10 m',
    rifredi: '100 m',
    quartiere: '1 km',
    firenze: '10 km',
    toscana: '100 km',
    italia: '1.300 km',
    terra: '16.000 km',
    luna: '1 milione di km',
    sole: '400 milioni di km',
    giove: '2 miliardi di km',
    'pianeti-lontani': '10 miliardi di km',
    voyager: '50 miliardi di km',
    oort: '2,7 anni-luce',
    bolla: '33 anni-luce',
    nebulose: '2.700 anni-luce',
    'via-lattea': '170.000 anni-luce',
    andromeda: '6,7 milioni di anni-luce',
    laniakea: '670 milioni di anni-luce',
    'rete-cosmica': '4,2 miliardi di anni-luce',
    universo: '92 miliardi di anni-luce',
  };
  const space = STOPS.filter((s) => s.kind === 'space');
  assert.equal(space.length, Object.keys(expected).length);
  for (const stop of space) assert.equal(formatWidth(10 ** stop.exponent), expected[stop.id], stop.id);
});

test('singular and plural, and the edges between units', () => {
  assert.equal(formatWidth(0.45), '45 cm');
  assert.equal(formatWidth(3.1623), '3,2 m');
  assert.equal(formatWidth(999.6), '1 km');
  assert.equal(formatWidth(1e12), '1 miliardo di km');
  assert.equal(formatWidth(2e12), '2 miliardi di km');
  assert.equal(formatWidth(9.4607304725808e15), '1 anno-luce');
  assert.equal(formatWidth(1e15), '0,11 anni-luce');
  assert.equal(formatWidth(9.4607304725808e21), '1 milione di anni-luce');
  assert.equal(formatWidth(9.4607304725808e24), '1 miliardo di anni-luce');
});

test('units only ever get bigger while zooming out', () => {
  const units = [
    'cm',
    'm',
    'km',
    'milione di km',
    'milioni di km',
    'miliardo di km',
    'miliardi di km',
    'anno-luce',
    'anni-luce',
    'milione di anni-luce',
    'milioni di anni-luce',
    'miliardo di anni-luce',
    'miliardi di anni-luce',
  ];
  // Singular and plural of the same unit share a rank.
  const rank = (unit: string) =>
    units.indexOf(unit.replace(/^milione/, 'milioni').replace(/^miliardo/, 'miliardi').replace('anno-', 'anni-'));
  let previous = -1;
  for (let e = -0.35; e <= 26.94; e += 0.01) {
    const { value, unit } = splitWidth(10 ** e);
    assert.match(value, /^\d[\d.]*(,\d{1,2})?$/, `e=${e.toFixed(2)}: ${value}`);
    const current = rank(unit);
    assert.ok(current >= 0, `unknown unit "${unit}" at e=${e.toFixed(2)}`);
    assert.ok(current >= previous, `unit went backwards at e=${e.toFixed(2)}: ${unit}`);
    previous = current;
  }
  assert.equal(units[previous], 'miliardi di anni-luce');
});

test('number and unit can be styled separately', () => {
  assert.deepEqual(splitWidth(10 ** 25.6), { value: '4,2', unit: 'miliardi di anni-luce' });
});
