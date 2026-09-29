import { expect, it } from 'vitest';
import { DwellController } from './dwell';
import { MockCore } from '../dev/mockCore';
import { cameraProjection } from '../browser/camera';

function fixture() {
  const core = new MockCore();
  core.updateProjection(cameraProjection({ videoWidth: 1280, videoHeight: 720 }, { width: 1000, height: 800 }, 1));
  core.setCursor(50, 50);
  const dwell = new DwellController();
  const targets = [{ id: 'restart', x: 0, y: 0, width: 100, height: 100 }];
  return { core, dwell, targets, update: (t: number) => dwell.update(core.tick(t), t, targets) };
}

it('counts only distinct observations and fires once until the pointer leaves', () => {
  const f = fixture();
  const snapshot = f.core.tick(0);
  for (let t = 0; t <= 200; t += 10) expect(f.dwell.update(snapshot, t, f.targets)).toBeNull();
  expect(f.dwell.progress).toBe(0);
  let fires = 0;
  for (let t = 100; t <= 3000; t += 100) if (f.update(t)) fires++;
  expect(fires).toBe(1);
  f.core.setCursor(200, 200); f.update(3100);
  f.core.setCursor(50, 50);
  for (let t = 3200; t <= 4200; t += 100) if (f.update(t)) fires++;
  expect(fires).toBe(2);
});

it('does not repeatedly restart a session while the same button stays held', () => {
  const f = fixture();
  f.core.key('5', 0);
  let fires = 0;
  for (let t = 0; t <= 3500; t += 100) {
    if (f.update(t)) { fires++; f.core.dispatch({ type: 'restart', newSessionId: `session-${fires}` }, t); }
  }
  expect(fires).toBe(1);
});

it('resets accumulated progress on stale input, loss, epoch, and screen change', () => {
  const f = fixture();
  for (let t = 0; t <= 500; t += 100) f.update(t);
  expect(f.dwell.progress).toBeGreaterThan(0);
  f.dwell.update(f.core.tick(500), 701, f.targets);
  expect(f.dwell.progress).toBe(0);
  for (let t = 800; t <= 1300; t += 100) f.update(t);
  f.core.key('x', 1350); f.update(1400);
  expect(f.dwell.activeId).toBeNull();
  f.core.key('x', 1450);
  for (let t = 1500; t <= 2000; t += 100) f.update(t);
  f.core.resetInput(2); f.update(2100);
  expect(f.dwell.progress).toBe(0);
  for (let t = 2200; t <= 2600; t += 100) f.update(t);
  f.dwell.update(f.core.tick(2700), 2700, f.targets, 1);
  expect(f.dwell.progress).toBe(0);
});
