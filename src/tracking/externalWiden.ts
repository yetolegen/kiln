import { CONFIG } from '../config';
import type { FrameInput, ProjectionParams } from '../types';

/** A deliberate two-sided grip keeps widening distinct from withdrawing open palms. */
export class ExternalWiden {
  private grip: { left: number; right: number; y: number; travel: number; since: number; last: number; epoch: number; projection: number; ids: string; blocked: boolean } | null = null;
  reset(): void { this.grip = null; }
  update(frame: FrameInput, projection: ProjectionParams, eligible: boolean) {
    const l = frame.screenLeft, r = frame.screenRight;
    if (!eligible || !l || !r || frame.status !== 'ready' || !l.velocityValid || !r.velocityValid) { this.reset(); return null; }
    const t = frame.tMs, left = -l.palmWorld.x, right = r.palmWorld.x, y = (l.palmWorld.y + r.palmWorld.y) / 2;
    const ids = `${l.trackId}:${r.trackId}`, palm = (l.referencePalmSizePx + r.referencePalmSizePx) / (2 * projection.pixelsPerWorldUnit);
    const deadband = Math.max(.012, palm * .035);
    let e = this.grip;
    if (!e || e.ids !== ids || e.epoch !== frame.epoch || e.projection !== projection.revision || t <= e.last || t - e.last > CONFIG.MAX_INPUT_AGE_MS) {
      e = this.grip = { left, right, y, travel: 0, since: t, last: t, epoch: frame.epoch, projection: projection.revision, ids, blocked: false };
    }
    // The height anchor follows slow drift (still hands wander, a spread arcs); only a deliberate vertical
    // move outrunning it blocks. A fixed anchor silently ended long strokes after ~0.2 palm of drift.
    const follow = palm * .25 * (t - e.last) / 1000;
    e.y += Math.max(-follow, Math.min(follow, y - e.y));
    e.last = t;
    const speed = Math.max(Math.hypot(l.velocityPalmPerS.x, l.velocityPalmPerS.y), Math.hypot(r.velocityPalmPerS.x, r.velocityPalmPerS.y));
    if (speed > 1.2 || Math.abs(y - e.y) > Math.max(.10, palm * .2)) e.blocked = true;
    if (e.blocked) return { progress: 0, push: 0, tooFast: speed > 1.2 };
    const progress = Math.min(1, (t - e.since) / 500);
    if (progress < 1) {
      if (Math.max(Math.abs(left - e.left), Math.abs(right - e.right)) > deadband || speed > .35) {
        e.left = left; e.right = right; e.since = t;
        return { progress: 0, push: 0, tooFast: false };
      }
      return { progress, push: 0, tooFast: false };
    }
    // Both hands must spread. A one-sided withdrawal, jitter or returning to the same width adds nothing.
    const travel = Math.min(left - e.left, right - e.right);
    const push = travel > e.travel + (e.travel === 0 ? deadband : 0) ? travel - e.travel : 0;
    if (push > 0) e.travel = travel;
    return { progress, push, tooFast: false };
  }
}
