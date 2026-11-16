import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GOLDEN_RECORD } from '../src/content/golden-record.ts';
import { quoteParts, splitClosing } from '../src/ui/golden-record.ts';

test('the story keeps every word when its last sentence becomes the closing line', () => {
  const { body, closing } = splitClosing(GOLDEN_RECORD.intro);
  assert.ok(closing.length > 0, 'the story has a closing line');
  assert.equal(`${body} ${closing}`, GOLDEN_RECORD.intro.trim());
  assert.match(closing, /^[^.!?]+[.!?]$/, 'the closing line is one sentence');
});

test('a text with no sentence to split stays whole', () => {
  assert.deepEqual(splitClosing('Una frase sola.'), { body: 'Una frase sola.', closing: '' });
});

test('the words said on the record are found between guillemets, and nothing is lost', () => {
  const { body } = splitClosing(GOLDEN_RECORD.intro);
  const parts = quoteParts(body);
  assert.equal(parts.join(''), body);
  const quotes = parts.filter((_, index) => index % 2 === 1);
  assert.ok(quotes.length > 0, 'the story quotes what the Italian voice says');
  for (const quote of quotes) assert.match(quote, /^«[^»]*»$/);
});
