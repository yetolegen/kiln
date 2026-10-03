import { expect, it } from 'vitest';
import { RepeatWrapping } from 'three';
import { createClaySurface } from './claySurface';

it('bakes repeatable surface maps with continuous seams and visible angular variation', () => {
  const a = createClaySurface(64), b = createClaySurface(64);
  for (const map of [a.map, a.glazeMap, a.bumpMap, a.roughnessMap]) {
    expect(map.wrapS).toBe(RepeatWrapping);
    const bytes = map.image.data!;
    for (let y = 0; y < 64; y++) expect(bytes[(y * 64) * 4]).toBe(bytes[(y * 64 + 63) * 4]);
    for (let x = 0; x < 64; x++) expect(bytes[x * 4]).toBe(bytes[(63 * 64 + x) * 4]);
  }
  const ring = Array.from({ length: 64 }, (_, x) => a.map.image.data![(20 * 64 + x) * 4]);
  expect(Math.max(...ring) - Math.min(...ring)).toBeGreaterThan(20);
  expect(a.map.image.data).toEqual(b.map.image.data);
  // Pale slip highlights must saturate rather than wrap to black in the byte texture.
  expect(Math.min(...a.map.image.data!)).toBeGreaterThan(100);
  a.dispose(); b.dispose();
});
