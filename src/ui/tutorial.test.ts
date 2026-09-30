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
  tick();
  return { core, script, tick, key, hold, now: () => now };
}

it('explains the missing lesson condition rather than leaving step one silent', () => {
  const f = fixture();
  expect(lessonFeedback(f.tick(), 0, 0)).toContain('Раскройте');
  f.key('s'); const accepted = f.tick(); accepted.gesture!.contact.valid = false;
  expect(lessonFeedback(accepted, 0, 0)).toContain('каждую к своей стенке');
  accepted.input!.status = 'noHands';
  expect(lessonFeedback(accepted, 0, 0)).toContain('отслеживания');
});

it('completes exactly the five pottery actions and then finishes', () => {
  const f = fixture();
  f.hold('s'); expect(f.script.step).toBe(1);
  f.hold('s'); expect(f.script.step).toBe(1);
  f.hold('u'); expect(f.script.step).toBe(2);
  f.hold('i'); expect(f.script.step).toBe(3);
  f.hold('o'); expect(f.script.step).toBe(4);
  f.hold('d'); expect(f.script.step).toBe(5);
  f.key('f'); expect(f.tick().phase).toBe('menu');
});

it('does not accept a deforming flag without a matching shape change, replayed input, or lost hands', () => {
  const f = fixture(); const snapshot = f.tick();
  snapshot.gesture!.gesture = 'shape'; snapshot.gesture!.deforming = true;
  for (let t = f.now(); t < f.now() + 2000; t += 10) f.script.update(snapshot, t);
  expect(f.script.step).toBe(0);
  f.key('x'); f.hold('s'); expect(f.script.step).toBe(0);
  f.key('x'); f.hold('s'); expect(f.script.step).toBe(1);
  f.hold('s'); expect(f.script.step).toBe(1); expect(f.script.waitingRelease).toBe(true);
  f.key('x'); f.tick(); expect(f.script.waitingRelease).toBe(true);
  f.key('x'); f.hold('Escape'); expect(f.script.waitingRelease).toBe(false);
  f.core.dispatch({ type: 'restart', newSessionId: 'lesson-2' }, f.now()); f.tick();
  expect(f.script.step).toBe(0);
});

it('requires both width and depth to increase when opening', () => {
  const f = fixture(); f.hold('s'); f.hold('u'); f.hold('i');
  const snap = f.tick(); snap.gesture!.gesture = 'open'; snap.gesture!.deforming = true;
  snap.clay!.cavityRadiusWorld += .1;
  snap.input!.frameId++; snap.gesture!.sourceFrameId = snap.input!.frameId;
  f.script.update(snap, f.now()); expect(f.script.step).toBe(3);
  snap.clay!.cavityDepthWorld += .1;
  snap.input!.frameId++; snap.gesture!.sourceFrameId = snap.input!.frameId;
  f.script.update(snap, f.now()); expect(f.script.step).toBe(4);
});
