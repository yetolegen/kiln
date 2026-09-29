import { expect, it } from 'vitest';
import { TutorialScript } from './tutorial';
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

it('requires fresh accepted gestures, calm contact, a real tear begin, then its end', () => {
  const f = fixture();
  f.hold('s'); expect(f.script.step).toBe(1);
  f.hold('s'); expect(f.script.step).toBe(1);
  f.hold('u'); expect(f.script.step).toBe(2);
  f.hold('d'); expect(f.script.step).toBe(3);
  f.key('s'); f.key('t'); f.tick(); expect(f.script.step).toBe(3);
  f.key('t'); f.tick(); f.hold('s');
  f.key('t'); f.tick(); expect(f.script.step).toBe(4);
  f.hold('s'); expect(f.script.step).toBe(4);
  f.key('t'); f.tick(); f.hold('s'); expect(f.script.step).toBe(5);
  f.key('f'); expect(f.tick().phase).toBe('menu');
});

it('does not progress with replayed observations, lost hands, or a tear end alone', () => {
  const f = fixture(); f.key('s'); const snapshot = f.tick();
  for (let t = f.now(); t < f.now() + 2000; t += 10) f.script.update(snapshot, t);
  expect(f.script.step).toBe(0);
  f.hold('s'); f.hold('u'); f.hold('d'); f.hold('s');
  f.key('t'); f.tick(); expect(f.script.step).toBe(4);
  f.key('x'); f.key('t'); f.hold('s'); expect(f.script.step).toBe(4);
  f.key('x'); f.hold('s'); expect(f.script.step).toBe(5);
  f.core.dispatch({ type: 'restart', newSessionId: 'lesson-2' }, f.now()); f.tick();
  expect(f.script.step).toBe(0);
});
