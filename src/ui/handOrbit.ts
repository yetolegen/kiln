import { CONFIG } from '../config';
import type { FrameInput, Vec2 } from '../types';
import type { DwellRegion } from './dwell';
import { isFistGrip, isOpenForGrip } from '../tracking/features';

/**
 * Viewer-only fist drag: open the hand, close it into a fist away from the buttons, move to rotate, open to let go.
 * Follows the palm centre (a fist has no fingertip to track). Never feeds the pottery recognizer or clay deltas.
 */
export class HandOrbit {
  state: 'idle' | 'armed' | 'dragging' = 'idle';
  private track: number | null = null;
  private released = new Set<number>();
  private epoch = -1;
  private frame = -1;
  private time = -Infinity;
  private armedAt = 0;
  private last: Vec2 | null = null;
  private reason = '';
  private lostGrip = 0; // fresh frames in a row without a fist while holding
  get activeTrackId() { return this.track; }
  canGrab(trackId: number) { return this.released.has(trackId); }
  get diagnostic() { return { released: [...this.released], frame: this.frame, time: this.time, reason: this.reason }; }
  reset(): void { this.state = 'idle'; this.track = null; this.released.clear(); this.last = null; this.time = -Infinity; this.lostGrip = 0; }
  update(input: FrameInput | null, nowMs: number, targets: readonly DwellRegion[], width: number, height: number): Vec2 | null {
    if (!input || !['ready', 'oneHand'].includes(input.status) || nowMs < input.tMs || nowMs - input.tMs > CONFIG.MAX_INPUT_AGE_MS ||
        input.receivedAtMs - input.tMs > CONFIG.MAX_INPUT_AGE_MS) { this.reset(); return null; }
    if (input.epoch !== this.epoch) { this.reset(); this.epoch = input.epoch; this.frame = -1; }
    if (input.frameId <= this.frame) return null;
    this.frame = input.frameId;
    const gap = input.tMs - this.time; this.time = input.tMs;
    if (gap <= 0) { this.reset(); this.reason = `gap ${gap}`; return null; }
    // a long gap between fresh frames is a render hitch (stale input and loss reset above): end any grab so it can't
    // jump, but keep which tracked hands were seen open, or a slow device can never start a grip
    if (Number.isFinite(gap) && gap > CONFIG.MAX_INPUT_AGE_MS) {
      const released = new Set(this.released); // copy: reset() clears the set in place
      this.reset(); this.released = released; this.time = input.tMs; this.reason = `gap ${gap}`; return null;
    }
    const hands = [input.screenLeft, input.screenRight].filter(h => h !== null);
    const overUI = (p: Vec2) => targets.some(r => p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height);
    for (const h of hands) if (isOpenForGrip(h)) this.released.add(h.trackId);
    const active = hands.find(h => h.trackId === this.track);
    // One misread frame must not drop the vessel: let go only after the fist is gone for several fresh frames.
    if (this.track !== null && active && !overUI(active.palmPx)) this.lostGrip = isFistGrip(active, true) ? 0 : this.lostGrip + 1;
    if (this.track !== null && (!active || overUI(active.palmPx) || this.lostGrip >= CONFIG.FIST_RELEASE_FRAMES)) { this.reset(); this.reason = `release ui ${active && overUI(active.palmPx)}`; return null; }
    if (this.lostGrip > 0) { this.last = active ? { ...active.palmPx } : this.last; return null; } // hold still while unsure
    if (!active) {
      const hand = hands.find(h => this.released.has(h.trackId) && isFistGrip(h, false) && !overUI(h.palmPx));
      if (hand) { this.track = hand.trackId; this.state = 'armed'; this.armedAt = input.tMs; this.last = { ...hand.palmPx }; }
      return null;
    }
    const p = active.palmPx;
    if (!this.last || width <= 0 || height <= 0) { this.reset(); return null; }
    const delta = { x: (p.x - this.last.x) / width, y: (p.y - this.last.y) / height };
    this.last = { ...p };
    if (Math.hypot(delta.x, delta.y) > .12) { this.reset(); this.reason = `jump ${delta.x} ${delta.y}`; return null; }
    if (this.state === 'armed') { if (input.tMs - this.armedAt >= 120) this.state = 'dragging'; return null; }
    return delta;
  }
}
