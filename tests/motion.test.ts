import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Motion } from '../src/engine/motion.ts';

const DT = 1 / 60;

/** Runs the motion for `seconds`; returns the largest change of velocity between two frames. */
function run(motion: Motion, seconds: number, each?: (m: Motion) => void): number {
  let jerk = 0;
  let previous = motion.v;
  for (let t = 0; t < seconds; t += DT) {
    motion.step(DT);
    jerk = Math.max(jerk, Math.abs(motion.v - previous));
    previous = motion.v;
    each?.(motion);
  }
  return jerk;
}

test('▶ travels to the next stop and lands exactly on it', () => {
  const motion = new Motion(0);
  assert.equal(motion.go(1)?.id, 'strada');
  let last = motion.u;
  const jerk = run(motion, 1.6, (m) => {
    assert.ok(m.u >= last - 1e-9, 'never goes backwards');
    last = m.u;
  });
  assert.equal(motion.u, 1);
  assert.equal(motion.mode, 'rest');
  assert.equal(motion.atNode?.id, 'strada');
  assert.ok(jerk < 0.1, `smooth start and stop (max Δv ${jerk})`);
});

test('a long jump takes at most three seconds', () => {
  const motion = new Motion(13.7);
  assert.equal(motion.go(1)?.id, 'oort');
  run(motion, 2.9);
  assert.equal(motion.mode, 'travel');
  run(motion, 0.2);
  assert.equal(motion.u, 16.4);
});

test('pressing again mid-trip goes one stop further, without a jerk', () => {
  const motion = new Motion(0);
  motion.go(1);
  run(motion, 0.6);
  const speed = motion.v;
  assert.ok(speed > 0);
  assert.equal(motion.go(1)?.id, 'rifredi');
  motion.step(DT);
  assert.ok(Math.abs(motion.v - speed) < 0.15, 'velocity is carried over');
  run(motion, 4);
  assert.equal(motion.u, 2);
});

test('holding ▶ never skips more than one stop ahead', () => {
  const motion = new Motion(0);
  for (let i = 0; i < 40; i++) {
    motion.go(1);
    motion.step(DT);
  }
  assert.equal(motion.heading?.id, 'rifredi');
  run(motion, 5);
  assert.equal(motion.u, 2);
});

test('◀ stops at the first stop, ▶ at the epilogue', () => {
  assert.equal(new Motion(0).go(-1), null);
  assert.equal(new Motion(38.5).go(1), null);
  const motion = new Motion(-1);
  assert.equal(motion.go(1)?.id, 'partenza');
});

test('the wheel is followed with damping and snaps only near a stop', () => {
  const near = new Motion(3);
  near.nudge(0.15);
  run(near, 0.1);
  assert.ok(near.u > 3 && near.u < 3.15);
  run(near, 3);
  assert.equal(near.u, 3, 'inside the capture zone: back onto the stop');
  assert.equal(near.mode, 'rest');

  const far = new Motion(3);
  far.nudge(0.5);
  run(far, 3);
  assert.ok(Math.abs(far.u - 3.5) < 0.01, 'outside every capture zone: stays where it is');
  assert.equal(far.atNode, null);
});

test('free navigation never leaves the journey and is off before the start', () => {
  const start = new Motion(0);
  start.nudge(-5);
  run(start, 2);
  assert.equal(start.u, 0);

  const end = new Motion(38.5);
  end.nudge(5);
  run(end, 2);
  assert.equal(end.u, 38.5);

  const opening = new Motion(-1);
  opening.nudge(2);
  opening.dragStart();
  opening.dragBy(2);
  run(opening, 1);
  assert.equal(opening.u, -1);
});

test('a swipe keeps moving with inertia, then stops', () => {
  const motion = new Motion(7.2);
  motion.dragStart();
  for (let i = 0; i < 10; i++) {
    motion.dragBy(0.05);
    motion.step(DT);
  }
  const released = motion.u;
  motion.dragEnd(3);
  run(motion, 0.3);
  assert.ok(motion.u > released + 0.3, 'keeps going after the release');
  run(motion, 5);
  assert.equal(motion.mode, 'rest');
  assert.ok(motion.u > 7.9 && motion.u < 9.01);
});

test('a swipe that would stop near a stop glides onto it', () => {
  const motion = new Motion(1.5);
  motion.dragStart();
  motion.dragBy(0.01);
  motion.step(DT);
  motion.dragEnd(1.5);
  run(motion, 3);
  assert.equal(motion.u, 2);
  assert.equal(motion.atNode?.id, 'rifredi');
});

test('jumpTo lands at once, at rest, and forgets the trip in progress', () => {
  const motion = new Motion(0);
  motion.go(1);
  motion.step(0.3);
  assert.equal(motion.mode, 'travel');
  motion.jumpTo(4);
  assert.equal(motion.u, 4);
  assert.equal(motion.mode, 'rest');
  assert.equal(motion.heading, null);
  assert.equal(motion.atNode?.id, 'firenze');
  motion.step(0.5);
  assert.equal(motion.u, 4);
});
