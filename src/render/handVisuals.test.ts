import { expect, it } from 'vitest';
import { HandVisuals } from './handVisuals';
import { MockCore } from '../dev/mockCore';
import { cameraProjection } from '../browser/camera';

function input() {
  const core = new MockCore(); core.updateProjection(cameraProjection({ videoWidth: 1280, videoHeight: 720 }, { width: 1000, height: 800 }, 1));
  core.key('s', 0); return core.tick(0).input!;
}
it('smooths displayed movement while keeping brief loss separate from live input', () => {
  const visuals = new HandVisuals(), frame = input();
  visuals.update(frame, 0); const start = visuals.hands[0].points[0];
  const next = structuredClone(frame); next.frameId++; next.tMs = 33;
  next.screenLeft!.landmarksPx = next.screenLeft!.landmarksPx.map((p) => ({ x: p.x + 20, y: p.y }));
  visuals.update(next, 33);
  expect(visuals.hands[0].points[0]).toBeGreaterThan(start);
  expect(visuals.hands[0].points[0]).toBeLessThan(start + 20);
  const last = visuals.hands[0].points[0];
  const lost = { ...next, frameId: 3, tMs: 100, status: 'noHands' as const, screenLeft: null, screenRight: null };
  visuals.update(lost, 100); expect(visuals.hands[0].opacity).toBeGreaterThan(0);
  expect(visuals.hands[0].points[0]).toBe(last); expect(lost.screenLeft).toBeNull();
  visuals.update(lost, 400); expect(visuals.hands[0].opacity).toBe(0);
});
it('does not refresh cached hands from stale frames and clears on a new epoch', () => {
  const visuals = new HandVisuals(), frame = input(); visuals.update(frame, 0);
  visuals.update(frame, 351); expect(visuals.hands[0].opacity).toBe(0);
  visuals.update({ ...frame, epoch: 2, status: 'reacquiring' }, 352);
  expect(visuals.hands.every((hand) => hand.opacity === 0)).toBe(true);
});
it('holds a still hand steady despite landmark noise', () => {
  const visuals = new HandVisuals(), frame = input();
  const base = frame.screenLeft!.landmarksPx.map((p) => ({ ...p }));
  let seed = 7; const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - .5) * 6; // ±3 px
  const shown: number[] = [];
  for (let i = 0; i < 90; i++) {
    const next = structuredClone(frame); next.frameId = i + 1; next.tMs = i * 33;
    next.screenLeft!.landmarksPx = base.map((p) => ({ x: p.x + noise(), y: p.y + noise() }));
    visuals.update(next, i * 33);
    if (i >= 30) shown.push(visuals.hands[0].points[16]);
  }
  const spread = Math.max(...shown) - Math.min(...shown);
  expect(spread).toBeLessThan(2.5); // raw input spans ~6 px
});
