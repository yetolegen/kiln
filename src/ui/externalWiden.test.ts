import { expect, it } from 'vitest';
import { frame, hand, inSession, moving, T_START } from '../../tests/helpers';
import type { SessionMode } from '../types';

function fixture(mode: SessionMode = 'free', swapped = false) {
  const core = inSession(mode); let now = T_START;
  if (mode === 'tutorial') core.dispatch({ type: 'tutorialStep', step: 1, expectedGesture: 'widen' }, now);
  const feed = (left = 1.05, right = left, pinch = true, y = .6, speed = 0) => {
    now += 33;
    core.observe(frame(now,
      hand(-left, y, { pinchRatio: pinch ? .2 : 1, trackId: swapped ? 2 : 1, ...moving(-speed, 0) }),
      hand(right, y, { pinchRatio: pinch ? .2 : 1, trackId: swapped ? 1 : 2, ...moving(speed, 0) })));
    return core.tick(now);
  };
  const hold = () => { for (let i = 0; i < 20; i++) feed(); };
  return { core, feed, hold, now: () => now };
}

for (const mode of ['free', 'commission', 'tutorial'] as const) it.each([false, true])(`widens the profile locally at the grip height in ${mode}, swapped=%s`, (swapped) => {
  const f = fixture(mode, swapped), before = f.core.tick(f.now()).clay!;
  f.hold(); expect(f.core.tick(f.now()).gesture?.activationProgress).toBe(1);
  for (let i = 0; i < 40; i++) f.feed(1.05 + i * .008, undefined, true, .6, .44);
  const after = f.core.tick(f.now()).clay!;
  const grip = Math.round(.6 / before.height * (before.radii.length - 1)), top = before.radii.length - 1;
  expect(after.radii[grip]).toBeGreaterThan(before.radii[grip] + .16); // the gripped band widens
  expect(after.radii[0] - before.radii[0]).toBeLessThan(.02);           // the base and the rim stay put
  expect(after.radii[top] - before.radii[top]).toBeLessThan(.02);
  expect(after.height).toBe(before.height);
  expect(after.cavityRadiusWorld).toBe(0); expect(after.cavityDepthWorld).toBe(0);
  const held = Array.from(after.radii);
  for (let i = 0; i < 35; i++) f.feed(1.362);
  expect(Array.from(f.core.tick(f.now()).clay!.radii)).toEqual(held);
  for (let i = 0; i < 30; i++) f.feed(1.362 + i * .008, undefined, false);
  expect(Array.from(f.core.tick(f.now()).clay!.radii)).toEqual(held);
});

it.each(['early', 'one-side', 'fast', 'vertical', 'lost', 'jitter'])('does not widen on %s movement', (reason) => {
  const f = fixture(); const initial = Array.from(f.core.tick(f.now()).clay!.radii);
  if (reason !== 'early') f.hold();
  if (reason === 'lost') f.core.observe(frame(f.now() + 1, null, null));
  for (let i = 0; i < 25; i++) {
    const travel = reason === 'jitter' ? Math.sin(i) * .006 : i * .008;
    f.feed(1.05 + travel, reason === 'one-side' ? 1.05 : 1.05 + travel, true, reason === 'vertical' ? .9 : .6, reason === 'fast' ? 2 : reason === 'early' || reason === 'lost' ? .44 : 0);
  }
  expect(Array.from(f.core.tick(f.now()).clay!.radii)).toEqual(initial);
});
