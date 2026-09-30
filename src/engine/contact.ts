// Two-wall contact (PLAN §6): the clay is touched only when each hand is at ITS wall.
// Checks run in order; the first failure is the reason. Nothing is clamped before the height check.
import { CONFIG } from '../config';
import type { ClayState, ContactState, HandFeatures, NearMissReason } from '../types';

export interface ContactResult {
  contact: ContactState;
  targetRadiusWorld: number | null;
  centerOffsetPalm: number | null; // + = hands' midpoint right of the wheel axis
}

/**
 * leftErrorWorld / rightErrorWorld: how far each palm is OUTSIDE its wall (+ = outside, − = pushed into the clay).
 * wasValid switches the reach threshold (enter at REACH_ON, stay until REACH_OFF) so contact doesn't flicker.
 */
/**
 * The user's palm length in world units. Tolerances scale with it: someone sitting close to a laptop
 * has a palm (≈215 px measured) bigger than the pot's radius (≈100 px), so fixed world distances
 * like "within 0.45 of the wall" were physically impossible to reach with a palm centre.
 */
export function palmWorldSize(pixelsPerWorldUnit: number, ...hands: HandFeatures[]): number {
  const px = hands.reduce((s, h) => s + h.referencePalmSizePx, 0) / Math.max(1, hands.length);
  return px > 0 && pixelsPerWorldUnit > 0 ? px / pixelsPerWorldUnit : 0;
}
/** A tolerance of `palms` palm lengths, never smaller than the world-unit floor. */
export const tol = (worldFloor: number, palms: number, palmW: number) => Math.max(worldFloor, palms * palmW);

export function computeContact(
  left: HandFeatures, right: HandFeatures, clay: Pick<ClayState, 'radii' | 'height'>,
  pixelsPerWorldUnit: number, wasValid: boolean,
): ContactResult {
  const lx = left.palmWorld.x, rx = right.palmWorld.x;
  const ly = left.palmWorld.y, ry = right.palmWorld.y;
  const palmW = palmWorldSize(pixelsPerWorldUnit, left, right);
  const refPx = left.referencePalmSizePx;
  const centerOffsetPalm = refPx > 0 ? (((lx + rx) / 2) * pixelsPerWorldUnit) / refPx : null;
  const miss = (reason: NearMissReason, le: number | null = null, re: number | null = null): ContactResult => ({
    contact: { valid: false, activeBand: null, bandY: null, leftErrorWorld: le, rightErrorWorld: re, reason },
    targetRadiusWorld: null,
    centerOffsetPalm,
  });

  // 1. hands on opposite sides of the axis (a gap on one side is not a pot)
  if (!(lx < 0 && rx > 0)) return miss('handsNotOpposite');
  // 2. roughly level
  if (Math.abs(ly - ry) > tol(CONFIG.HAND_LEVEL_TOL_WORLD, CONFIG.HAND_LEVEL_TOL_PALM, palmW)) return miss('handsUneven');
  // 3. within the real pot height; clamping first would let hands above the pot shape the top band
  const yMean = (ly + ry) / 2;
  const m = tol(CONFIG.VERTICAL_CONTACT_MARGIN_WORLD, CONFIG.VERTICAL_CONTACT_MARGIN_PALM, palmW);
  if (yMean < -m || yMean > clay.height + m) return miss('handsTooFar');
  // 4. which band
  const bandY = Math.max(0, Math.min(1, yMean / clay.height));
  const band = Math.round(bandY * (clay.radii.length - 1));
  const r = clay.radii[band];
  // 5. each palm near its own wall
  const le = -r - lx;
  const re = rx - r;
  const reach = wasValid
    ? tol(CONFIG.REACH_OFF_WORLD, CONFIG.REACH_OFF_PALM, palmW)
    : tol(CONFIG.REACH_ON_WORLD, CONFIG.REACH_ON_PALM, palmW);
  if (Math.abs(le) >= reach || Math.abs(re) >= reach) return miss('handsTooFar', le, re);

  return {
    contact: { valid: true, activeBand: band, bandY, leftErrorWorld: le, rightErrorWorld: re, reason: null },
    targetRadiusWorld: (rx - lx) / 2,
    centerOffsetPalm,
  };
}
