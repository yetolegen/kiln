import { expect, it } from 'vitest';
import { fingertipReach, isFistGrip, isOpenForGrip } from './features';
import type { FingerExtension, Vec2 } from '../types';

/** 21 landmarks: wrist at the origin, knuckles one palm-length "up", each finger at `reach` × knuckle distance. */
function landmarks(reach: [number, number, number, number], angleDeg = 0, scale = 100): Vec2[] {
  const p: Vec2[] = Array.from({ length: 21 }, () => ({ x: 0, y: 0 }));
  const xs = [-.3, -.1, .1, .3];
  for (let i = 1; i <= 4; i++) p[i] = { x: -.45 - i * .08, y: -.25 * i }; // thumb, unused by the reach test
  [5, 9, 13, 17].forEach((mcp, f) => {
    const knuckle = { x: xs[f], y: -1 }, len = Math.hypot(knuckle.x, knuckle.y), ux = knuckle.x / len, uy = knuckle.y / len;
    p[mcp] = knuckle;
    for (let j = 1; j <= 3; j++) { const r = len + (reach[f] * len - len) * j / 3; p[mcp + j] = { x: ux * r, y: uy * r }; }
  });
  const a = angleDeg * Math.PI / 180;
  return p.map(({ x, y }) => ({ x: 500 + (x * Math.cos(a) - y * Math.sin(a)) * scale, y: 400 + (x * Math.sin(a) + y * Math.cos(a)) * scale }));
}
const ext = (v: number): FingerExtension => ({ index: v, middle: v, ring: v, pinky: v });
const hand = (reach: [number, number, number, number], extension: FingerExtension, angle = 0, pinchRatio = .7) =>
  ({ landmarksPx: landmarks(reach, angle), extension, pinchRatio });

it('measures fingertip reach relative to the knuckles', () => {
  expect(fingertipReach(landmarks([2, 2, 2, 2]))!.every(r => Math.abs(r - 2) < .01)).toBe(true);
  expect(fingertipReach([])).toBeNull();
});

it('recognises a fist by folded fingertips even when joint angles read as open (fist turned to the camera)', () => {
  const facingCamera = hand([1, .95, 1, 1.05], ext(.8)); // angles misread as nearly straight; tips sit on the knuckles
  expect(isFistGrip(facingCamera, false)).toBe(true);
  expect(isFistGrip(hand([1.1, 1, 1, 1.1], ext(.8), 90), false)).toBe(true); // sideways fist
  expect(isFistGrip(hand([1.1, 1.05, 1, 1.1], ext(.8), -140), false)).toBe(true); // upside down
});

it('never takes an open hand, a pinch with open fingers, or a pointing finger for a fist', () => {
  expect(isFistGrip(hand([2, 2.1, 2, 1.8], ext(1)), false)).toBe(false);
  expect(isFistGrip(hand([1.7, 2.1, 2, 1.8], ext(.9), 0, .15), false)).toBe(false); // thumb-index pinch
  const pointing = { ...hand([2, 1, 1, 1], { index: 1, middle: .4, ring: .4, pinky: .4 }), pinchRatio: .8 };
  expect(isFistGrip(pointing, false)).toBe(false);
  expect(isOpenForGrip(hand([2, 2.1, 2, 1.8], ext(.5)))).toBe(true); // open by reach even with odd angles
  expect(isOpenForGrip(hand([1, 1, 1, 1], ext(.5)))).toBe(false);
});

it('holds a loosening fist (sticky) but not a half-open hand, and still works without landmarks', () => {
  const loosening = hand([1.4, 1.35, 1.4, 1.5], ext(.8));
  expect(isFistGrip(loosening, false)).toBe(false);
  expect(isFistGrip(loosening, true)).toBe(true);
  expect(isFistGrip(hand([1.8, 1.7, 1.8, 1.8], ext(.8)), true)).toBe(false);
  expect(isFistGrip({ extension: ext(.4), pinchRatio: .6 }, false)).toBe(true); // mock hands: angles only
});
