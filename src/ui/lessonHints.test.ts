import { expect, it } from 'vitest';
import { LessonHints } from './lessonHints';
import { MockCore } from '../dev/mockCore';
import { PROJ } from '../../tests/helpers';
import type { Hint } from '../types';

const hint = (id: Hint['id']): Hint => ({ id, params: {}, severity: 'info', priority: 50, expiresAtMs: 99999, speak: true });
function fixture() {
  const core = new MockCore(); core.updateProjection(PROJ); core.dispatch({ type: 'start', mode: 'tutorial', sessionId: 'lesson' }, 0);
  return { core, scope: new LessonHints() };
}

it('clears old technique on a step boundary and suppresses refreshed wrong-step near misses', () => {
  const { core, scope } = fixture();
  const old = hint('holdStill');
  const before = core.tick(100);
  before.gesture!.nearMiss = { intended: 'pullUp', reason: 'holdStill', params: { remainingS: 3 } };
  scope.update(before, 2, old);
  const sameStep = core.tick(200); sameStep.gesture!.nearMiss = before.gesture!.nearMiss;
  expect(scope.update(sameStep, 2, old)).toBe(old);
  expect(scope.update(sameStep, 5, old)).toBeNull(); expect(scope.changed).toBe(true);
  const after = core.tick(300); after.gesture!.nearMiss = before.gesture!.nearMiss;
  expect(scope.update(after, 5, { ...old })).toBeNull();
  after.gesture!.nearMiss = { intended: 'compressRim', reason: 'rimPlacement', params: { dir: 'lower' } };
  expect(scope.update(after, 5, hint('rimPlacement'))?.id).toBe('rimPlacement');
});

it('keeps tracking and damage warnings, scopes generic motion guidance, and resets on restart', () => {
  const { core, scope } = fixture(); const snap = core.tick(100);
  for (const id of ['trackingUncertain', 'collapse', 'thinFloor', 'overStretch'] as const) {
    const h = hint(id); expect(scope.update(snap, 5, h)).toBe(h);
  }
  const next = core.tick(200); next.gesture!.nearMiss = { intended: 'compressRim', reason: 'notMoving', params: {} };
  const stopped = hint('notMoving');
  const scoped = scope.update(next, 5, stopped);
  expect(scoped?.params.instruction).toContain('над краем');
  expect(scope.update(next, 5, stopped)).toBe(scoped);
  expect(scope.update(next, 5, hint('pinchFirst'))).toBeNull();
  core.dispatch({ type: 'restart', newSessionId: 'new' }, 300);
  expect(scope.update(core.tick(400), 5, hint('notMoving'))).toBeNull(); expect(scope.changed).toBe(true);
});
