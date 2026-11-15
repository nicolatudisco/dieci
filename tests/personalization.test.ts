import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  birthdayAfter,
  civilDateOf,
  fillName,
  firstLineKey,
  parseCivilDate,
  parseHash,
} from '../src/personalization.ts';

// Dates in these tests are invented: no real birthday is ever written in the repo.

test('reads name and date from the fragment', () => {
  assert.deepEqual(parseHash('#nome=Ada&nata=2001-02-03'), {
    name: 'Ada',
    birth: { year: 2001, month: 2, day: 3 },
  });
  assert.deepEqual(parseHash(''), { name: null, birth: null });
  assert.deepEqual(parseHash('#nata=2001-02-03'), { name: null, birth: { year: 2001, month: 2, day: 3 } });
  assert.equal(parseHash('#nome=Maria%20Sole').name, 'Maria Sole');
});

test('a name is plain text, short, and must contain a letter', () => {
  assert.equal(parseHash('#nome=%3Cb%3EAda%3C/b%3E').name, 'bAda/b');
  assert.equal(parseHash('#nome=123').name, null);
  assert.equal(parseHash('#nome=%20%20').name, null);
  assert.equal(parseHash(`#nome=${'a'.repeat(80)}`).name?.length, 24);
});

test('only real calendar dates are accepted', () => {
  assert.equal(parseCivilDate('2001-02-30'), null);
  assert.equal(parseCivilDate('2001-13-01'), null);
  assert.equal(parseCivilDate('01-02-2001'), null);
  assert.equal(parseCivilDate('2001-2-3'), null);
  assert.equal(parseCivilDate(null), null);
  assert.deepEqual(parseCivilDate('2004-02-29'), { year: 2004, month: 2, day: 29 });
});

test('the first line is true on every day', () => {
  const birth = { year: 2001, month: 2, day: 3 };
  assert.equal(firstLineKey(null, { year: 2011, month: 2, day: 3 }), 'unknown');
  assert.equal(firstLineKey(birth, { year: 2011, month: 2, day: 2 }), 'before');
  assert.equal(firstLineKey(birth, { year: 2011, month: 2, day: 3 }), 'birthday');
  assert.equal(firstLineKey(birth, { year: 2011, month: 2, day: 4 }), 'after');
  assert.equal(firstLineKey(birth, { year: 2010, month: 12, day: 31 }), 'before');
  assert.equal(firstLineKey(birth, { year: 2012, month: 2, day: 3 }), 'after');
});

test('a 29 February birthday falls on the last day of February', () => {
  assert.deepEqual(birthdayAfter({ year: 2004, month: 2, day: 29 }, 10), { year: 2014, month: 2, day: 28 });
  assert.deepEqual(birthdayAfter({ year: 2004, month: 2, day: 29 }, 4), { year: 2008, month: 2, day: 29 });
});

test('the civil date follows the device clock', () => {
  assert.deepEqual(civilDateOf(new Date(2011, 1, 3, 23, 59)), { year: 2011, month: 2, day: 3 });
});

test('{nome} is filled, or disappears cleanly', () => {
  assert.equal(fillName('Ciao, {nome}.', 'Ada'), 'Ciao, Ada.');
  assert.equal(fillName('Buon viaggio, {nome}!', null), 'Buon viaggio!');
  assert.equal(fillName('{nome}, guarda in alto.', null), 'Guarda in alto.');
  assert.equal(fillName('Per te {nome} e basta', null), 'Per te e basta');
  assert.equal(fillName('Per te, {nome}.', null, 'piccola'), 'Per te, piccola.');
  assert.equal(fillName('Niente da cambiare.', null), 'Niente da cambiare.');
});
