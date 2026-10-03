import { expect, it } from 'vitest';
import { DwellController } from './dwell';
import { CONFIG } from '../config';
import { MockCore } from '../dev/mockCore';
import { cameraProjection } from '../browser/camera';
import type { FrameInput } from '../types';

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

it('requires release after an activated control rebuilds its page', () => {
  const f = fixture(); let revision = 0, fires = 0;
  for (let t = 0; t <= 3500; t += 100) {
    if (f.dwell.update(f.core.tick(t), t, f.targets, revision)) { fires++; revision++; }
  }
  expect(fires).toBe(1);
  f.core.setCursor(200, 200); f.dwell.update(f.core.tick(3600), 3600, f.targets, revision);
  f.core.setCursor(50, 50);
  for (let t = 3700; t <= 5000; t += 100) if (f.dwell.update(f.core.tick(t), t, f.targets, revision)) fires++;
  expect(fires).toBe(2);
});

it('accepts a trusted one-hand pointer even when two-hand shaping is unusable', () => {
  const f = fixture(); let fires = 0;
  for (let t = 0; t <= 1400; t += 100) {
    const snapshot = f.core.tick(t);
    snapshot.input!.status = 'oneHand'; snapshot.input!.screenRight = null; snapshot.gesture!.inputUsable = false;
    if (f.dwell.update(snapshot, t, f.targets)) fires++;
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

it('a slow frame keeps a held dwell, crediting at most one freshness window', () => {
  // slow devices: frames arrive >MAX_INPUT_AGE_MS apart while the palm never leaves; each frame is itself fresh
  const f = fixture(); let fires = 0;
  for (let t = 0; t <= 300; t += 100) if (f.update(t)) fires++;
  const held = f.dwell.progress; expect(held).toBeGreaterThan(0);
  if (f.update(800)) fires++; // 500ms hitch: progress kept, credited 200ms not 500ms
  expect(f.dwell.progress).toBeCloseTo(held + CONFIG.MAX_INPUT_AGE_MS / CONFIG.DWELL_MS, 5);
  for (let t = 1000; t <= 3000; t += 200) if (f.update(t)) fires++; // a steady 5 fps still completes, once
  expect(fires).toBe(1);
});

it.each([1, 3])('uses palm track %i over a button without any pointing gesture', (track) => {
  const f = fixture(); f.core.key('Escape', 0); let fires = 0;
  for (let t = 0; t <= 2400; t += 100) {
    const snap = f.core.tick(t), hand = [snap.input!.screenLeft, snap.input!.screenRight].find((h) => h?.trackId === track)!;
    hand.palmPx = { x: 50, y: 50 }; snap.gesture!.cursorPx = null;
    if (f.dwell.update(snap, t, f.targets)) fires++;
    expect(f.dwell.cursorPx).toEqual({ x: 50, y: 50 });
  }
  expect(fires).toBe(1); expect(f.dwell.progress).toBe(1);
});

it('resets a palm hold on hand switch, leaving the button and invalid tracking', () => {
  const f = fixture(); f.core.key('Escape', 0);
  const update = (t: number, track: number, x = 50, status: FrameInput['status'] = 'ready') => {
    const s = f.core.tick(t); s.input!.status = status;
    for (const h of [s.input!.screenLeft, s.input!.screenRight]) if (h) h.palmPx = { x: h.trackId === track ? x : 400, y: 50 };
    return f.dwell.update(s, t, f.targets);
  };
  for (let t = 0; t <= 600; t += 100) update(t, 1);
  expect(f.dwell.progress).toBeGreaterThan(.5);
  update(700, 3); expect(f.dwell.progress).toBe(0);
  update(800, 3, 150); expect(f.dwell.activeId).toBeNull();
  update(900, 3); update(1000, 3, 50, 'reacquiring'); expect(f.dwell.progress).toBe(0);
});

it('does not carry a pinch drag into a newly opened dialog', () => {
  const f = fixture(); f.core.key('Escape', 0);
  const update = (t: number, x: number, pinchRatio: number) => {
    const s = f.core.tick(t); s.input!.screenRight = null;
    s.input!.screenLeft!.palmPx = { x, y: 50 }; s.input!.screenLeft!.pinchRatio = pinchRatio;
    s.gesture = null; return f.dwell.update(s, t, f.targets);
  };
  f.dwell.requireRelease(); update(0, 200, .2);
  for (let t = 100; t <= 2000; t += 100) expect(update(t, 50, .2)).toBeNull();
  for (let t = 2100; t <= 4000; t += 100) expect(update(t, 50, .8)).toBeNull();
  update(4100, 200, .8); let fires = 0;
  for (let t = 4200; t <= 5500; t += 100) if (update(t, 50, .8)) fires++;
  expect(fires).toBe(1);
});

it('does not let an absent old pinch block a fresh pointing hand', () => {
  const f = fixture(); f.core.key('p', 0); f.dwell.requireRelease();
  const update = (t: number, trackId: number, pinchRatio: number) => {
    const s = f.core.tick(t); s.input!.screenRight = null;
    Object.assign(s.input!.screenLeft!, { trackId, pinchRatio, palmPx: { x: 200, y: 200 } });
    return f.dwell.update(s, t, f.targets);
  };
  update(0, 1, .2); f.core.setCursor(200, 200); update(100, 2, .8);
  f.core.setCursor(50, 50); let fires = 0;
  for (let t = 200; t <= 1800; t += 100) if (update(t, 2, .8)) fires++;
  expect(fires).toBe(1);
});
