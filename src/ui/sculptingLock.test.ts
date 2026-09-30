import { expect, it } from 'vitest';
import { SculptingLock } from './sculptingLock';
import { MockCore } from '../dev/mockCore';
import { PROJ } from '../../tests/helpers';

function fixture() {
  const core = new MockCore(); core.updateProjection(PROJ);
  core.dispatch({ type: 'start', mode: 'free', sessionId: 'lock' }, 0);
  const lock = new SculptingLock();
  const sample = (time: number) => core.tick(time);
  return { core, lock, sample, tick: (t: number) => lock.update(sample(t), t) };
}

it('locks on activation before deformation and requires fresh disengagement to unlock', () => {
  const f = fixture();
  expect(f.tick(0)).toBe(false);
  const arming = f.sample(100);
  Object.assign(arming.gesture!, { gesture: 'pullUp', activeTrackId: 1, activationProgress: .01, deforming: false });
  expect(f.lock.update(arming, 100)).toBe(true);
  expect(f.tick(200)).toBe(true);
  expect(f.tick(500)).toBe(true);
  expect(f.tick(600)).toBe(false);
});

it('stationary wall contact remains locked; brief dropouts and replayed frames cannot unlock', () => {
  const f = fixture(); f.core.key('s', 0); expect(f.tick(0)).toBe(true);
  const held = f.sample(100); held.gesture!.deforming = false;
  expect(f.lock.update(held, 100)).toBe(true);
  f.core.key('Escape', 200); const released = f.sample(200);
  for (let t = 200; t < 1000; t += 50) expect(f.lock.update(released, t)).toBe(true);
  const ambiguous = f.sample(1000); ambiguous.input!.status = 'ambiguousTracks';
  expect(f.lock.update(ambiguous, 1000)).toBe(true);
  expect(f.tick(1100)).toBe(true); expect(f.tick(1500)).toBe(false);
});

it('new contact resets release grace; reliably observed hand absence allows recovery', () => {
  const f = fixture(); f.core.key('s', 0); f.tick(0);
  f.core.key('Escape', 100); f.tick(100); f.tick(300);
  f.core.key('s', 400); expect(f.tick(400)).toBe(true);
  f.core.key('x', 500); expect(f.tick(500)).toBe(true);
  expect(f.tick(800)).toBe(true); expect(f.tick(900)).toBe(false);
});

it('terminal damage exposes restart and mode/session changes clear old locks', () => {
  const f = fixture(); f.core.key('s', 0); f.tick(0);
  f.core.key('n', 100); expect(f.tick(100)).toBe(false);
  f.core.dispatch({ type: 'restart', newSessionId: 'new' }, 200); f.core.key('Escape', 200);
  expect(f.tick(200)).toBe(false);
  f.core.key('s', 300); expect(f.tick(300)).toBe(true);
  f.core.dispatch({ type: 'backToMenu' }, 400); expect(f.tick(400)).toBe(false);
});
