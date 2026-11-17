import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GOLDEN_RECORD } from '../src/content/golden-record.ts';
import {
  ENGRAVING_ANCHORS,
  SOUND_IDS,
  clampMessage,
  countCharacters,
  counterText,
  engravingDate,
  engravingFor,
  ringText,
  splitEngraving,
} from '../src/golden-record/design.ts';
import { EARTH_COASTS } from '../src/golden-record/earth-outline.ts';
import { PICTURES } from '../src/golden-record/pictures.ts';
import { MELODY, MORSE_UNIT, SCORES, envelope, morseCode, morseTimeline } from '../src/golden-record/scores.ts';

// Invented dates and names only (see CLAUDE.md, «Privacy»).
const NOW = new Date(2026, 10, 18, 12);

// ── Sounds ──────────────────────────────────────────────────────────────────

test('«CIAO» in Morse is −·−· ·· ·− −−−', () => {
  assert.equal(morseCode('CIAO'), '-.-. .. .- ---');
  assert.equal(morseCode('ciao'), '-.-. .. .- ---');
});

test('the Morse tones follow the ITU timing: dot 1, dash 3, gaps of 1 inside a letter and 3 between letters', () => {
  const unit = MORSE_UNIT;
  const tones = morseTimeline('CIAO', unit);
  const units = (seconds: number): number => Math.round(seconds / unit);
  assert.deepEqual(
    tones.map((tone) => units(tone.dur)),
    [3, 1, 3, 1, 1, 1, 1, 3, 3, 3, 3],
  );
  const gaps = tones.slice(1).map((tone, i) => units(tone.at - ((tones[i]?.at ?? 0) + (tones[i]?.dur ?? 0))));
  // C: − · − ·   I: · ·   A: · −   O: − − −
  assert.deepEqual(gaps, [1, 1, 1, 3, 1, 3, 1, 3, 1, 1]);
  const last = tones[tones.length - 1];
  assert.equal(units((last?.at ?? 0) + (last?.dur ?? 0)), 39);
});

test('the birthday melody has its 25 notes, its intervals and its 25 beats', () => {
  assert.deepEqual(
    MELODY.map((note) => note.step),
    [0, 0, 2, 0, 5, 4, 0, 0, 2, 0, 7, 5, 0, 0, 12, 9, 5, 4, 2, 10, 10, 9, 5, 7, 5],
  );
  assert.equal(
    MELODY.reduce((sum, note) => sum + note.beats, 0),
    25,
  );
  // Each phrase ends on a long note; the last is the longest.
  assert.deepEqual(
    MELODY.filter((note) => note.beats >= 2).map((note) => note.beats),
    [2, 2, 3],
  );
});

test('the heart beats between 60 and 90 times a minute', () => {
  const beats = SCORES.cuore.events.filter((event) => event.gain === 1).map((event) => event.at);
  assert.ok(beats.length >= 6);
  const period = ((beats[beats.length - 1] ?? 0) - (beats[0] ?? 0)) / (beats.length - 1);
  const bpm = 60 / period;
  assert.ok(bpm >= 60 && bpm <= 90, `${bpm} beats a minute`);
});

test('every sound has a score, and every event falls within its duration', () => {
  for (const id of SOUND_IDS) {
    const score = SCORES[id];
    assert.equal(score.id, id);
    assert.ok(score.duration >= 4 && score.duration <= 13, `${id}: ${score.duration} s`);
    assert.ok(score.events.length > 0 || score.bed, `${id} makes a sound`);
    for (const event of score.events) assert.ok(event.at >= 0 && event.at < score.duration, `${id}: an event at ${event.at} s`);
  }
});

test('the shape of each sound is between 0 and 1, reaches 1, and starts and ends quietly', () => {
  for (const id of SOUND_IDS) {
    const shape = envelope(id, 240);
    assert.equal(shape.length, 240);
    for (const value of shape) assert.ok(value >= 0 && value <= 1 && Number.isFinite(value), `${id}: ${value}`);
    assert.ok(Math.max(...shape) > 0.99, `${id} reaches full loudness`);
    assert.ok((shape[0] ?? 1) < 0.15, `${id} starts quietly`);
    assert.ok((shape[shape.length - 1] ?? 1) < 0.15, `${id} is not cut off at the end`);
  }
});

test('the shape of the Morse sound is loud on the tones and silent between them', () => {
  const score = SCORES.morse;
  const bins = Math.round(score.duration * 100);
  const shape = envelope('morse', bins);
  const at = (t: number): number => shape[Math.floor((t / score.duration) * bins)] ?? 0;
  const tones = morseTimeline('CIAO', MORSE_UNIT, (score.events[0]?.at ?? 0));
  for (const tone of tones) assert.ok(at(tone.at + tone.dur / 2) > 0.9);
  for (let i = 1; i < tones.length; i++) {
    const end = (tones[i - 1]?.at ?? 0) + (tones[i - 1]?.dur ?? 0);
    assert.ok(at((end + (tones[i]?.at ?? 0)) / 2) < 0.01);
  }
});

// ── Pictures ────────────────────────────────────────────────────────────────

/** The points of an SVG path made of absolute M, L, Q, C, A and Z (control points too; for arcs, the end point). */
function pathPoints(d: string): [number, number][] {
  const tokens = d.match(/[MLQCAZ]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? [];
  const points: [number, number][] = [];
  let command = '';
  let numbers: number[] = [];
  const arity: Record<string, number> = { M: 2, L: 2, Q: 4, C: 6, A: 7, Z: 0 };
  const flush = (): void => {
    if (command === 'A') points.push([numbers[5] ?? NaN, numbers[6] ?? NaN]);
    else for (let i = 0; i + 1 < numbers.length; i += 2) points.push([numbers[i] ?? NaN, numbers[i + 1] ?? NaN]);
    numbers = [];
  };
  for (const token of tokens) {
    if (/[A-Z]/.test(token)) {
      assert.ok(token in arity, `only absolute M L Q C A Z: ${token}`);
      command = token;
      continue;
    }
    numbers.push(Number(token));
    if (numbers.length === arity[command]) flush();
  }
  assert.equal(numbers.length, 0, `a command of ${d.slice(0, 30)}… is incomplete`);
  return points;
}

test('every picture of the lab is drawn, inside the round label', () => {
  assert.deepEqual(Object.keys(PICTURES).sort(), GOLDEN_RECORD.images.map((image) => image.id).sort());
  for (const [id, picture] of Object.entries(PICTURES)) {
    assert.ok(picture.strokes.length > 0, `${id} has lines`);
    for (const d of [...picture.strokes.map((stroke) => stroke.d), ...picture.fills]) {
      for (const [x, y] of pathPoints(d)) {
        assert.ok(Number.isFinite(x) && Number.isFinite(y), `${id}: a point is not a number`);
        assert.ok(Math.hypot(x - 50, y - 50) <= 50.5, `${id}: (${x}, ${y}) falls outside the label`);
      }
    }
  }
});

test('the Earth has its coasts', () => {
  assert.ok(EARTH_COASTS.length >= 10);
  const points = EARTH_COASTS.reduce((sum, d) => sum + pathPoints(d).length, 0);
  assert.ok(points > 300 && points < 2000, `${points} points`);
});

// ── The engraving ───────────────────────────────────────────────────────────

test('the pieces of the engraving that change with the link are still in it', () => {
  for (const piece of Object.values(ENGRAVING_ANCHORS)) assert.ok(GOLDEN_RECORD.engraving.includes(piece), piece);
  assert.ok(GOLDEN_RECORD.engraving.includes('{data}'));
});

test('the date is engraved in Italian', () => {
  assert.equal(engravingDate(NOW), '18 novembre 2026');
  assert.equal(engravingDate(new Date(2027, 0, 1, 12)), '1 gennaio 2027');
});

test('without a link the engraving reads as written, with the date of today', () => {
  assert.equal(
    engravingFor(NOW, null, null),
    `Disco d'oro di una scienziata di 10 anni · Terra, Sistema Solare, Via Lattea · 18 novembre 2026`,
  );
});

test('with a date of birth the age follows the bubble, and is never false', () => {
  // Almost ten.
  assert.match(engravingFor(NOW, { year: 2017, month: 1, day: 30 }, null), /una scienziata di quasi 10 anni ·/);
  // Ten, on the day and after.
  assert.match(engravingFor(NOW, { year: 2016, month: 11, day: 18 }, null), /una scienziata di 10 anni ·/);
  // Eleven: no longer «10 anni».
  const eleven = engravingFor(NOW, { year: 2015, month: 9, day: 1 }, null);
  assert.match(eleven, /una scienziata di 11 anni ·/);
  assert.doesNotMatch(eleven, /10 anni/);
  // A date the bubble does not trust (far too young) leaves the text as written.
  assert.match(engravingFor(NOW, { year: 2019, month: 6, day: 1 }, null), /una scienziata di 10 anni ·/);
});

test('with a name the disc says whose it is, and the name is taken as it is', () => {
  assert.equal(
    engravingFor(NOW, { year: 2015, month: 9, day: 1 }, 'Ada'),
    `Disco d'oro di Ada, una scienziata di 11 anni · Terra, Sistema Solare, Via Lattea · 18 novembre 2026`,
  );
  assert.match(engravingFor(NOW, null, 'Zoe $& {data}'), /^Disco d'oro di Zoe \$& \{data\}, una scienziata di 10 anni · /);
});

test('the engraving goes on two arcs without losing a word', () => {
  const text = engravingFor(NOW, null, 'Ada');
  const { top, bottom } = splitEngraving(text);
  assert.equal(`${top} · ${bottom}`, text);
  assert.equal(top, `Disco d'oro di Ada, una scienziata di 10 anni`);
  assert.deepEqual(splitEngraving('una riga sola'), { top: 'una riga sola', bottom: '' });
});

// ── The message ─────────────────────────────────────────────────────────────

test('characters are counted as she sees them', () => {
  assert.equal(countCharacters('Ciao!'), 5);
  assert.equal(countCharacters('perché'), 6);
  assert.equal(countCharacters('perché'), 6, 'a letter with a separate accent is one');
  assert.equal(countCharacters('👋🏽'), 1, 'an emoji with its skin tone is one');
  assert.equal(countCharacters('👨‍👩‍👧'), 1, 'a family is one');
});

test('the message stops at 140 characters and never cuts an emoji in half', () => {
  assert.equal(clampMessage('a'.repeat(150)), 'a'.repeat(140));
  assert.equal(clampMessage(`${'a'.repeat(139)}👋🏽b`), `${'a'.repeat(139)}👋🏽`);
  assert.equal(clampMessage('Ciao!'), 'Ciao!');
});

test('the counter says «carattere» for one and «caratteri» for the others', () => {
  assert.equal(counterText(0), '0 caratteri su 140');
  assert.equal(counterText(1), '1 carattere su 140');
  assert.equal(counterText(23), '23 caratteri su 140');
});

test('the message goes around the edge on one line', () => {
  assert.equal(ringText('  Ciao!\nQui sulla   Terra… '), 'Ciao! Qui sulla Terra…');
});
