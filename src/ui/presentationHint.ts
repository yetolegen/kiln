import { CONFIG } from '../config';
import type { EngineSnapshot, Hint } from '../types';

// Browser presentation only: never alters the core or reuses cached visual hands as input.
export class PresentationHint {
  private status = '';
  private hint: Hint | null = null;
  private lastSpokenMs = -Infinity;
  update(snapshot: EngineSnapshot, nowMs: number): Hint | null {
    if (!['tutorial', 'studio', 'menu', 'glaze', 'result', 'gallery'].includes(snapshot.phase)) { this.status = ''; this.hint = null; return snapshot.hint; }
    const input = snapshot.input;
    const status = !input || nowMs - input.tMs > CONFIG.MAX_INPUT_AGE_MS ? 'stale' : input.status;
    const pointing = snapshot.gesture?.gesture === 'point' && !!snapshot.gesture.cursorPx && ['ready', 'oneHand'].includes(status);
    const needsBoth = snapshot.phase === 'tutorial' || snapshot.phase === 'studio';
    const interrupted = status !== 'ready' && !(status === 'oneHand' && (!needsBoth || pointing));
    if (!interrupted) { this.status = ''; this.hint = null; return snapshot.hint; }
    if (status !== this.status) {
      this.status = status;
      const speak = nowMs - this.lastSpokenMs >= CONFIG.HINT_COOLDOWN_MS;
      if (speak) this.lastSpokenMs = nowMs;
      this.hint = { id: 'trackingUncertain', params: { status, interrupted: 'true' }, severity: 'warn', priority: 100, expiresAtMs: nowMs + CONFIG.HINT_TTL_MS, speak };
    }
    return this.hint;
  }
}
