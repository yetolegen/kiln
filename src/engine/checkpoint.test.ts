import { expect, it } from 'vitest';
import { createController } from './controller';
import { readCheckpoint } from './checkpoint';
import { createCheckpointStore, CHECKPOINT_KEY } from '../browser/checkpointStore';
import { frame, hand, shapingHands, toMenu, poseHand, moving } from '../../tests/helpers';
import { createClay, enforceInvariants } from './clay';

function setup() {
  const core = createController({ nowIso: () => '2026-10-03T00:00:00.000Z' });
  const now = toMenu(core); core.dispatch({ type: 'start', mode: 'free', sessionId: 'checkpoint-test' }, now);
  return { core, now };
}

it('deep-copies geometry, rejects invalid checkpoints atomically, and keeps renderer revision monotonic', () => {
  const { core, now } = setup(); const saved = core.captureCheckpoint(now)!;
  expect(saved).not.toBeNull(); saved.clay.radii[0] = .8;
  expect(core.tick(now).clay!.radii[0]).toBe(1);
  const before = core.tick(now).clay;
  expect(core.restoreCheckpoint({ ...saved, clay: { ...saved.clay, height: NaN } }, now + 1)).toBe(false);
  expect(core.tick(now).clay).toBe(before);
  const valid = core.captureCheckpoint(now)!;
  expect(core.restoreCheckpoint(valid, now + 2)).toBe(true);
  expect(core.tick(now + 2).clay!.revision).toBeGreaterThan(before!.revision);
  expect(core.tick(now + 2).clay!.touching).toBe(false);
});

it('restores shaping from glaze without erasing history, accepts no late/held deformation, then resumes on release', () => {
  const { core, now } = setup(); const saved = core.captureCheckpoint(now)!;
  core.observe(frame(now + 100, null, null));
  core.dispatch({ type: 'finishShaping' }, now + 500);
  expect(core.tick(now + 500).phase).toBe('glaze');
  const stats = core.tick(now + 500).stats!;
  expect(core.restoreCheckpoint(saved, now + 800)).toBe(true);
  expect(core.tick(now + 900).stats!.durationMs).toBeGreaterThan(stats.durationMs);
  expect(core.tick(now + 900).stats!.trackingEpisodes).toEqual(stats.trackingEpisodes);
  expect(core.tick(now + 900).stats!.restores).toBe(1);
  const revision = core.tick(now + 900).clay!.revision;
  core.observe(frame(now + 700, ...shapingHands(1000)));
  expect(core.tick(now + 900).input).toBeNull();
  for (let i = 0; i < 35; i++) core.observe(frame(now + 1000 + i * 33, ...shapingHands(i * 33)));
  expect(core.tick(now + 2130).clay!.revision).toBe(revision);
  core.observe(frame(now + 2200, hand(-3, .6), hand(3, .6)));
  for (let i = 0; i < 50; i++) core.observe(frame(now + 2300 + i * 33, ...shapingHands(i * 33)));
  expect(core.tick(now + 4000).clay!.radii[24]).toBeLessThan(1);
});

it('cannot replace a fired result, and reload starts a new clock with preserved totals', () => {
  const { core, now } = setup(); const saved = core.captureCheckpoint(now + 800)!;
  const fresh = setup();
  fresh.core.dispatch({ type: 'backToMenu' }, fresh.now);
  expect(fresh.core.restoreCheckpoint(saved, 100, 'resumed')).toBe(true);
  expect(fresh.core.tick(200).stats).toMatchObject({ sessionId: 'resumed', durationMs: 900, restores: 1 });
  core.dispatch({ type: 'finishShaping' }, now + 1000); core.dispatch({ type: 'selectGlaze', glazeId: 'jade' }, now + 1001);
  core.dispatch({ type: 'confirmGlaze' }, now + 1002);
  expect(core.restoreCheckpoint(saved, now + 1003)).toBe(false);
  const result = core.tick(now + 6000).result;
  expect(core.restoreCheckpoint(saved, now + 6001)).toBe(false);
  expect(core.tick(now + 6002).result).toBe(result);
});

it('bounds and whitelists persisted data; terminal/derived-corrupt clay cannot replace a good save', () => {
  const { core, now } = setup(); const saved = core.captureCheckpoint(now)!;
  const values = new Map<string, string>(); const storage = { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); } };
  const store = createCheckpointStore(() => storage); expect(store.save(saved)).toBe(true);
  expect(store.save({ ...saved, clay: { ...saved.clay, thickness: .01 } })).toBe(false);
  expect(store.save({ ...saved, clay: { ...saved.clay, collapsed: true, collapseCause: 'pancake' } })).toBe(false);
  expect(store.load()).toEqual(saved);
  const future = '{"version":99}'; values.set(CHECKPOINT_KEY, future);
  const protectedStore = createCheckpointStore(() => storage); expect(protectedStore.save(saved)).toBe(true);
  expect(values.get(CHECKPOINT_KEY)).toBe(future); expect(protectedStore.persistent).toBe(false);
  const memory = createCheckpointStore(() => { throw Error('denied'); }); expect(memory.save(saved)).toBe(true); expect(memory.persistent).toBe(false);
  const extra = readCheckpoint({ ...saved, camera: 'discard', stats: { ...saved.stats, camera: 'discard' } })!;
  expect(extra).not.toHaveProperty('camera'); expect(extra.stats).not.toHaveProperty('camera');
});

it('rejects coerced enum values and an empty session id before restoration', () => {
  const { core, now } = setup(), saved = core.captureCheckpoint(now)!;
  for (const value of [
    { ...saved, stage: ['studio'] },
    { ...saved, clay: { ...saved.clay, collapsed: true, collapseCause: ['thinWall'] } },
    { ...saved, stats: { ...saved.stats, sessionId: '' } },
  ]) {
    expect(readCheckpoint(value)).toBeNull();
    expect(core.restoreCheckpoint(value, now + 1)).toBe(false);
    expect(core.tick(now + 1).phase).toBe('studio');
  }
});

it('restores decoration geometry without erasing later editing mistakes', () => {
  const { core, now } = setup(), shapingPoint = core.captureCheckpoint(now)!;
  core.dispatch({ type: 'finishShaping' }, now + 100);
  const value = core.tick(now + 100).customization!;
  core.dispatch({ type: 'customize', value: { ...value, editMistakes: 3 } }, now + 200);
  expect(core.restoreCheckpoint(shapingPoint, now + 300)).toBe(true);
  expect(core.tick(now + 300).customization!.editMistakes).toBe(3);
  expect(core.tick(now + 300).customization!.attachments).toEqual([]);
});

it.each([1, 2])('prepared recovery lesson uses real terminal compression and restores safely with active hand %i', (id) => {
  const { core, now: start } = setup(); let now = start;
  const cp = core.captureCheckpoint(now)!; const c = createClay(); c.height = .4; enforceInvariants(c);
  cp.clay = { ...c, radii: Array.from(c.radii), damage: Array.from(c.damage) };
  expect(core.restoreCheckpoint(cp, ++now)).toBe(true);
  core.observe(frame(now += 33, hand(-3, .6), hand(3, .6)));
  function feed(press: boolean) {
    now += 33; const current = core.tick(now).clay!;
    const active = poseHand('flat', 0, current.height + .1, { trackId: id, ...(press ? moving(0, -.5) : {}) });
    const support = poseHand('wall', (id === 1 ? 1 : -1) * current.radii[24], current.height / 2, { trackId: id === 1 ? 2 : 1 });
    const hands = [active, support].sort((a, b) => a.palmWorld.x - b.palmWorld.x); core.observe(frame(now, hands[0], hands[1]));
  }
  for (let i = 0; i < 25; i++) feed(false); for (let i = 0; i < 120; i++) feed(true);
  expect(core.tick(now).clay!.collapseCause).toBe('pancake');
  expect(core.captureCheckpoint(now)).toBeNull();
  core.dispatch({ type: 'finishShaping' }, now); expect(core.tick(now).phase).toBe('studio');
  expect(core.restoreCheckpoint(cp, ++now)).toBe(true); expect(core.tick(now).clay!.height).toBe(.4);
  expect(core.tick(now).clay!.collapseCause).toBeNull();
  expect(core.tick(now).stats!.executionEpisodes.collapse).toBeGreaterThan(0);
});
