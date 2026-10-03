import { CONFIG } from '../config';
import type { FrameInput, Vec2 } from '../types';
import type { DwellRegion } from './dwell';

/** Viewer-only pinch drag. Never feeds the pottery recognizer or applies clay deltas. */
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
  get activeTrackId() { return this.track; }
  canGrab(trackId: number) { return this.released.has(trackId); }
  get diagnostic() { return { released: [...this.released], frame: this.frame, time: this.time, reason: this.reason }; }
  reset(): void { this.state = 'idle'; this.track = null; this.released.clear(); this.last = null; this.time = -Infinity; }
  update(input: FrameInput | null, nowMs: number, targets: readonly DwellRegion[], width: number, height: number): Vec2 | null {
    if (!input || !['ready', 'oneHand'].includes(input.status) || nowMs < input.tMs || nowMs - input.tMs > CONFIG.MAX_INPUT_AGE_MS ||
        input.receivedAtMs - input.tMs > CONFIG.MAX_INPUT_AGE_MS) { this.reset(); return null; }
    if (input.epoch !== this.epoch) { this.reset(); this.epoch = input.epoch; this.frame = -1; }
    if (input.frameId <= this.frame) return null;
    this.frame = input.frameId;
    const gap = input.tMs - this.time; this.time = input.tMs;
    if (gap <= 0 || (Number.isFinite(gap) && gap > CONFIG.MAX_INPUT_AGE_MS)) { this.reset(); this.reason = `gap ${gap}`; return null; }
    const hands = [input.screenLeft, input.screenRight].filter(h => h !== null);
    const overUI = (p: Vec2) => targets.some(r => p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height);
    for (const h of hands) if (h.pinchRatio >= .5) this.released.add(h.trackId);
    const active = hands.find(h => h.trackId === this.track);
    if (this.track !== null && (!active || overUI(active.indexTipPx) || overUI(active.palmPx) || active.pinchRatio >= .48)) { this.reset(); this.reason = `release ${active?.pinchRatio} ui ${active && overUI(active.palmPx)}`; return null; }
    if (!active) {
      const hand = hands.find(h => this.released.has(h.trackId) && h.pinchRatio <= .28 && !overUI(h.indexTipPx) && !overUI(h.palmPx));
      if (hand) { this.track = hand.trackId; this.state = 'armed'; this.armedAt = input.tMs; this.last = { ...hand.indexTipPx }; }
      return null;
    }
    const p = active.indexTipPx;
    if (!this.last || width <= 0 || height <= 0) { this.reset(); return null; }
    const delta = { x: (p.x - this.last.x) / width, y: (p.y - this.last.y) / height };
    this.last = { ...p };
    if (Math.hypot(delta.x, delta.y) > .12) { this.reset(); this.reason = `jump ${delta.x} ${delta.y}`; return null; }
    if (this.state === 'armed') { if (input.tMs - this.armedAt >= 120) this.state = 'dragging'; return null; }
    return delta;
  }
}
