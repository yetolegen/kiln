import { CONFIG } from '../config';
import type { DwellTarget, EngineSnapshot } from '../types';

export type DwellRegion = Pick<DwellTarget, 'id' | 'x' | 'y' | 'width' | 'height'>;

export class DwellController {
  activeId: string | null = null;
  progress = 0;
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
  }

  update(snapshot: EngineSnapshot, nowMs: number, targets: readonly DwellRegion[], screenRevision = 0): string | null {
    const input = snapshot.input, gesture = snapshot.gesture;
    if (snapshot.phase !== this.phase || input?.epoch !== this.epoch || screenRevision !== this.screenRevision) {
      this.reset(); this.phase = snapshot.phase;
      this.epoch = input?.epoch ?? -1; this.screenRevision = screenRevision;
    }
    if (!input || !gesture?.inputUsable || gesture.gesture !== 'point' || !gesture.cursorPx ||
        nowMs - input.tMs > CONFIG.MAX_INPUT_AGE_MS || nowMs < input.tMs || gesture.sourceFrameId !== input.frameId) {
      this.reset(); return null;
    }
    const { x, y } = gesture.cursorPx;
    const target = targets.find((rect) => x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height);
    if (!target) { this.reset(); return null; }
    if (target.id !== this.activeId) {
      this.reset(); this.activeId = target.id; this.frameId = input.frameId; this.capturedAt = input.tMs;
      return null;
    }
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
