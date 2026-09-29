// FrameInput → GestureState (PLAN §6). A2: shape only; pull/press/raise/point arrive in A3.
// A pose must hold for GESTURE_STABLE_MS before it takes effect; losing hands drops it instantly.
import { CONFIG } from '../config';
import { computeContact } from '../engine/contact';
import type {
  ClayState, ContactState, FrameInput, Gesture, GestureContext, GestureState, HandFeatures, ProjectionParams,
} from '../types';

const NO_CONTACT: ContactState = {
  valid: false, activeBand: null, bandY: null, leftErrorWorld: null, rightErrorWorld: null, reason: null,
};

// Hysteresis: entering needs the strict threshold, staying only the loose one, so values near
// the threshold don't make the gesture flicker.
function allFingersOpen(h: HandFeatures, sticky: boolean): boolean {
  const th = sticky ? CONFIG.FINGER_OPEN_OFF : CONFIG.FINGER_OPEN_ON;
  const e = h.extension;
  return e.index >= th && e.middle >= th && e.ring >= th && e.pinky >= th;
}
function notPinching(h: HandFeatures, sticky: boolean): boolean {
  return h.pinchRatio > (sticky ? CONFIG.PINCH_ON : CONFIG.PINCH_OFF);
}

export class GestureRecognizer {
  private current: Gesture = 'none';
  private currentSinceMs = 0;
  private candidate: Gesture = 'none';
  private candidateSinceMs = 0;
  private contactValid = false;

  reset(): void {
    this.current = 'none';
    this.candidate = 'none';
    this.contactValid = false;
  }

  update(frame: FrameInput, ctx: GestureContext, clay: ClayState, proj: ProjectionParams): GestureState {
    const t = frame.tMs;
    const l = frame.screenLeft, r = frame.screenRight;
    const usable = frame.status === 'ready' && !!l && !!r;

    let cand: Gesture = 'none';
    if (l && r && usable) {
      const sticky = this.current === 'shape';
      const open = (h: HandFeatures) => allFingersOpen(h, sticky) && notPinching(h, sticky) && !h.pointing;
      if (open(l) && open(r)) cand = 'shape';
    } else if (l || r) {
      cand = 'oneHand';
    }

    if (cand !== this.candidate) {
      this.candidate = cand;
      this.candidateSinceMs = t;
    }
    // unusable input switches immediately (hand loss stops shaping now); poses must be stable first
    if (cand !== this.current && (!usable || t - this.candidateSinceMs >= CONFIG.GESTURE_STABLE_MS)) {
      this.current = cand;
      this.currentSinceMs = t;
    }

    const c = usable && l && r ? computeContact(l, r, clay, proj.pixelsPerWorldUnit, this.contactValid) : null;
    this.contactValid = !!c?.contact.valid;
    const shapingAllowed = ctx.phase === 'studio' || (ctx.phase === 'tutorial' && ctx.expectedGesture === 'shape');
    const deforming = usable && shapingAllowed && this.current === 'shape' && this.contactValid;

    let speed = 0;
    for (const h of [l, r]) {
      if (h?.velocityValid) speed = Math.max(speed, Math.hypot(h.velocityPalmPerS.x, h.velocityPalmPerS.y));
    }

    return {
      gesture: this.current,
      sourceFrameId: frame.frameId,
      capturedAtMs: t,
      holdMs: t - this.currentSinceMs,
      inputUsable: usable,
      deforming,
      motionStrength: 0,
      targetRadiusWorld: deforming ? c!.targetRadiusWorld : null,
      centerOffsetPalm: c?.centerOffsetPalm ?? null,
      speedPalmPerS: speed,
      contact: c?.contact ?? NO_CONTACT,
      cursorPx: null,
      nearMiss: null,
    };
  }
}
