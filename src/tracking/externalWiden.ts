import { CONFIG } from '../config';
import type { FrameInput, HandFeatures, ProjectionParams, Vec2 } from '../types';
import { pxToWorld } from './coordinates';

/**
 * The pinch point (between thumb and index tips): the clay widens there, not at the palm centre, which on a
 * real hand sits about a palm above it (so palm-based contact could never grip the upper wall).
 */
export function gripPoint(h: HandFeatures, projection: ProjectionParams): Vec2 {
  if (h.landmarksPx.length !== 21) return h.palmWorld;
  const a = h.landmarksPx[4], b = h.landmarksPx[8];
  return pxToWorld({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, projection);
}

interface Grip {
  left: number; right: number; y: number; travel: number; since: number; last: number; epoch: number; projection: number;
  ids: string; blocked: boolean; tooFast: boolean; progress: number;
}

/** A deliberate two-sided grip keeps widening distinct from withdrawing open palms. */
export class ExternalWiden {
  private grip: Grip | null = null;
  reset(): void { this.grip = null; }
  update(frame: FrameInput, projection: ProjectionParams, eligible: boolean) {
    const l = frame.screenLeft, r = frame.screenRight, t = frame.tMs;
    // losing tracking ends the grip; a brief pose glitch with both hands still seen (one loose-pinch frame,
    // a contact flicker) only pauses it for LIFT_GRACE_MS, like the lift: nothing accumulates meanwhile
    if (!l || !r || frame.status !== 'ready') { this.reset(); return null; }
    let e = this.grip;
    if (!eligible || !l.velocityValid || !r.velocityValid) {
      if (!e || e.epoch !== frame.epoch || t - e.last > CONFIG.LIFT_GRACE_MS) { this.reset(); return null; }
      // progress 0 while paused: a real release (opening the fingers) must read as released at once
      return { progress: 0, push: 0, tooFast: e.tooFast };
    }
    const left = -l.palmWorld.x, right = r.palmWorld.x, y = (gripPoint(l, projection).y + gripPoint(r, projection).y) / 2;
    const ids = `${l.trackId}:${r.trackId}`, palm = (l.referencePalmSizePx + r.referencePalmSizePx) / (2 * projection.pixelsPerWorldUnit);
    const deadband = Math.max(.012, palm * .035);
    if (!e || e.ids !== ids || e.epoch !== frame.epoch || e.projection !== projection.revision || t <= e.last ||
        t - e.last > Math.max(CONFIG.MAX_INPUT_AGE_MS, CONFIG.LIFT_GRACE_MS)) {
      e = this.grip = { left, right, y, travel: 0, since: t, last: t, epoch: frame.epoch, projection: projection.revision, ids, blocked: false, tooFast: false, progress: 0 };
    }
    // The height anchor follows slow drift (still hands wander, a spread arcs); only a deliberate vertical
    // move outrunning it blocks. A fixed anchor silently ended long strokes after ~0.2 palm of drift.
    const follow = palm * .25 * (t - e.last) / 1000;
    e.y += Math.max(-follow, Math.min(follow, y - e.y));
    e.last = t;
    const speed = Math.max(Math.hypot(l.velocityPalmPerS.x, l.velocityPalmPerS.y), Math.hypot(r.velocityPalmPerS.x, r.velocityPalmPerS.y));
    const vertical = Math.abs(y - e.y) > Math.max(.10, palm * .2);
    if (!e.blocked && e.progress < 1) {
      // Before arming, any motion (arriving pinched, repositioning) only restarts the still hold.
      // It used to block the grip for good, silently, until the pinches were opened.
      if (Math.max(Math.abs(left - e.left), Math.abs(right - e.right)) > deadband || speed > .35 || vertical) {
        e.left = left; e.right = right; e.y = y; e.since = t;
      }
      e.progress = Math.min(1, (t - e.since) / 500);
      return { progress: e.progress, push: 0, tooFast: false };
    }
    // Armed: too fast or a vertical move ends this stroke. The too-fast hint stays until the pinches open,
    // because opening them is what it asks for.
    if (speed > 1.2) e.tooFast = true;
    if (e.tooFast || vertical) e.blocked = true;
    if (e.blocked) { e.progress = 0; return { progress: 0, push: 0, tooFast: e.tooFast }; }
    // Both hands must spread. A one-sided withdrawal, jitter or returning to the same width adds nothing.
    const travel = Math.min(left - e.left, right - e.right);
    const push = travel > e.travel + (e.travel === 0 ? deadband : 0) ? travel - e.travel : 0;
    if (push > 0) e.travel = travel;
    return { progress: 1, push, tooFast: false, y: e.y };
  }
}
