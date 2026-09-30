import { expect, it } from 'vitest';
import { MockCore } from '../dev/mockCore';
import { clayDamageReason } from './clayDamage';

it.each(['free', 'commission', 'tutorial'] as const)('keeps %s damage visible after hint expiry/tracking loss, then clears on restart', (mode) => {
  const core = new MockCore();
  for (const [key, reason] of [['b', 'bottomHole'], ['n', 'pancake'], ['c', 'collapse'], ['t', 'surface']] as const) {
    core.dispatch({ type: 'start', mode, sessionId: key }, 0);
    core.key(key, 0);
    const damaged = core.tick(10_000);
    damaged.hint = null; damaged.input = null;
    expect(clayDamageReason(damaged)).toBe(reason);
    core.dispatch({ type: 'restart', newSessionId: 'retry' }, 10_001);
    expect(clayDamageReason(core.tick(10_002))).toBeNull();
  }
});

it('recognizes a permanent wall rupture without relying on a transient hint and does not call warnings damage', () => {
  const core = new MockCore(); core.dispatch({ type: 'start', mode: 'free', sessionId: 'tear' }, 0);
  core.key('e', 0); const warning = core.tick(0);
  expect(clayDamageReason(warning)).toBeNull();
  warning.clay!.collapsed = true; warning.clay!.collapseCause = 'wallTorn'; warning.hint = null;
  expect(clayDamageReason(warning)).toBe('wallTorn');
  warning.phase = 'menu'; expect(clayDamageReason(warning)).toBeNull();
});
