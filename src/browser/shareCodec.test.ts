import { expect, it, vi } from 'vitest';
import { decodeShare, encodeShare, MAX_SHARE_HASH, packArtifact, ShareUnsupportedError, unpackArtifact } from './shareCodec';
import { createClay } from '../engine/clay';
import { customizationFits, emptyCustomization } from '../engine/customization';
import { HANDLE_LIMIT, placeHandle } from '../engine/handles';
import type { DisplayArtifact } from '../engine/artifact';

const work = (): DisplayArtifact => ({ clay: createClay(), glazeId: 'jade', customization: emptyCustomization() });
it('uses one gzip/base64url wire format, strips history and measures typical/max legal shapes', async () => {
  const a = work(); const simple = await encodeShare(a);
  expect((await decodeShare(simple)).clay.radii).toEqual(a.clay.radii);
  const anchor = { point: { x: 0, y: .6, z: 1 }, normal: { x: 0, y: 0, z: 1 } };
  a.customization.attachments = Array.from({ length: 6 }, (_, i) => ({ id: `private-id-${i}`, kind: 'cone', anchor, length: .3 + i * .03, width: .2, rotation: i * .2, tilt: .1, material: 'cobalt' }));
  a.customization.stamps = Array.from({ length: 8 }, (_, i) => ({ id: `secret-${i}`, kind: 'wave', anchor, size: .3, rotation: i * .3, color: 'chalk' }));
  a.customization.editMistakes = 123;
  const max = await encodeShare(a), back = await decodeShare(max);
  expect(max.length).toBeLessThan(MAX_SHARE_HASH); expect(back.customization.attachments).toHaveLength(6); expect(back.customization.stamps).toHaveLength(8);
  expect(JSON.stringify(packArtifact(a))).not.toContain('private-id'); expect(back.customization.editMistakes).toBe(0);
  console.info(`Share hash lengths: typical=${simple.length}, 6 attachments + 8 stamps=${max.length}`);
});
it('a fully decorated pot with the maximum handles still fits a link and round-trips its handles', async () => {
  const a = work(), anchor = { point: { x: 0, y: .6, z: 1 }, normal: { x: 0, y: 0, z: 1 } };
  a.customization.attachments = Array.from({ length: 6 }, (_, i) => ({ id: `a${i}`, kind: 'cone', anchor, length: .3 + i * .03, width: .2, rotation: i * .2, tilt: .1, material: 'cobalt' }));
  a.customization.stamps = Array.from({ length: 8 }, (_, i) => ({ id: `s${i}`, kind: 'wave', anchor, size: .3, rotation: i * .3, color: 'chalk' }));
  const sides = [{ x: 1, z: 0 }, { x: -1, z: 0 }, { x: 0, z: 1 }, { x: 0, z: -1 }];
  a.customization.handles = sides.slice(0, HANDLE_LIMIT).map((n, i) => placeHandle('round', { point: { x: n.x, y: .6, z: n.z }, normal: { x: n.x, y: 0, z: n.z } }, a.clay, `private-handle-${i}`));
  expect(customizationFits(a.customization, a.clay)).toBe(true); // otherwise the codec would (rightly) refuse it
  const hash = await encodeShare(a), back = await decodeShare(hash);
  expect(hash.length).toBeLessThan(MAX_SHARE_HASH);
  expect(back.customization.handles.map(h => [h.preset, h.scale, h.rotation])).toEqual(a.customization.handles.map(h => [h.preset, h.scale, h.rotation]));
  expect(JSON.stringify(packArtifact(a))).not.toContain('private-handle');
  const p = packArtifact(a) as { handles: Record<string, unknown>[] } & Record<string, unknown>;
  for (const bad of [{ preset: 'script' }, { scale: 99 }, { rotation: NaN }]) expect(unpackArtifact({ ...p, handles: [{ ...p.handles[0], ...bad }] })).toBeNull();
  expect(unpackArtifact({ ...p, handles: Array(HANDLE_LIMIT + 1).fill(p.handles[0]) })).toBeNull();
});

it('rejects malformed, unknown-version, oversized, nonfinite and unsupported artifact structures', async () => {
  for (const hash of ['#pot=v2.abc', '#pot=v1.!', '#pot=v1.' + 'a'.repeat(12000)]) await expect(decodeShare(hash)).rejects.toThrow();
  const p = packArtifact(work()) as Record<string, unknown>;
  for (const patch of [{ p: [1] }, { h: Infinity }, { c: [1, 50] }, { v: 99 }, { g: 'remote' }, { score: 100 }, { a: [{ kind: 'script' }] }]) expect(unpackArtifact({ ...p, ...patch })).toBeNull();
});

it('rejects a bottom-hole cause without its matching hole geometry', () => {
  const packed = packArtifact(work()) as Record<string, unknown>;
  expect(unpackArtifact({ ...packed, failed: true, cause: 'bottomHole', hole: false })).toBeNull();
});
it('stops a compressed expansion bomb while streaming, before JSON parsing', async () => {
  const bytes = new TextEncoder().encode(' '.repeat(200000));
  const zipped = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
  let binary = ''; for (const byte of zipped) binary += String.fromCharCode(byte);
  const hash = '#pot=v1.' + btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  await expect(decodeShare(hash)).rejects.toThrow('предел');
});

it('a browser without (De)CompressionStream gets a specific error, not a "broken link" or a raw ReferenceError', async () => {
  const hash = await encodeShare(work());
  vi.stubGlobal('CompressionStream', undefined); vi.stubGlobal('DecompressionStream', undefined);
  try {
    await expect(encodeShare(work())).rejects.toBeInstanceOf(ShareUnsupportedError);
    await expect(decodeShare(hash)).rejects.toBeInstanceOf(ShareUnsupportedError);
    await expect(decodeShare(hash)).rejects.toThrow(/браузер/);
  } finally { vi.unstubAllGlobals(); }
});
