import { expect, it } from 'vitest';
import { mostFrequentMistake, downloadPot } from './result';
import { MockCore } from '../dev/mockCore';
it('chooses coaching from execution episodes and excludes tracking interruptions', () => {
  const core = new MockCore(); core.key('8', 0); const result = core.tick(0).result!;
  result.stats.trackingEpisodes.noHands = 99;
  expect(mostFrequentMistake(result)).toBeNull();
  result.stats.executionEpisodes.tear = 2; result.stats.executionEpisodes.wobble = 3;
  expect(mostFrequentMistake(result)).toBe('wobble');
});
it('reports a failed PNG export without throwing', async () => {
  const core = new MockCore(); core.key('8', 0); const result = core.tick(0).result!;
  expect(await downloadPot(async () => { throw new Error('unavailable'); }, result)).toBe(false);
  expect(await downloadPot(async () => null, result)).toBe(false);
});
