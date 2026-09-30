import { CONFIG } from '../config';
import type { DwellTarget, EngineSnapshot, Vec2 } from '../types';

export type DwellRegion = Pick<DwellTarget, 'id' | 'x' | 'y' | 'width' | 'height'>;

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

  reset(): void {
    this.activeId = null; this.progress = 0; this.elapsed = 0;
    this.frameId = -1; this.capturedAt = 0; this.fired = false;
    this.cursorPx = null; this.pointerKey = '';
  }

  update(snapshot: EngineSnapshot, nowMs: number, targets: readonly DwellRegion[], screenRevision = 0): string | null {
    const input = snapshot.input, gesture = snapshot.gesture;
    if (snapshot.phase !== this.phase || input?.epoch !== this.epoch || screenRevision !== this.screenRevision) {
      this.reset(); this.phase = snapshot.phase;
      this.epoch = input?.epoch ?? -1; this.screenRevision = screenRevision;
    }
    if (!input || !['ready', 'oneHand'].includes(input.status) ||
        nowMs - input.tMs > CONFIG.MAX_INPUT_AGE_MS || nowMs < input.tMs || ['loading', 'permission', 'calibrate', 'firing'].includes(snapshot.phase)) {
      this.reset(); return null;
    }
    const hit = (p: Vec2) => targets.find((rect) => p.x >= rect.x && p.x <= rect.x + rect.width && p.y >= rect.y && p.y <= rect.y + rect.height);
    // UI hit-testing uses current tracked palm centres, never the retained hand drawing.
    const hands = [input.screenLeft, input.screenRight];
    const previous = hands.find((h) => h && `palm:${h.trackId}` === this.pointerKey && hit(h.palmPx));
    const palm = previous ?? hands.find((h) => h && hit(h.palmPx));
    const fingertip = gesture?.gesture === 'point' && gesture.sourceFrameId === input.frameId ? gesture.cursorPx : null;
    const cursor = palm?.palmPx ?? fingertip;
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
    if (dt <= 0 || dt > CONFIG.MAX_INPUT_AGE_MS) { this.elapsed = 0; this.progress = 0; return null; }
    this.elapsed += dt;
    this.progress = Math.min(1, this.elapsed / CONFIG.DWELL_MS);
    if (this.progress < 1 || this.fired) return null;
    this.fired = true;
    return target.id;
  }
}
