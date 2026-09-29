// FrameInput → GestureState (PLAN §6).
// Decision order (first match wins): unusable input → raise → point → both pinch → both fist → both open → none.
// A new pose must hold GESTURE_STABLE_MS; losing tracking or a hand drops two-hand gestures instantly.
import { CONFIG } from '../config';
import { computeContact, type ContactResult } from '../engine/contact';
import type {
  ClayState, ContactState, FrameInput, Gesture, GestureContext, GestureState, HandFeatures, NearMiss,
  ProjectionParams, Vec2,
} from '../types';

const NO_CONTACT: ContactState = {
  valid: false, activeBand: null, bandY: null, leftErrorWorld: null, rightErrorWorld: null, reason: null,
};
const TWO_HAND: readonly Gesture[] = ['shape', 'pullUp', 'pressDown', 'raise'];
const UNTRUSTED = ['stale', 'invalidLandmarks', 'ambiguousTracks'];

// Hysteresis: entering a pose needs the strict threshold, staying in it only the loose one.
const fingers = (h: HandFeatures) => [h.extension.index, h.extension.middle, h.extension.ring, h.extension.pinky];
const allOpen = (h: HandFeatures, sticky: boolean) =>
  fingers(h).every((v) => v >= (sticky ? CONFIG.FINGER_OPEN_OFF : CONFIG.FINGER_OPEN_ON));
// fist = ALL four fingers curled, not average openness (a pointing hand has low average openness)
const isFist = (h: HandFeatures, sticky: boolean) =>
  fingers(h).every((v) => v < (sticky ? CONFIG.FINGER_CURLED_OFF : CONFIG.FINGER_CURLED_ON));
const isPinch = (h: HandFeatures, sticky: boolean) => h.pinchRatio < (sticky ? CONFIG.PINCH_OFF : CONFIG.PINCH_ON);
const openPalm = (h: HandFeatures, sticky: boolean) =>
  allOpen(h, sticky) && h.pinchRatio > (sticky ? CONFIG.PINCH_ON : CONFIG.PINCH_OFF) && !h.pointing;
const side = (h: HandFeatures, l: HandFeatures) => (h === l ? 'left' : 'right');
const vUp = (h: HandFeatures) => (h.velocityValid ? h.velocityPalmPerS.y : 0);

export class GestureRecognizer {
  private current: Gesture = 'none';
  private currentSinceMs = 0;
  private candidate: Gesture = 'none';
  private candidateSinceMs = 0;
  private contactValid = false;
  private motionDir = 0;
  private movingL = false;
  private movingR = false;
  private stillSinceMs: number | null = null;

  reset(): void {
    this.current = 'none';
    this.candidate = 'none';
    this.contactValid = false;
    this.motionDir = 0;
    this.movingL = this.movingR = false;
    this.stillSinceMs = null;
  }

  update(frame: FrameInput, ctx: GestureContext, clay: ClayState, proj: ProjectionParams): GestureState {
    const t = frame.tMs;
    const l = frame.screenLeft, r = frame.screenRight;
    const trusted = !UNTRUSTED.includes(frame.status);
    const both = frame.status === 'ready' && l !== null && r !== null;
    const cur = this.current;
    const raisePhase = ctx.phase === 'studio' || (ctx.phase === 'tutorial' && ctx.expectedGesture === 'raise');
    const raiseLineWorld = clay.height + CONFIG.RAISE_MARGIN_WORLD;
    // In shaping phases a stray index finger during press must not become a cursor (it could dwell on
    // "start over"), so there pointing only counts with ONE hand visible.
    const shapingPhase = ctx.phase === 'studio' || ctx.phase === 'tutorial';
    const pointAllowed = trusted && ctx.uiEnabled && (!shapingPhase || !l || !r);
    const pointer = pointAllowed ? [r, l].find((h) => h?.pointing) ?? null : null;

    let cand: Gesture = 'none';
    if (both && raisePhase && allOpen(l, cur === 'raise') && allOpen(r, cur === 'raise') &&
        l.palmWorld.y > raiseLineWorld && r.palmWorld.y > raiseLineWorld) cand = 'raise';
    else if (pointer) cand = 'point';
    else if (both && isPinch(l, cur === 'pullUp') && isPinch(r, cur === 'pullUp')) cand = 'pullUp';
    else if (both && isFist(l, cur === 'pressDown') && isFist(r, cur === 'pressDown')) cand = 'pressDown';
    else if (both && openPalm(l, cur === 'shape') && openPalm(r, cur === 'shape')) cand = 'shape';
    else if (trusted && !l !== !r) cand = 'oneHand'; // exactly one hand; two hands in a bad frame are 'none'

    if (cand !== this.candidate) {
      this.candidate = cand;
      this.candidateSinceMs = t;
    }
    const immediate = !trusted || (!both && TWO_HAND.includes(cur));
    if (cand !== cur && (immediate || t - this.candidateSinceMs >= CONFIG.GESTURE_STABLE_MS)) {
      this.current = cand;
      this.currentSinceMs = t;
    }
    const g = this.current;

    const motionStrength = both ? this.motion(g, l, r) : this.motion('none', null, null);
    const c = both ? computeContact(l, r, clay, proj.pixelsPerWorldUnit, this.contactValid) : null;
    this.contactValid = !!c?.contact.valid;

    const allowed = ctx.phase === 'studio' || (ctx.phase === 'tutorial' && ctx.expectedGesture === g);
    const opposite = both && l.palmWorld.x < 0 && r.palmWorld.x > 0;
    let deforming = false;
    if (both && allowed && (!clay.collapsed || g === 'pressDown')) {
      if (g === 'shape') deforming = this.contactValid;
      else if (g === 'pullUp' || g === 'pressDown') deforming = opposite && motionStrength > 0;
    }

    if ((g === 'pullUp' || g === 'pressDown') && motionStrength === 0) this.stillSinceMs ??= t;
    else this.stillSinceMs = null;

    let speed = 0;
    for (const h of [l, r]) {
      if (h?.velocityValid) speed = Math.max(speed, Math.hypot(h.velocityPalmPerS.x, h.velocityPalmPerS.y));
    }
    const pointerNow = g === 'point' ? pointer : null;

    return {
      gesture: g,
      sourceFrameId: frame.frameId,
      capturedAtMs: t,
      holdMs: t - this.currentSinceMs,
      inputUsable: both,
      deforming,
      motionStrength: deforming ? motionStrength : 0,
      targetRadiusWorld: deforming && g === 'shape' ? c!.targetRadiusWorld : null,
      centerOffsetPalm: c?.centerOffsetPalm ?? null,
      speedPalmPerS: speed,
      contact: c?.contact ?? NO_CONTACT,
      cursorPx: pointerNow ? ({ ...pointerNow.indexTipPx } as Vec2) : null,
      nearMiss: both ? this.nearMiss(ctx, t, g, l, r, clay, c, motionStrength) : null,
    };
  }

  /**
   * 0..1: the SLOWER hand's vertical speed in the gesture's direction / FULL_MOTION.
   * Zero unless both hands move that way (per-hand on/off hysteresis), so a stationary pinch does nothing.
   */
  private motion(g: Gesture, l: HandFeatures | null, r: HandFeatures | null): number {
    const dir = g === 'pullUp' ? 1 : g === 'pressDown' ? -1 : 0;
    if (dir !== this.motionDir) {
      this.motionDir = dir;
      this.movingL = this.movingR = false;
    }
    if (!dir || !l || !r) return 0;
    const vl = dir * vUp(l), vr = dir * vUp(r);
    this.movingL = vl > (this.movingL ? CONFIG.MOTION_OFF_PALM_PER_S : CONFIG.MOTION_ON_PALM_PER_S);
    this.movingR = vr > (this.movingR ? CONFIG.MOTION_OFF_PALM_PER_S : CONFIG.MOTION_ON_PALM_PER_S);
    if (!this.movingL || !this.movingR) return 0;
    return Math.max(0, Math.min(1, Math.min(vl, vr) / CONFIG.FULL_MOTION_PALM_PER_S));
  }

  /** "Almost" a gesture. Only with evidence of an attempt; never from a neutral pose. */
  private nearMiss(
    ctx: GestureContext, t: number, g: Gesture, l: HandFeatures, r: HandFeatures, clay: ClayState,
    c: ContactResult | null, motionStrength: number,
  ): NearMiss | null {
    if (g === 'point' || g === 'raise') return null;
    const expected = ctx.phase === 'tutorial' ? ctx.expectedGesture : undefined;
    const yMean = (l.palmWorld.y + r.palmWorld.y) / 2;
    const inZone =
      Math.abs(l.palmWorld.x) < CONFIG.ATTEMPT_ZONE_X_WORLD && Math.abs(r.palmWorld.x) < CONFIG.ATTEMPT_ZONE_X_WORLD &&
      yMean > -CONFIG.ATTEMPT_ZONE_Y_MARGIN_WORLD && yMean < clay.height + CONFIG.ATTEMPT_ZONE_Y_MARGIN_WORLD;
    const up = (h: HandFeatures) => vUp(h) > CONFIG.MOTION_ON_PALM_PER_S;
    const down = (h: HandFeatures) => vUp(h) < -CONFIG.MOTION_ON_PALM_PER_S;
    const held = t - this.currentSinceMs >= CONFIG.NEAR_MISS_MIN_MS;

    // explicit attempt, right pose, but not moving
    if (expected && expected === g && (g === 'pullUp' || g === 'pressDown') && motionStrength === 0 &&
        this.stillSinceMs !== null && t - this.stillSinceMs >= CONFIG.NOT_MOVING_MS) {
      return { intended: g, reason: 'notMoving', params: {} };
    }

    // pull attempt: one hand pinched, the other almost, both moving up near the pot (or the tutorial asks)
    if (g !== 'pullUp') {
      const pinched = [l, r].filter((h) => isPinch(h, false));
      const loose = [l, r].filter((h) => !isPinch(h, false)).sort((a, b) => a.pinchRatio - b.pinchRatio)[0];
      const evidence = expected === 'pullUp' ||
        (pinched.length === 1 && loose && loose.pinchRatio < CONFIG.PINCH_LOOSE_MAX && up(l) && up(r) && inZone);
      if (evidence && loose) {
        return {
          intended: 'pullUp', reason: 'pinchLoose', handTrackId: loose.trackId,
          params: { side: side(loose, l), ratio: round2(loose.pinchRatio) },
        };
      }
    }

    // press attempt: one fist, the other almost, both moving down near the pot (or the tutorial asks)
    if (g !== 'pressDown') {
      const maxExt = (h: HandFeatures) => Math.max(...fingers(h));
      const fists = [l, r].filter((h) => isFist(h, false));
      const loose = [l, r].filter((h) => !isFist(h, false)).sort((a, b) => maxExt(a) - maxExt(b))[0];
      const evidence = expected === 'pressDown' ||
        (fists.length === 1 && loose && maxExt(loose) < CONFIG.FIST_LOOSE_MAX && down(l) && down(r) && inZone);
      if (evidence && loose) {
        return {
          intended: 'pressDown', reason: 'fistLoose', handTrackId: loose.trackId,
          params: { side: side(loose, l), extension: round2(maxExt(loose)) },
        };
      }
    }

    // finish attempt: open hands above the pot, but not above the raise line
    const openBoth = allOpen(l, false) && allOpen(r, false);
    if (openBoth && (expected === 'raise' || (ctx.phase === 'studio' && held && yMean > clay.height && !c?.contact.valid))) {
      return { intended: 'raise', reason: 'handsTooLow', params: {} };
    }

    // shaping attempt that doesn't touch both walls
    if (g === 'shape' && (held || expected === 'shape') && inZone && c && !c.contact.valid && c.contact.reason) {
      const reason = c.contact.reason;
      if (reason === 'handsTooFar' && c.contact.leftErrorWorld !== null && c.contact.rightErrorWorld !== null) {
        const far = Math.abs(c.contact.leftErrorWorld) >= Math.abs(c.contact.rightErrorWorld) ? l : r;
        const err = far === l ? c.contact.leftErrorWorld : c.contact.rightErrorWorld;
        return {
          intended: 'shape', reason, handTrackId: far.trackId,
          params: { side: side(far, l), dir: err > 0 ? 'in' : 'out' },
        };
      }
      if (reason === 'handsUneven') {
        const low = l.palmWorld.y < r.palmWorld.y ? l : r;
        return { intended: 'shape', reason, handTrackId: low.trackId, params: { raise: side(low, l) } };
      }
      return { intended: 'shape', reason, params: {} };
    }
    return null;
  }
}

const round2 = (v: number) => Math.round(v * 100) / 100;
