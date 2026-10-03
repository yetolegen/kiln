import { expect, it } from 'vitest';
import { createClay } from './clay';
import { anchorOnBody, customizationFits, emptyCustomization, readCustomization, type Attachment } from './customization';
const piece: Attachment = { id: 'a', kind: 'sphere', anchor: { point: { x: 0, y: .5, z: 1 }, normal: { x: 0, y: 0, z: 1 } }, length: .3, width: .2, rotation: 0, tilt: 0, material: 'amber' };
it('accepts rim attachments but rejects the cavity, downward faces and rim stamps', () => {
  const clay = createClay(); clay.cavityRadiusWorld = .5;
  const a = { point: { x: 0, y: clay.height, z: .75 }, normal: { x: 0, y: 1, z: 0 } };
  expect(anchorOnBody(a, clay)).toBe(true);
  expect(anchorOnBody(a, clay, .2)).toBe(false);
  expect(anchorOnBody({ ...a, point: { ...a.point, z: .3 } }, clay)).toBe(false);
  expect(anchorOnBody({ ...a, normal: { x: 0, y: -1, z: 0 } }, clay)).toBe(false);
});
it('round trips three primitive kinds with finite, normalized local anchors and no untrusted fields', () => {
  const c = { ...emptyCustomization(), attachments: ['sphere', 'cylinder', 'cone'].map((kind, i) => ({ ...piece, kind, id: String(i), remote: 'discard' })) };
  const valid = readCustomization(c)!;
  expect(valid.attachments).toHaveLength(3); expect(customizationFits(valid, createClay())).toBe(true);
  expect(valid.attachments[0]).not.toHaveProperty('remote');
  c.attachments[0].anchor.point.z = 8; expect(valid.attachments[0].anchor.point.z).toBe(1);
});
it('rejects excess pieces, duplicate ids, bad dimensions, aspect ratio, materials and orientations', () => {
  const base = { ...emptyCustomization(), attachments: [{ ...piece, anchor: { point: { x: 0, y: .5, z: 1 }, normal: { x: 0, y: 0, z: 1 } } }] };
  for (const patch of [{ length: NaN }, { width: -.2 }, { length: .8, width: .08 }, { material: 'url(x)' }, { rotation: 100 }, { kind: 'javascript' }, { anchor: { point: { x: 0, y: 0, z: 1 }, normal: { x: 0, y: 0, z: 2 } } }]) {
    expect(readCustomization({ ...base, attachments: [{ ...base.attachments[0], ...patch }] })).toBeNull();
  }
  expect(readCustomization({ ...base, attachments: [base.attachments[0], base.attachments[0]] })).toBeNull();
  expect(readCustomization({ ...base, attachments: Array.from({ length: 7 }, (_, i) => ({ ...base.attachments[0], id: String(i) })) })).toBeNull();
});
it('rejects inside/wheel anchors and stamps crossing the rim, without changing base geometry', () => {
  const clay = createClay(); const before = clay.radii.slice();
  for (const point of [{ x: 0, y: .6, z: .2 }, { x: 0, y: -.1, z: 1 }, { x: 0, y: 3, z: 1 }]) {
    expect(customizationFits({ ...emptyCustomization(), attachments: [{ ...piece, anchor: { ...piece.anchor, point } }] }, clay)).toBe(false);
  }
  expect(customizationFits({ ...emptyCustomization(), stamps: [{ id: 's', kind: 'star', anchor: { point: { x: 0, y: 1.1, z: 1 }, normal: { x: 0, y: 0, z: 1 } }, size: .4, rotation: 0, color: 'cobalt' }] }, clay)).toBe(false);
  expect(clay.radii).toEqual(before);
});
