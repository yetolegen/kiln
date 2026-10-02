import { CONFIG } from '../config';
import type { ClayState } from '../types';
import { isMaterial, type MaterialId } from './materials';

export type XYZ = { x: number; y: number; z: number };
export interface Anchor { point: XYZ; normal: XYZ }
export type AttachmentKind = 'sphere' | 'cylinder' | 'cone';
export type StampKind = 'star' | 'dots' | 'wave';
export interface Attachment { id: string; kind: AttachmentKind; anchor: Anchor; length: number; width: number; rotation: number; tilt: number; material: MaterialId }
export interface Stamp { id: string; kind: StampKind; anchor: Anchor; size: number; rotation: number; color: MaterialId }
export interface Customization { version: 1; revision: number; attachments: Attachment[]; stamps: Stamp[]; editMistakes: number }
export const emptyCustomization = (): Customization => ({ version: 1, revision: 0, attachments: [], stamps: [], editMistakes: 0 });
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const finite = (v: unknown, lo: number, hi: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
const id = (v: unknown): v is string => typeof v === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(v);
const vector = (v: unknown, max: number): v is XYZ => record(v) && ['x','y','z'].every(k => finite(v[k], -max, max));
function anchor(v: unknown): v is Anchor {
  return record(v) && vector(v.point, CONFIG.MAX_HEIGHT) && vector(v.normal, 1) &&
    v.point.y >= 0 && Math.hypot(v.point.x, v.point.z) <= CONFIG.MAX_R + .02 &&
    Math.abs(Math.hypot(v.normal.x, v.normal.y, v.normal.z) - 1) < .002;
}
const copyAnchor = (a: Anchor): Anchor => ({ point: { x: a.point.x, y: a.point.y, z: a.point.z }, normal: { x: a.normal.x, y: a.normal.y, z: a.normal.z } });
export function readCustomization(v: unknown): Customization | null {
  if (!record(v) || v.version !== 1 || !finite(v.revision, 0, 1e9) || !Number.isInteger(v.revision) ||
      !finite(v.editMistakes, 0, 1e9) || !Number.isInteger(v.editMistakes) ||
      !Array.isArray(v.attachments) || v.attachments.length > 6 || !Array.isArray(v.stamps) || v.stamps.length > 8) return null;
  const out: Customization = { version: 1, revision: v.revision, editMistakes: v.editMistakes, attachments: [], stamps: [] };
  const seen = new Set<string>();
  for (const a of v.attachments) {
    if (!record(a) || !id(a.id) || seen.has(a.id) || (typeof a.kind !== 'string' || !['sphere', 'cylinder', 'cone'].includes(a.kind)) || !anchor(a.anchor) ||
        !finite(a.length, .08, .8) || !finite(a.width, .08, .45) || a.length / a.width > 4 || a.width / a.length > 4 ||
        !finite(a.rotation, -Math.PI, Math.PI) || !finite(a.tilt, -.9, .9) || !isMaterial(a.material)) return null;
    seen.add(a.id); out.attachments.push({ id: a.id, kind: a.kind as AttachmentKind, anchor: copyAnchor(a.anchor), length: a.length, width: a.width,
      rotation: a.rotation, tilt: a.tilt, material: a.material });
  }
  for (const s of v.stamps) {
    if (!record(s) || !id(s.id) || seen.has(s.id) || (typeof s.kind !== 'string' || !['star', 'dots', 'wave'].includes(s.kind)) || !anchor(s.anchor) ||
        !finite(s.size, .08, .45) || !finite(s.rotation, -Math.PI, Math.PI) || !isMaterial(s.color)) return null;
    seen.add(s.id); out.stamps.push({ id: s.id, kind: s.kind as StampKind, anchor: copyAnchor(s.anchor), size: s.size, rotation: s.rotation, color: s.color });
  }
  return out;
}

/** Validate attachment anchoring against the actual outer profile, not just a bounding box. */
export function anchorOnBody(a: Anchor, clay: Pick<ClayState, 'radii' | 'height' | 'cavityRadiusWorld'>, stampSize = 0): boolean {
  const y = a.point.y;
  const r = Math.hypot(a.point.x, a.point.z);
  // Attachments may stand on the top annulus; stamp patches stay on the side wall.
  if (!stampSize && Math.abs(y - clay.height) <= .018 && a.normal.y > .7 &&
      r > clay.cavityRadiusWorld + .025 && r < clay.radii[clay.radii.length - 1] - .025) return true;
  if (y < .025 + stampSize / 2 || y > clay.height - .025 - stampSize / 2) return false;
  const band = y / clay.height * (clay.radii.length - 1), low = Math.floor(band), t = band - low;
  const radius = clay.radii[low] * (1 - t) + clay.radii[Math.min(low + 1, clay.radii.length - 1)] * t;
  return Math.abs(radius - r) < .025 && r > clay.cavityRadiusWorld &&
    (a.normal.x * a.point.x + a.normal.z * a.point.z) / Math.max(r, .001) > .15;
}
export function customizationFits(c: Customization, clay: ClayState): boolean {
  return c.attachments.every(a => anchorOnBody(a.anchor, clay)) && c.stamps.every(s => anchorOnBody(s.anchor, clay, s.size));
}
