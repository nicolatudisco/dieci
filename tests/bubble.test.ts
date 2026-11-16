import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BUBBLE_ANCHORS, ageInYears, bubbleAt, bubbleStop, exactRadiusLine, formatRadius } from '../src/bubble.ts';
import { NEARBY_STARS } from '../src/content/data.ts';
import { STOPS } from '../src/content/levels.ts';
import { counterAt } from '../src/ui/counter-model.ts';

// Dates in these tests are invented: no real birthday is ever written in the repo.
const BIRTH = { year: 2015, month: 6, day: 1 };
const at = (year: number, month: number, day: number, hour = 12): Date => new Date(year, month - 1, day, hour);

const found = STOPS.find((s) => s.id === 'bolla');
if (!found) throw new Error('levels.ts has no stop "bolla"');
const stop = found;
const reached = (bubble: ReturnType<typeof bubbleAt>, name: string): boolean => {
  const item = bubble.stars.find((s) => s.star.name === name);
  assert.ok(item, `no star "${name}"`);
  return item.reached;
};

test('the words that the variants replace are in levels.ts, once each', () => {
  const count = (text: string | undefined, part: string): number => (text ?? '').split(part).length - 1;
  assert.equal(count(stop.title, BUBBLE_ANCHORS.title), 1);
  assert.equal(count(stop.text, BUBBLE_ANCHORS.travelling), 1);
  assert.equal(count(stop.text, BUBBLE_ANCHORS.radius), 1);
  assert.equal(count(stop.more, BUBBLE_ANCHORS.epsilonLater), 1);
  assert.equal(count(stop.howWeKnow, BUBBLE_ANCHORS.cygniOutside), 1);
  assert.ok(stop.more?.endsWith(BUBBLE_ANCHORS.epsilonLater), 'the sentence about Epsilon Eridani closes `more`');
  assert.ok(stop.howWeKnow?.endsWith(BUBBLE_ANCHORS.cygniOutside), 'the sentence about 61 Cygni closes `howWeKnow`');
});

test('age is counted on the calendar: a whole number on every birthday', () => {
  assert.equal(ageInYears(BIRTH, at(2025, 6, 1, 0)), 10);
  assert.equal(ageInYears(BIRTH, at(2026, 6, 1, 0)), 11);
  assert.ok(ageInYears(BIRTH, at(2025, 5, 31)) < 10);
  assert.ok(Math.abs(ageInYears(BIRTH, at(2025, 12, 1)) - 10.5) < 0.01);
  // Born on 29 February: the birthday falls on the last day of February in other years.
  assert.equal(ageInYears({ year: 2016, month: 2, day: 29 }, at(2026, 2, 28, 0)), 10);
});

test('without a date the bubble is the one of the texts: ten light-years', () => {
  const bubble = bubbleAt(null, at(2031, 3, 3));
  assert.equal(bubble.radius, 10);
  assert.equal(bubble.exact, false);
  assert.equal(exactRadiusLine(bubble), null);
  assert.equal(bubbleStop(stop, bubble), stop);
  assert.equal(reached(bubble, 'Ross 154'), true);
  assert.equal(reached(bubble, 'Ross 248'), false);
  assert.equal(reached(bubble, 'Epsilon Eridani'), false);
});

test('a date that is not the date of this gift falls back to ten light-years', () => {
  for (const now of [at(2020, 1, 1), at(2014, 1, 1), at(2024, 11, 1)]) {
    const bubble = bubbleAt(BIRTH, now);
    assert.equal(bubble.exact, false, now.toDateString());
    assert.equal(bubble.radius, 10);
    assert.equal(bubbleStop(stop, bubble), stop);
  }
});

test('on her tenth birthday the stop reads exactly as it was written', () => {
  const bubble = bubbleAt(BIRTH, at(2025, 6, 1));
  assert.equal(bubble.exact, true);
  assert.equal(bubble.phase, 'birthday');
  assert.equal(formatRadius(bubble), '10');
  assert.deepEqual(bubbleStop(stop, bubble), stop);
  assert.equal(exactRadiusLine(bubble), 'Oggi la tua luce è arrivata a 10 anni-luce da casa.');
});

test('the day before, nothing claims ten years yet', () => {
  const bubble = bubbleAt(BIRTH, at(2025, 5, 31));
  const shown = bubbleStop(stop, bubble);
  assert.equal(bubble.phase, 'before');
  assert.equal(shown.title, stop.title);
  assert.match(shown.text, /viaggia da quasi 10 anni, .* un raggio di quasi 10 anni-luce\./);
  assert.equal(shown.counterLine, '9,9 anni-luce in ogni direzione');
  assert.equal(exactRadiusLine(bubble), 'Oggi la tua luce è arrivata a 9,9 anni-luce da casa.');
});

test('later in the year the texts say «più di», and the radius is never rounded up', () => {
  // About 10.33 years: Ross 248 (10.3) is in, Epsilon Eridani (10.5) is not.
  const bubble = bubbleAt(BIRTH, at(2025, 10, 1));
  const shown = bubbleStop(stop, bubble);
  assert.equal(bubble.phase, 'after');
  assert.equal(formatRadius(bubble), '10,3');
  assert.match(shown.text, /viaggia da più di 10 anni, .* un raggio di più di 10 anni-luce\./);
  assert.equal(shown.counterLine, '10,3 anni-luce in ogni direzione');
  assert.equal(shown.more, stop.more);
  assert.equal(reached(bubble, 'Ross 248'), true);
  assert.equal(reached(bubble, 'Epsilon Eridani'), false);
  // 10.99 years is still «10,9», not «11».
  assert.equal(formatRadius(bubbleAt(BIRTH, at(2026, 5, 30))), '10,9');
});

test('when the light reaches Epsilon Eridani, the text says so', () => {
  const bubble = bubbleAt(BIRTH, at(2026, 1, 15));
  const shown = bubbleStop(stop, bubble);
  assert.equal(reached(bubble, 'Epsilon Eridani'), true);
  assert.ok(shown.more?.endsWith('La tua luce ha già raggiunto anche Epsilon Eridani, una stella più giovane del Sole.'));
  assert.ok(!shown.more?.includes('raggiungerà'));
  assert.equal(shown.howWeKnow, stop.howWeKnow);
});

test('from her eleventh birthday the bubble has her new age, and 61 Cygni ends up inside', () => {
  const eleven = bubbleStop(stop, bubbleAt(BIRTH, at(2026, 6, 1)));
  assert.equal(eleven.title, 'La bolla dei tuoi 11 anni');
  assert.match(eleven.text, /viaggia da 11 anni, .* un raggio di 11 anni-luce\./);
  assert.equal(eleven.counterLine, '11 anni-luce in ogni direzione');
  assert.ok(eleven.howWeKnow?.endsWith('Appena fuori dalla tua bolla.'));

  const later = bubbleAt(BIRTH, at(2026, 12, 1));
  assert.equal(reached(later, '61 Cygni'), true);
  assert.ok(bubbleStop(stop, later).howWeKnow?.endsWith('Oggi è dentro la tua bolla.'));
});

test('at every age, what the texts say about a star is what the scene shows', () => {
  for (let day = 0; day < 365 * 4; day++) {
    const now = new Date(2024, 11, 15 + day, 9);
    const bubble = bubbleAt(BIRTH, now);
    if (!bubble.exact) continue;
    const shown = bubbleStop(stop, bubble);
    const when = `${now.toDateString()} (${bubble.radius.toFixed(3)})`;

    // The radius the texts write is never more than the light has really travelled.
    assert.ok(bubble.tenths <= bubble.radius + 1e-9 && bubble.radius < bubble.tenths + 0.1 + 1e-9, when);
    // «Dentro la tua bolla ci sono già…»
    for (const name of ['Proxima Centauri', 'Stella di Barnard', 'Sirio']) assert.equal(reached(bubble, name), true, `${name}, ${when}`);
    // Epsilon Eridani: «raggiungerà» only while it is outside, «ha già raggiunto» only once inside.
    assert.equal(shown.more?.includes('raggiungerà Epsilon Eridani'), !reached(bubble, 'Epsilon Eridani'), when);
    assert.equal(shown.more?.includes('ha già raggiunto anche Epsilon Eridani'), reached(bubble, 'Epsilon Eridani'), when);
    // 61 Cygni: «appena fuori» only while it is outside.
    assert.equal(shown.howWeKnow?.includes('Appena fuori dalla tua bolla'), !reached(bubble, '61 Cygni'), when);
    // Her age in the title is the one she has.
    const titleYears = Number(/(\d+) anni/.exec(shown.title)?.[1]);
    assert.equal(titleYears, Math.max(10, bubble.years), when);
    // «da N anni» without «quasi» or «più di» only when the radius reads as N.
    const plain = /viaggia da (\d+) anni/.exec(shown.text);
    if (plain) assert.equal(formatRadius(bubble), plain[1], when);
    if (shown.text.includes('quasi 10')) assert.ok(bubble.radius < 10, when);
    const more = /viaggia da più di (\d+) anni/.exec(shown.text);
    if (more) assert.ok(bubble.radius > Number(more[1]), when);
  }
});

test('the stars are lit in order of distance', () => {
  const bubble = bubbleAt(BIRTH, at(2025, 6, 1));
  const distances = bubble.stars.map((s) => s.star.ly);
  assert.deepEqual([...distances].sort((a, b) => a - b), distances);
  assert.equal(bubble.stars.length, NEARBY_STARS.length);
  assert.equal(bubble.stars.filter((s) => s.reached).length, 8);
});

test('the counter shows the line of the bubble as it is true today', () => {
  const bubble = bubbleAt(BIRTH, at(2025, 10, 1));
  const resolve = (s: typeof stop) => (s.special === 'bubble' ? bubbleStop(s, bubble) : s);
  assert.equal(counterAt(stop.exponent, resolve).line, '10,3 anni-luce in ogni direzione');
  assert.equal(counterAt(stop.exponent).line, stop.counterLine);
  // Other stops are untouched.
  assert.equal(counterAt(16.4, resolve).line, counterAt(16.4).line);
});
