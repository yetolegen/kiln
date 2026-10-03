import { CONFIG } from '../config';
import type { DwellTarget, EngineSnapshot, Vec2 } from '../types';

export type DwellRegion = Pick<DwellTarget, 'id' | 'x' | 'y' | 'width' | 'height'> & { dwellMs?: number };

export class DwellController {
  activeId: string | null = null;
  progress = 0;
  cursorPx: Vec2 | null = null;
  private pointerKey = '';
  private elapsed = 0;
  private frameId = -1;
  private capturedAt = 0;
  private fired = false;
  private phase: EngineSnapshot['phase'] | null = null;
  private epoch = -1;
  private screenRevision = -1;
  private releaseRequired = false;
  private blockedPointers = new Set<string>();
  private blockedPinches = new Set<number>();

  requireRelease(): void { this.reset(); this.blockedPointers.clear(); this.releaseRequired = true; }

  reset(): void {
    this.activeId = null; this.progress = 0; this.elapsed = 0;
    this.frameId = -1; this.capturedAt = 0; this.fired = false;
    this.cursorPx = null; this.pointerKey = '';
  }

  update(snapshot: EngineSnapshot, nowMs: number, targets: readonly DwellRegion[], screenRevision = 0): string | null {
    const input = snapshot.input, gesture = snapshot.gesture;
    if (snapshot.phase !== this.phase || input?.epoch !== this.epoch || screenRevision !== this.screenRevision) {
      if (this.fired) this.requireRelease();
      this.reset(); this.phase = snapshot.phase;
      this.epoch = input?.epoch ?? -1; this.screenRevision = screenRevision;
    }
    if (input?.status === 'noHands' && nowMs >= input.tMs && nowMs - input.tMs <= CONFIG.MAX_INPUT_AGE_MS) {
      this.blockedPointers.clear(); this.blockedPinches.clear(); this.releaseRequired = false; this.reset(); return null;
    }
    if (!input || !['ready', 'oneHand'].includes(input.status) ||
        nowMs - input.tMs > CONFIG.MAX_INPUT_AGE_MS || nowMs < input.tMs || ['loading', 'permission', 'calibrate', 'firing'].includes(snapshot.phase)) {
      this.reset(); return null;
    }
    const hit = (p: Vec2) => targets.find((rect) => p.x >= rect.x && p.x <= rect.x + rect.width && p.y >= rect.y && p.y <= rect.y + rect.height);
    // UI hit-testing uses current tracked palm centres, never the retained hand drawing.
    const allHands = [input.screenLeft, input.screenRight];
    for (const id of this.blockedPinches) if (!allHands.some(h => h?.trackId === id)) this.blockedPinches.delete(id);
    const fingertip = gesture?.gesture === 'point' && gesture.sourceFrameId === input.frameId ? gesture.cursorPx : null;
    if (this.releaseRequired) {
      for (const h of allHands) if (h) {
        if (hit(h.palmPx)) this.blockedPointers.add(`palm:${h.trackId}`);
        if (h.pinchRatio < .5) this.blockedPinches.add(h.trackId);
      }
      if (fingertip && hit(fingertip)) this.blockedPointers.add('index');
      this.releaseRequired = false; return null;
    }
    for (const h of allHands) if (h && this.blockedPinches.has(h.trackId) && h.pinchRatio >= .5) {
      this.blockedPinches.delete(h.trackId);
      if (hit(h.palmPx)) this.blockedPointers.add(`palm:${h.trackId}`);
    }
    for (const h of allHands) if (h && !hit(h.palmPx)) this.blockedPointers.delete(`palm:${h.trackId}`);
    if (fingertip && !hit(fingertip)) this.blockedPointers.delete('index');
    const hands = allHands.filter(h => h && !this.blockedPinches.has(h.trackId) && !this.blockedPointers.has(`palm:${h.trackId}`));
    const previous = hands.find((h) => h && `palm:${h.trackId}` === this.pointerKey && hit(h.palmPx));
    const palm = previous ?? hands.find((h) => h && hit(h.palmPx));
    const cursor = palm?.palmPx ?? (this.blockedPointers.has('index') || this.blockedPinches.size ? null : fingertip);
    const pointerKey = palm ? `palm:${palm.trackId}` : 'index';
    const target = cursor ? hit(cursor) : null;
    if (!target || !cursor) { this.reset(); this.cursorPx = fingertip; return null; }
    if (target.id !== this.activeId || pointerKey !== this.pointerKey) {
      this.reset(); this.activeId = target.id; this.frameId = input.frameId; this.capturedAt = input.tMs;
      this.cursorPx = cursor; this.pointerKey = pointerKey;
      return null;
    }
    this.cursorPx = cursor;
    if (input.frameId === this.frameId) return null;
    const dt = input.tMs - this.capturedAt;
    this.frameId = input.frameId; this.capturedAt = input.tMs;
    if (dt <= 0) return null;
    // a long gap between two fresh frames on the same target is a render hitch, not a lost palm (stale input and loss
    // reset above): credit at most one freshness window, so slow devices still finish a dwell but a gap can't skip it
    this.elapsed += Math.min(dt, CONFIG.MAX_INPUT_AGE_MS);
    this.progress = Math.min(1, this.elapsed / (target.dwellMs ?? CONFIG.DWELL_MS));
    if (this.progress < 1 || this.fired) return null;
    this.fired = true;
    return target.id;
  }
}
