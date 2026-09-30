import { expect, it } from 'vitest';
import { Vector2 } from 'three';
import { fillProfile } from '../render/pot';
import { frame, inSession, moving, poseHand, PROJ, T_START } from '../../tests/helpers';
import type { HandFeatures } from '../types';

function fixture(activeId: number, tutorial = false) {
  const core = inSession(tutorial ? 'tutorial' : 'free');
  let now = T_START;
  const feed = (active: HandFeatures) => {
    now += 33;
    const clay = core.tick(now).clay!;
    const support = poseHand('wall', activeId === 1 ? 1 : -1, clay.height / 2, { trackId: activeId === 1 ? 2 : 1 });
    active = { ...active, trackId: activeId };
    core.observe(frame(now, activeId === 1 ? active : support, activeId === 1 ? support : active));
    return core.tick(now);
  };
  return { core, feed, now: () => now };
}

it.each([1, 2])('V6 thumb-tip insertion deepens with a stationary palm, active track %i', (id) => {
  const f = fixture(id);
  const base = poseHand('thumbDown', 0, 1.2);
  let snapshot = f.feed(base);
  for (let i = 1; i <= 30; i++) {
    const landmarks = base.landmarksPx.map((p) => ({ ...p }));
    landmarks[4].y += i * .005 * PROJ.pixelsPerWorldUnit;
    snapshot = f.feed({ ...base, landmarksPx: landmarks });
  }
  expect(snapshot.clay!.cavityDepthWorld).toBeGreaterThan(.02);
});

it('V6 initial indentation grows continuously instead of jumping to fixed depth', () => {
  const f = fixture(2);
  let previous = 0, largestJump = 0;
  for (let i = 0; i < 35; i++) {
    const s = f.feed(poseHand('thumbDown', 0, 1.2 - i * .005, moving(0, -.27)));
    largestJump = Math.max(largestJump, s.clay!.cavityDepthWorld - previous);
    previous = s.clay!.cavityDepthWorld;
  }
  expect(previous).toBeGreaterThan(0);
  expect(largestJump).toBeLessThanOrEqual(.02);
});

it.each([1, 2])('V6 outward withdrawal freezes the shaped clay, left track %i', (leftId) => {
  const core = inSession();
  let now = T_START;
  const feed = (gap: number) => {
    now += 33;
    core.observe(frame(now, poseHand('wall', -gap, .6, { trackId: leftId }),
      poseHand('wall', gap, .6, { trackId: leftId === 1 ? 2 : 1 })));
    return core.tick(now).clay!;
  };
  for (let i = 0; i < 8; i++) feed(1.3);
  for (let i = 1; i <= 30; i++) feed(1.3 - .005 * i);
  const before = feed(1.15).radii.slice();
  let after: Float32Array = before;
  for (let i = 1; i <= 60; i++) after = feed(1.15 + .01 * i).radii;
  expect(Array.from(after)).toEqual(Array.from(before));
});

it.each([1, 2])('V6 very slow vertical pressure reduces height, active track %i', (id) => {
  const f = fixture(id, true);
  f.core.dispatch({ type: 'tutorialStep', step: 4, expectedGesture: 'compressRim' }, f.now());
  for (let i = 0; i < 25; i++) f.feed(poseHand('flat', 0, 1.3));
  const before = f.core.tick(f.now()).clay!.height;
  let s = f.core.tick(f.now());
  // 0.05 palm/s: deliberate slow movement should not be silently discarded.
  for (let i = 1; i <= 180; i++) s = f.feed(poseHand('flat', 0, 1.3 - i * .033 * .05 * 100 / 180, moving(0, -.05)));
  expect(s.clay!.height).toBeLessThan(before - .1);
});

it('V6 core must not coach a lift while the current lesson requests rim compression', () => {
  const f = fixture(2, true);
  f.core.dispatch({ type: 'tutorialStep', step: 4, expectedGesture: 'compressRim' }, f.now());
  let s = f.core.tick(f.now());
  for (let i = 0; i < 20; i++) s = f.feed(poseHand('flat', 0, 0));
  expect(s.gesture?.nearMiss?.intended).not.toBe('pullUp');
  expect(s.hint?.id).not.toBe('holdStill');
});

it.each([1, 2])('V6 previous opening engagement cannot block rim arming, active track %i', (id) => {
  const f = fixture(id, true);
  f.core.dispatch({ type: 'tutorialStep', step: 2, expectedGesture: 'indent' }, f.now());
  for (let i = 0; i < 12; i++) f.feed(poseHand('thumbDown', 0, 1.2 - i * .01, moving(0, -.54)));
  f.core.dispatch({ type: 'tutorialStep', step: 3, expectedGesture: 'open' }, f.now());
  for (let i = 0; i < 13; i++) f.feed(poseHand('pinch', 0, 1.15));
  for (let i = 1; i <= 20; i++) f.feed(poseHand('spread', 0, 1.15, { ratio: .2 + i * .025 }));
  f.core.dispatch({ type: 'tutorialStep', step: 4, expectedGesture: 'compressRim' }, f.now());
  let s = f.core.tick(f.now());
  // Open flat palm, same thumb/index span: only the intended action/pose changes.
  for (let i = 0; i < 25; i++) s = f.feed(poseHand('flat', 0, 1.3, { pinchRatio: .7 }));
  expect(s.gesture?.gesture).toBe('compressRim');
  expect(s.gesture?.activationProgress).toBe(1);
});

it.each([1, 2])('cavity growth already thins the real wall and mesh, active track %i', (id) => {
  const f = fixture(id);
  for (let i = 0; i < 12; i++) f.feed(poseHand('thumbDown', 0, 1.2 - i * .01, moving(0, -.54)));
  for (let i = 0; i < 13; i++) f.feed(poseHand('pinch', 0, 1.15));
  const before = f.core.tick(f.now()).clay!;
  let after = before;
  for (let i = 1; i <= 20; i++) after = f.feed(poseHand('spread', 0, 1.15, { ratio: .2 + i * .025 })).clay!;
  expect(after.cavityRadiusWorld).toBeGreaterThan(before.cavityRadiusWorld + .2);
  expect(after.thickness).toBeLessThan(before.thickness - .2);
  expect(after.floorThicknessWorld).toBeLessThan(before.floorThicknessWorld);
  const a: Vector2[] = [], b: Vector2[] = [];
  fillProfile(before, a); fillProfile(after, b);
  const n = before.radii.length;
  expect(b[n].x - b[n + 1].x).toBeLessThan(a[n].x - a[n + 1].x);
  expect(Array.from(after.radii)).toEqual(Array.from(before.radii));
});
