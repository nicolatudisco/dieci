import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FINALE } from '../src/content/finale.ts';
import { FinaleTimeline, buildScript, stanzasOf } from '../src/finale-script.ts';

const script = buildScript(FINALE.bridge, FINALE.message);

test('the whole message is in the script: every stanza, every line, in order, word for word', () => {
  const stanzas = stanzasOf(FINALE.message);
  assert.equal(stanzas.map((stanza) => stanza.join('\n')).join('\n\n'), FINALE.message.trim());
  assert.deepEqual(
    script.lines.map((line) => line.text),
    stanzas.flat(),
  );
  // An empty line starts a new stanza; a single line break does not.
  script.lines.forEach((line, i) => {
    const before = script.lines[i - 1];
    if (before) assert.ok(line.stanza === before.stanza || line.stanza === before.stanza + 1);
  });
  assert.equal(script.lines[script.lines.length - 1]?.stanza, stanzas.length - 1);
});

test('the bridge comes first and leaves, then every line comes in its turn and the way on at the end', () => {
  const times = [...script.bridgeAt, script.bridgeOut, ...script.lineAt, script.end];
  times.forEach((at, i) => {
    const before = times[i - 1];
    if (before !== undefined) assert.ok(at > before, `beat ${i} does not come after the one before`);
  });
  assert.ok((script.bridgeAt[0] ?? 0) > 0, 'a moment of silence before the first words');
});

test('every line has the time to be read', () => {
  script.lines.forEach((line, i) => {
    const next = script.lineAt[i + 1] ?? script.end;
    const words = line.text.split(/\s+/).length;
    assert.ok(next - (script.lineAt[i] ?? 0) >= 1.5 + 0.4 * Math.min(words, 30), `«${line.text.slice(0, 20)}…» goes by too fast`);
  });
});

test('the scene has its cues in the message as it is written today', () => {
  const { cues } = script;
  for (const [name, at] of Object.entries(cues)) assert.ok(Number.isFinite(at), `no cue for ${name}`);
  assert.ok(cues.circles < cues.numbersAway && cues.numbersAway < cues.dot);
  assert.ok(cues.dot < cues.stars && cues.stars < cues.aside && cues.aside < cues.wave);
  // The wave of light leaves with the last line, which stands alone.
  assert.equal(cues.wave, script.lineAt[script.lineAt.length - 1]);
  assert.ok(script.lines[script.lines.length - 1]?.closing);
  assert.equal(script.lines.filter((line) => line.aside).length, 1);
});

test('pushing forward brings one beat at a time and never skips a line', () => {
  const timeline = new FinaleTimeline(script);
  timeline.arrive();
  const seen: number[] = [];
  let pushes = 0;
  while (timeline.advance()) {
    pushes++;
    seen.push(script.lineAt.filter((at) => timeline.t >= at).length);
    assert.ok(pushes < 50);
  }
  assert.ok(timeline.complete);
  assert.equal(pushes, script.bridgeAt.length + script.lineAt.length + 1);
  // The number of lines shown grows by one at most at each push.
  seen.forEach((count, i) => assert.ok(count - (seen[i - 1] ?? 0) <= 1));
  assert.equal(seen[seen.length - 1], script.lines.length);
});

test('time alone says everything, and with time frozen everything has been said', () => {
  const timeline = new FinaleTimeline(script);
  timeline.tick(1000);
  assert.equal(timeline.t, 0, 'nothing starts before the journey stands on the finale');
  timeline.arrive();
  for (let t = 0; t < script.end + 1; t += 1 / 30) timeline.tick(1 / 30);
  assert.ok(timeline.complete);
  timeline.leave();
  assert.equal(timeline.t, 0);

  const frozen = new FinaleTimeline(script);
  frozen.freeze();
  assert.ok(frozen.complete);
  frozen.leave();
  assert.ok(frozen.complete);
  const moment = new FinaleTimeline(script);
  moment.freeze(3);
  assert.equal(moment.t, 3);
  assert.equal(moment.advance(), false);
});
