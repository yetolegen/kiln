import { expect, it } from 'vitest';
import { lessonFeedback, TutorialScript } from './tutorial';
import { MockCore } from '../dev/mockCore';
import { cameraProjection } from '../browser/camera';

function fixture() {
  const core = new MockCore();
  core.updateProjection(cameraProjection({ videoWidth: 1280, videoHeight: 720 }, { width: 1000, height: 800 }, 1));
  core.dispatch({ type: 'start', mode: 'tutorial', sessionId: 'lesson' }, 0);
  let now = 0;
  const script = new TutorialScript((command) => core.dispatch(command, now));
  const tick = () => { now += 100; const snap = core.tick(now); script.update(snap, now); return snap; };
  const key = (name: string) => core.key(name, now);
  const hold = (name: string, frames = 9) => { key(name); for (let i = 0; i < frames; i++) tick(); };
  const complete = (name: string) => { hold(name); expect(script.status).toBe('matched'); hold('Escape', 1); };
  tick();
  return { core, script, tick, key, hold, complete, now: () => now };
}

it('explains the missing lesson condition rather than leaving step one silent', () => {
  const f = fixture();
  expect(lessonFeedback(f.tick(), 0, 0)).toContain('Раскройте');
  f.key('s'); const accepted = f.tick(); accepted.gesture!.contact.valid = false;
  expect(lessonFeedback(accepted, 0, 0)).toContain('каждую к своей стенке');
  accepted.input!.status = 'noHands';
  expect(lessonFeedback(accepted, 0, 0)).toContain('отслеживания');
});

it('completion replaces all gesture instructions, even when hands are lost or raised', () => {
  const f = fixture(); const snap = f.tick();
  for (const gesture of ['none', 'compressRim', 'raise'] as const) {
    snap.gesture!.gesture = gesture;
    const advice = lessonFeedback(snap, 6, 1);
    expect(advice).toContain('Обучение окончено');
    expect(advice).not.toContain('Поднимите');
    expect(advice).not.toContain('опускайте');
  }
});

it('completes all six lesson actions including local widening and then finishes', () => {
  const f = fixture();
  f.complete('s'); expect(f.script.step).toBe(1);
  f.hold('s'); expect(f.script.step).toBe(1);
  f.complete('g'); expect(f.script.step).toBe(2);
  f.complete('u'); expect(f.script.step).toBe(3);
  f.complete('i'); expect(f.script.step).toBe(4);
  f.complete('o'); expect(f.script.step).toBe(5);
  f.hold('d'); expect(f.script.step).toBe(6); expect(f.script.status).toBe('completed');
  const height = f.tick().clay!.height;
  f.hold('d'); expect(f.tick().clay!.height).toBe(height);
  f.hold('x'); expect(f.script.status).toBe('completed');
  f.key('f'); expect(f.tick().phase).toBe('tutorial');
  f.core.dispatch({ type: 'backToMenu' }, f.now()); expect(f.tick().phase).toBe('menu');
  f.core.dispatch({ type: 'start', mode: 'tutorial', sessionId: 'again' }, f.now()); f.tick();
  expect(f.script.status).toBe('working'); expect(f.script.step).toBe(0);
});

it('does not accept a deforming flag without a matching shape change, replayed input, or lost hands', () => {
  const f = fixture(); const snapshot = f.tick();
  snapshot.gesture!.gesture = 'shape'; snapshot.gesture!.deforming = true;
  for (let t = f.now(); t < f.now() + 2000; t += 10) f.script.update(snapshot, t);
  expect(f.script.step).toBe(0);
  f.key('x'); f.hold('s'); expect(f.script.step).toBe(0);
  f.key('x'); f.hold('s'); expect(f.script.step).toBe(0);
  f.hold('s'); expect(f.script.step).toBe(0); expect(f.script.waitingRelease).toBe(true);
  f.key('x'); f.tick(); expect(f.script.waitingRelease).toBe(true);
  f.key('x'); f.hold('Escape'); expect(f.script.waitingRelease).toBe(false);
  f.core.dispatch({ type: 'restart', newSessionId: 'lesson-2' }, f.now()); f.tick();
  expect(f.script.step).toBe(0);
});

it('requires both opening dimensions to match the target, not merely increase', () => {
  const f = fixture(); f.complete('s'); f.complete('g'); f.complete('u'); f.complete('i');
  const snap = f.tick(); snap.gesture!.gesture = 'open'; snap.gesture!.deforming = true;
  snap.clay!.cavityRadiusWorld += .1;
  snap.input!.frameId++; snap.gesture!.sourceFrameId = snap.input!.frameId;
  f.script.update(snap, f.now()); expect(f.script.step).toBe(4);
  snap.clay!.cavityDepthWorld += .1;
  snap.input!.frameId++; snap.gesture!.sourceFrameId = snap.input!.frameId;
  f.script.update(snap, f.now()); expect(f.script.step).toBe(4); expect(f.script.status).toBe('working');
});

it('latches geometry failure, disables actions, and restarts the whole attempt', () => {
  const f = fixture(); f.complete('s'); f.complete('g'); f.key('u');
  f.core.tick(f.now()).clay!.height += .4;
  f.tick(); expect(f.script.status).toBe('failed'); expect(f.script.assessment!.failure).toContain('выше');
  const height = f.core.tick(f.now()).clay!.height;
  f.hold('u'); expect(f.core.tick(f.now()).clay!.height).toBe(height); expect(f.script.step).toBe(2);
  f.core.dispatch({ type: 'restart', newSessionId: 'retry' }, f.now()); f.tick();
  expect(f.script.step).toBe(0); expect(f.script.status).toBe('working');
});
