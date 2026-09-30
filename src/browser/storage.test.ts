import { expect, it, vi } from 'vitest';
import { createGalleryStore, GALLERY_KEY, isSessionResult, MAX_POTS } from './storage';
import { MockCore } from '../dev/mockCore';
import { CONFIG } from '../config';

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
  const invalid = [ { ...valid, schemaVersion: 4 }, { ...valid, height: Infinity }, { ...valid, finalProfile: [1] },
    { ...valid, damage: Array(48).fill(-1) }, { ...valid, thickness: 3 }, { ...valid, completedAtIso: 'yesterday' },
    { ...valid, stats: { ...valid.stats, durationMs: -1 } }, { ...valid, stats: { ...valid.stats, similarity: { ...valid.stats.similarity, score: 101 } } } ];
  for (const item of invalid) expect(isSessionResult(item)).toBe(false);
  const backend = storage(JSON.stringify([null, ...invalid, valid, valid]));
  expect(createGalleryStore(() => backend).list()).toHaveLength(1);
});
it('migrates schema 1 pots as solid, preserves scores and drops retired gesture names', () => {
  const old = { ...result(), schemaVersion: 1, thickness: .25, cavityRadiusWorld: undefined, cavityDepthWorld: undefined };
  Object.assign(old.stats.gestureMs, { pressDown: 4000 });
  const store = createGalleryStore(() => storage(JSON.stringify({ schemaVersion: 1, pots: [old], bestScores: { 'vase@1': 95 } })));
  expect(store.list()[0]).toMatchObject({ schemaVersion: 3, cavityRadiusWorld: 0, cavityDepthWorld: 0, floorThicknessWorld: old.height, bottomHole: false, thickness: 1 });
  expect(store.list()[0].stats.gestureMs).not.toHaveProperty('pressDown');
  expect(store.best('vase@1')).toBe(95);
});

it('migrates schema 2 cavities and preserves a schema 3 through-hole without accepting inconsistent floors', () => {
  const core = new MockCore(); core.key('i', 0); core.key('o', 0); core.key('8', 0);
  const old = { ...core.tick(0).result!, schemaVersion: 2, floorThicknessWorld: undefined, bottomHole: undefined };
  const migrated = createGalleryStore(() => storage(JSON.stringify({ schemaVersion: 2, pots: [old], bestScores: { 'vase@1': 90 } })));
  expect(migrated.list()[0]).toMatchObject({ schemaVersion: 3, cavityDepthWorld: old.cavityDepthWorld, floorThicknessWorld: old.height - old.cavityDepthWorld, bottomHole: false });
  expect(migrated.best('vase@1')).toBe(90);
  core.key('b', 0); core.key('8', 0);
  const hole = core.tick(0).result!, backend = storage();
  expect(createGalleryStore(() => backend).save(hole)).toBe(true);
  expect(createGalleryStore(() => backend).list()[0]).toEqual(hole);
  for (const patch of [{ bottomHole: false }, { floorThicknessWorld: .2 }, { cavityDepthWorld: hole.height - .1 }, { collapsed: false }]) expect(isSessionResult({ ...hole, ...patch })).toBe(false);
});
it('round trips a real cavity and rejects impossible floors, walls and derived thickness', () => {
  const core = new MockCore(); core.key('i', 0); core.key('o', 0); core.key('8', 0);
  const pot = core.tick(0).result!, backend = storage(), store = createGalleryStore(() => backend);
  expect(store.save(pot)).toBe(true);
  expect(createGalleryStore(() => backend).list()[0]).toEqual(pot);
  for (const patch of [{ cavityRadiusWorld: 0 }, { cavityRadiusWorld: 2 }, { cavityDepthWorld: pot.height }, { cavityDepthWorld: -1 }, { thickness: .02 }]) expect(isSessionResult({ ...pot, ...patch })).toBe(false);
});

it.each([2, 3])('retains a 20-percent pancake in schema %i through loading and saving', (schemaVersion) => {
  const core = new MockCore(); core.key('n', 0); core.key('8', 0);
  const pot = core.tick(0).result!;
  expect(pot.height).toBe(CONFIG.INIT_HEIGHT * .2);
  const old = { ...pot, schemaVersion, ...(schemaVersion === 2 ? { floorThicknessWorld: undefined, bottomHole: undefined } : {}) };
  const backend = storage(JSON.stringify({ schemaVersion, pots: [old] }));
  const loaded = createGalleryStore(() => backend).list()[0];
  expect(loaded).toMatchObject({ schemaVersion: 3, height: .24, cavityDepthWorld: 0, cavityRadiusWorld: 0, floorThicknessWorld: .24, collapsed: true });
  const saved = storage(); expect(createGalleryStore(() => saved).save(loaded)).toBe(true);
  expect(createGalleryStore(() => saved).list()[0]).toEqual(loaded);
});

it('preserves a local torn wall without turning it into a flattened pot on reload', () => {
  const core = new MockCore(); core.key('i', 0); core.key('o', 0); core.key('8', 0);
  const pot = core.tick(0).result!;
  pot.collapsed = true; pot.damage[32] = .8;
  const backend = storage(); expect(createGalleryStore(() => backend).save(pot)).toBe(true);
  const loaded = createGalleryStore(() => backend).list()[0];
  expect(loaded.height).toBe(pot.height); expect(loaded.damage[32]).toBe(.8); expect(loaded.damage[0]).toBe(0);
  expect(loaded.cavityRadiusWorld).toBe(pot.cavityRadiusWorld);
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
