import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EPILOGUE, FINALE, INTRO, NODES } from '../src/engine/journey.ts';
import { LEVELS } from '../src/levels/registry.ts';
import { epilogueOpacity, finaleOpacity, interfaceOpacity, introOpacity, screenOwner } from '../src/ui/view-model.ts';

test('each view owns the screen at its own place, alone', () => {
  assert.equal(introOpacity(INTRO.u), 1);
  assert.equal(interfaceOpacity(INTRO.u), 0);
  assert.equal(screenOwner(INTRO.u), 'intro');
  for (const node of NODES.filter((n) => n.stop)) {
    assert.equal(interfaceOpacity(node.u), 1, node.id);
    assert.equal(introOpacity(node.u), 0, node.id);
    assert.equal(finaleOpacity(node.u), 0, node.id);
    assert.equal(epilogueOpacity(node.u), 0, node.id);
    assert.equal(screenOwner(node.u), 'journey', node.id);
  }
  assert.equal(finaleOpacity(FINALE.u), 1);
  assert.equal(interfaceOpacity(FINALE.u), 0);
  assert.equal(epilogueOpacity(FINALE.u), 0);
  assert.equal(screenOwner(FINALE.u), 'finale');
  assert.equal(epilogueOpacity(EPILOGUE.u), 1);
  assert.equal(finaleOpacity(EPILOGUE.u), 0);
  assert.equal(screenOwner(EPILOGUE.u), 'epilogue');
});

test('views hand over without ever leaving the screen to two of them at full strength', () => {
  for (let u = INTRO.u; u <= EPILOGUE.u; u += 0.01) {
    const strong = [introOpacity(u), interfaceOpacity(u), finaleOpacity(u), epilogueOpacity(u)].filter((o) => o > 0.6);
    assert.ok(strong.length <= 1, `two views at u = ${u.toFixed(2)}`);
  }
});

test('every stop has a level that is fully visible on it', () => {
  for (const node of NODES.filter((n) => n.stop)) {
    const def = LEVELS.find((level) => (level.covers ?? [level.id]).includes(node.id));
    assert.ok(def, `no level for ${node.id}`);
    assert.ok(def.range[0] <= node.u && def.range[1] >= node.u, `${node.id} is not alive at its stop`);
    assert.ok(!def.fadeIn || def.fadeIn[1] <= node.u, `${node.id} is still fading in at its stop`);
    assert.ok(!def.fadeOut || def.fadeOut[0] >= node.u, `${node.id} is already fading out at its stop`);
  }
});

test('two scenes of Act II are never on screen together', () => {
  const stops = NODES.filter((n) => n.kind === 'number').map((n) => n.id);
  const scenes = LEVELS.filter((level) => (level.covers ?? [level.id]).some((id) => stops.includes(id)));
  // Every stop of Act II has its scene, and one only.
  assert.deepEqual(scenes.flatMap((level) => level.covers ?? [level.id]), stops);
  for (let i = 0; i < scenes.length - 1; i++) {
    const a = scenes[i];
    const b = scenes[i + 1];
    assert.ok(a && b && a.range[1] <= b.range[0], `${a?.id} and ${b?.id} overlap`);
  }
});
