import { expect, it } from 'vitest';
import { createController } from './controller';
import { emptyCustomization } from './customization';
import { createGalleryStore, GALLERY_KEY, isSessionResult } from '../browser/storage';
import { toMenu } from '../../tests/helpers';
import { GLAZES } from './materials';

it.each(GLAZES)('saves and reloads the $id material through real controller finalization', ({ id }) => {
  const core = createController({ nowIso: () => '2026-10-03T00:00:00Z' }); let now = toMenu(core);
  core.dispatch({ type: 'start', mode: 'free', sessionId: id }, now);
  core.dispatch({ type: 'finishShaping' }, ++now);
  core.dispatch({ type: 'selectGlaze', glazeId: id }, ++now);
  core.dispatch({ type: 'confirmGlaze' }, ++now);
  const result = core.tick(now + 5000).result!;
  const data = new Map<string, string>();
  const backend = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); } };
  expect(createGalleryStore(() => backend).saveDetailed(result)).toBe('saved');
  expect(createGalleryStore(() => backend).list()[0].glazeId).toBe(id);
});

it('finalizes the last confirmed decoration once and restores an earlier checkpoint without later additions', () => {
  const core = createController({ nowIso: () => '2026-10-03T00:00:00Z' }); let now = toMenu(core);
  core.dispatch({ type: 'start', mode: 'free', sessionId: 'decorated' }, now);
  core.dispatch({ type: 'finishShaping' }, ++now);
  const a = { id: 'a', kind: 'sphere' as const, anchor: { point: { x: 0, y: .6, z: 1 }, normal: { x: 0, y: 0, z: 1 } }, length: .3, width: .2, rotation: 0, tilt: 0, material: 'jade' as const };
  core.dispatch({ type: 'customize', value: { ...emptyCustomization(), attachments: [a] } }, ++now);
  core.dispatch({ type: 'selectGlaze', glazeId: 'cobalt' }, ++now);
  const saved = core.captureCheckpoint(now)!;
  core.dispatch({ type: 'customize', value: { ...emptyCustomization(), attachments: [a, { ...a, id: 'b' }] } }, ++now);
  expect(core.tick(now).customization?.attachments).toHaveLength(2);
  expect(core.restoreCheckpoint(saved, ++now)).toBe(true);
  expect(core.tick(now).customization?.attachments).toHaveLength(1);
  core.dispatch({ type: 'selectGlaze', glazeId: 'untrusted' }, ++now); expect(core.tick(now).glazeId).toBe('cobalt');
  core.dispatch({ type: 'confirmGlaze' }, ++now);
  core.dispatch({ type: 'customize', value: emptyCustomization() }, ++now);
  const finished = core.tick(now + 5000).result!;
  expect(finished.customization?.attachments).toHaveLength(1); expect(finished.schemaVersion).toBe(4);
  expect(core.tick(now + 6000).result).toBe(finished); expect(isSessionResult(finished)).toBe(true);
  const records = new Map<string,string>(); const storage = { getItem: (k:string) => records.get(k) ?? null, setItem: (k:string,v:string) => { records.set(k,v); } };
  const store = createGalleryStore(() => storage); expect(store.saveDetailed(finished)).toBe('saved'); expect(store.saveDetailed(finished)).toBe('duplicate');
  expect(createGalleryStore(() => storage).list()[0].customization).toEqual(finished.customization);
  records.set(GALLERY_KEY, '{"schemaVersion":99,"pots":[]}'); const future = createGalleryStore(() => storage);
  expect(future.saveDetailed(finished)).toBe('memory'); expect(records.get(GALLERY_KEY)).toContain('99');
});
