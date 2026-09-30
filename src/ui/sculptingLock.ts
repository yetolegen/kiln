import { CONFIG } from '../config';
import type { EngineSnapshot } from '../types';

/** Keep confirmation actions unavailable through arming, contact and brief tracking gaps. */
export class SculptingLock {
  locked = false;
  private context = '';
  private epoch = -1;
  private frame = -1;
  private releasedAt: number | null = null;
  update(snapshot: EngineSnapshot, nowMs: number): boolean {
    const context = `${snapshot.phase}:${snapshot.stats?.sessionId}`;
    if (context !== this.context) {
      this.context = context; this.locked = false; this.releasedAt = null; this.frame = -1;
    }
    if (snapshot.phase !== 'studio') return this.locked = false;
    if (isDestroyed(snapshot)) { this.releasedAt = null; return this.locked = false; }
    const input = snapshot.input, g = snapshot.gesture;
    if (!input || !g || !['ready', 'oneHand', 'noHands'].includes(input.status) ||
        nowMs < input.tMs || nowMs - input.tMs > CONFIG.MAX_INPUT_AGE_MS || g.sourceFrameId !== input.frameId) {
      this.releasedAt = null; return this.locked;
    }
    if (input.epoch !== this.epoch) { this.epoch = input.epoch; this.frame = -1; this.releasedAt = null; }
    if (input.frameId === this.frame) return this.locked;
    this.frame = input.frameId;
    const active = g.inputUsable && (g.deforming || g.contact.valid || g.activeTrackId !== null || g.activationProgress > 0);
    if (active) { this.locked = true; this.releasedAt = null; }
    else if (this.locked) {
      // Fresh absence or hands away is a release; a stale/ambiguous frame is not.
      this.releasedAt ??= input.tMs;
      if (input.tMs - this.releasedAt >= 400) { this.locked = false; this.releasedAt = null; }
    }
    return this.locked;
  }
}

export function isDestroyed(snapshot: EngineSnapshot): boolean {
  return !!snapshot.clay?.collapsed && ['pancake', 'wallTorn', 'bottomHole'].includes(snapshot.clay.collapseCause ?? '');
}
