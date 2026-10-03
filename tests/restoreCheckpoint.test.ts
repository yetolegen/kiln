// Checkpoint restore (B's V10) seen from the core: findings of the ECC review of final/motion-update.
import { expect, it } from 'vitest';
import { createController } from '../src/engine/controller';
import type { ClayEvent } from '../src/types';
import { frame, hand, toMenu } from './helpers';

function setup() {
  const core = createController({ nowIso: () => '2026-10-03T00:00:00.000Z' });
  const now = toMenu(core); core.dispatch({ type: 'start', mode: 'free', sessionId: 'restore-core' }, now);
  return { core, now };
}

it('restoring mid-episode ends that episode instead of dropping its end event', () => {
  const { core, now } = setup();
  const saved = core.captureCheckpoint(now)!;
  const begun = new Map<string, ClayEvent>();
  let t = now;
  for (let i = 0; i < 90; i++) { // one hand only: a tracking episode opens
    t += 33; core.observe(frame(t, hand(-1, .6), null));
    for (const e of core.tick(t).events) if (e.phase === 'begin') begun.set(e.episodeId, e); else if (e.phase === 'end') begun.delete(e.episodeId);
  }
  expect(begun.size).toBeGreaterThan(0);
  expect(core.restoreCheckpoint(saved, t + 1)).toBe(true);
  const ended = core.tick(t + 1).events.filter((e) => e.phase === 'end').map((e) => e.episodeId);
  for (const id of begun.keys()) expect(ended).toContain(id);
});

it('a restore does not make a later input epoch with a restarted clock drop every frame', () => {
  const { core, now } = setup();
  expect(core.restoreCheckpoint(core.captureCheckpoint(now)!, now + 50_000)).toBe(true);
  core.resetInput(1); // e.g. the camera restarted; its clock starts again
  core.observe({ ...frame(1000, hand(-1, .6), hand(1, .6)), epoch: 1 });
  expect(core.tick(1000).input).not.toBeNull();
});

it('the snapshot customization cannot be mutated from outside', () => {
  const { core, now } = setup();
  const c = core.tick(now).customization!;
  expect(() => { (c.attachments as unknown[]).push({}); }).toThrow();
  expect(core.tick(now).customization!.attachments).toHaveLength(0);
});
