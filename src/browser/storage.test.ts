import { expect, it, vi } from 'vitest';
import { createGalleryStore, GALLERY_KEY, isSessionResult, MAX_POTS } from './storage';
import { MockCore } from '../dev/mockCore';

function result(id = 'one', score = 82) {
  const core = new MockCore(); core.key('8', 0);
  const pot = core.tick(0).result!; pot.id = id; pot.stats.sessionId = id; pot.stats.similarity!.score = score; return pot;
}
function storage(raw: string | null = null) {
  const data = new Map<string, string>(raw ? [[GALLERY_KEY, raw]] : []);
  return { getItem: (key: string) => data.get(key) ?? null, setItem: vi.fn((key: string, value: string) => { data.set(key, value); }) };
}
it('validates persisted profiles, finite stats and schema while retaining valid records', () => {
  const valid = result(); expect(isSessionResult(valid)).toBe(true);
  const invalid = [ { ...valid, schemaVersion: 2 }, { ...valid, height: Infinity }, { ...valid, finalProfile: [1] },
    { ...valid, damage: Array(48).fill(-1) }, { ...valid, thickness: 3 }, { ...valid, completedAtIso: 'yesterday' },
    { ...valid, stats: { ...valid.stats, durationMs: -1 } }, { ...valid, stats: { ...valid.stats, similarity: { ...valid.stats.similarity, score: 101 } } } ];
  for (const item of invalid) expect(isSessionResult(item)).toBe(false);
  const backend = storage(JSON.stringify([null, ...invalid, valid, valid]));
  expect(createGalleryStore(() => backend).list()).toHaveLength(1);
});
it('saves once, copies snapshots, and keeps working in memory after quota or access failure', () => {
  const backend = storage(), store = createGalleryStore(() => backend), pot = result();
  expect(store.save(pot)).toBe(true); expect(store.save(pot)).toBe(false); expect(backend.setItem).toHaveBeenCalledTimes(1);
  pot.finalProfile[0] = .5; expect(store.list()[0].finalProfile[0]).not.toBe(.5);
  const blocked = createGalleryStore(() => { throw new Error('disabled'); });
  expect(blocked.save(result())).toBe(true); expect(blocked.persistent).toBe(false); expect(blocked.list()).toHaveLength(1);
});
it('keeps target-version best scores even when an older pot leaves the bounded shelf', () => {
  const backend = storage(), store = createGalleryStore(() => backend);
  store.save(result('best', 100));
  for (let i = 0; i < MAX_POTS; i++) store.save(result(`pot-${i}`, 50));
  expect(store.list()).toHaveLength(MAX_POTS);
  expect(store.best('vase@1')).toBe(100);
  expect(store.best('vase@2')).toBeNull();
  expect(createGalleryStore(() => backend).best('vase@1')).toBe(100);
});
