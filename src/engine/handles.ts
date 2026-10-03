import type { ClayState } from '../types';
import type { Anchor, XYZ } from './customization';

export const HANDLE_PRESETS = ['round', 'angular', 'arch'] as const;
export type HandlePreset = typeof HANDLE_PRESETS[number];
export interface PotteryHandle { id: string; preset: HandlePreset; anchor: Anchor; rotation: number; scale: number }
export const HANDLE_LIMIT = 4;
export const HANDLE_MIN_SCALE = .2;
export const HANDLE_PLACEMENT_HINT = 'Подвинь ручку ближе к изделию — точки крепления должны касаться глины.';
export function bodyRadius(clay: Pick<ClayState, 'radii' | 'height'>, y: number): number {
  const band = Math.max(0, Math.min(clay.radii.length - 1, y / clay.height * (clay.radii.length - 1)));
  const lo = Math.floor(band), t = band - lo;
  return clay.radii[lo] * (1 - t) + clay.radii[Math.min(lo + 1, clay.radii.length - 1)] * t;
}
/** The fixed preset is transformed as a whole. These same coordinates drive validation and rendering. */
export function handlePoint(h: PotteryHandle, p: XYZ): XYZ {
  const theta = Math.atan2(h.anchor.point.x, h.anchor.point.z);
  if (h.preset === 'arch') {
    const a = theta + h.rotation;
    return { x: (p.x * Math.sin(a) - p.z * Math.cos(a)) * h.scale, y: h.anchor.point.y + p.y * h.scale, z: (p.x * Math.cos(a) + p.z * Math.sin(a)) * h.scale };
  }
  const c = Math.cos(h.rotation), s = Math.sin(h.rotation);
  const x = (p.x * c - p.y * s) * h.scale, y = (p.x * s + p.y * c) * h.scale, z = p.z * h.scale;
  return { x: h.anchor.point.x + x * Math.cos(theta) + z * Math.sin(theta), y: h.anchor.point.y + y, z: h.anchor.point.z - x * Math.sin(theta) + z * Math.cos(theta) };
}
export function handleEndpoints(h: PotteryHandle): XYZ[] {
  return (h.preset === 'arch' ? [{ x: -1, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }] :
    [{ x: 0, y: -.5, z: -.04 }, { x: 0, y: .5, z: -.04 }]).map(p => handlePoint(h, p));
}
export function handleFits(h: PotteryHandle, clay: ClayState): boolean {
  const a = h.anchor.point;
  if (![a.x, a.y, a.z, h.rotation, h.scale].every(Number.isFinite) || h.scale < HANDLE_MIN_SCALE || h.scale > 1.8) return false;
  if (Math.abs(Math.hypot(a.x, a.z) - bodyRadius(clay, a.y)) > .026 || a.y < .025 || a.y > clay.height - .02) return false;
  if (h.preset === 'arch' && Math.abs(a.y - (clay.height - .05)) > .005) return false;
  return handleEndpoints(h).every(p => p.y >= .02 && p.y <= clay.height - .012 &&
    Math.abs(Math.hypot(p.x, p.z) - bodyRadius(clay, p.y)) <= .045 &&
    (p.y < clay.height - clay.cavityDepthWorld || Math.hypot(p.x, p.z) > clay.cavityRadiusWorld + .015));
}
export function placeHandle(preset: HandlePreset, anchor: Anchor, clay: ClayState, id: string, scale?: number, rotation = 0): PotteryHandle {
  const theta = Math.atan2(anchor.point.x, anchor.point.z);
  const y = preset === 'arch' ? clay.height - .05 : anchor.point.y;
  const r = bodyRadius(clay, y);
  return { id, preset, rotation, scale: preset === 'arch' ? r - .02 : scale ?? Math.max(HANDLE_MIN_SCALE, Math.min(.65, clay.height * .55)),
    anchor: { point: { x: Math.sin(theta) * r, y, z: Math.cos(theta) * r }, normal: { x: Math.sin(theta), y: 0, z: Math.cos(theta) } } };
}
export function handlePlacementHint(h: PotteryHandle, clay: ClayState): string {
  if (h.preset !== 'arch' && clay.height < HANDLE_MIN_SCALE + .04) return 'Для боковой ручки форма слишком низкая. Выберите верхнюю дугу или продолжите без ручки.';
  if (h.preset === 'arch' && clay.cavityDepthWorld > .05 && h.scale <= clay.cavityRadiusWorld + .015) return 'Точки крепления дуги попадают в отверстие. Выберите боковую ручку или продолжите без ручки.';
  return HANDLE_PLACEMENT_HINT;
}
