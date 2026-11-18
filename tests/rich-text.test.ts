import assert from 'node:assert/strict';
import { test } from 'node:test';
import { STOPS } from '../src/content/levels.ts';
import { UI } from '../src/content/ui.ts';
import { NBSP, typeset } from '../src/ui/rich-text.ts';

/** Back from what is shown to what is written: the words must be the same. */
const SUPERSCRIPTS = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const written = (shown: string): string =>
  shown
    .replace(/\^\{(\d+)\}/g, (_, digits: string) => [...digits].map((d) => SUPERSCRIPTS[Number(d)]).join(''))
    .replaceAll('’', "'")
    .replaceAll(NBSP, ' ');

test('a number never starts a line after a short word, nor ends one before its word', () => {
  assert.equal(typeset('Ma se continui a moltiplicare per 10, succede'), `Ma se continui a moltiplicare per${NBSP}10, succede`);
  assert.equal(typeset('10 sembra un numero piccolo.'), `10${NBSP}sembra un numero piccolo.`);
  assert.equal(typeset('un raggio di 10 anni-luce'), `un raggio di${NBSP}10${NBSP}anni-luce`);
  assert.equal(typeset('circa 384.000 chilometri'), `circa 384.000${NBSP}chilometri`);
  assert.equal(typeset('ce ne sono circa 10⁸⁰: un 1'), `ce ne sono circa 10^{80}: un${NBSP}1`);
  assert.equal(typeset('lungo la valle'), 'lungo la valle', 'no number, nothing changes');
});

test('on screen the texts keep every word', () => {
  const texts = [...UI.intro.lines, ...Object.values(UI.intro.firstLine), ...STOPS.flatMap((stop) => [stop.title, stop.text, stop.counterLine])];
  for (const text of texts) assert.equal(written(typeset(text)), text);
});
