// One hint at a time (PLAN §8). Priority: invalid input → collapse → tear → wobble → tooThin/overhang
// → near-miss → coaching. A live hint stays while its cause is active and disappears when it clears;
// one-shot hints (recovered) live HINT_TTL_MS. Cooldown only limits repeated SPEECH, never hides a hint.
// The same Hint OBJECT is returned until something changes, and a new object carries speak=true only
// when it should be spoken, so consumers speak on (hint !== lastHint && hint.speak).
import { CONFIG } from '../config';
import type { ClayEvent, ClayState, GestureState, Hint } from '../types';

// ordering only, not tunables
const PRIORITY: Partial<Record<Hint['id'], number>> = {
  noHands: 100, oneHand: 100, trackingUncertain: 100,
  collapse: 90,
  overStretch: 85, thinFloor: 85, tooFlat: 85, // stop NOW or it becomes permanent
  tear: 80,
  wobble: 70,
  tooThin: 60, overhang: 60,
  liftTooFast: 55, spreadTooFast: 55, noSupport: 55,
  pinchLoose: 50, handsTooLow: 50, handsUneven: 50, handsNotOpposite: 50,
  notHorizontal: 50, thumbNotOnTop: 50, noIndentation: 50, pinchFirst: 50, rimPlacement: 50,
  handsTooFar: 45,
  atLimit: 42,
  targetMismatch: 40,
  holdStill: 35, notMoving: 35, // progress guidance: anything wrong outranks it
  recovered: 30,
};
const SEVERITY: Partial<Record<Hint['id'], Hint['severity']>> = {
  collapse: 'error', tear: 'error',
  wobble: 'warn', tooThin: 'warn', overhang: 'warn', noHands: 'warn', oneHand: 'warn', trackingUncertain: 'warn',
  liftTooFast: 'warn', spreadTooFast: 'warn',
  overStretch: 'error', thinFloor: 'error', tooFlat: 'error',
};

type Candidate = Omit<Hint, 'expiresAtMs' | 'speak'>;
const keyOf = (h: Candidate) => `${h.id}|${h.episodeId ?? ''}|${h.handTrackId ?? ''}`;

export interface HintInput {
  tMs: number;
  events: readonly ClayEvent[];
  active: readonly ClayEvent[];
  gesture: GestureState | null;
  clay: ClayState;
}

export class HintManager {
  private current: Hint | null = null;
  private oneShot: Hint | null = null;
  private oneShotShown = false;
  private lastSpokenMs = new Map<Hint['id'], number>();

  reset(): void {
    this.current = null;
    this.oneShot = null;
    this.lastSpokenMs.clear();
  }

  update(i: HintInput): Hint | null {
    const t = i.tMs;
    if (i.events.some((e) => e.type === 'collapse' && e.phase === 'end')) {
      this.oneShot = this.issue({ id: 'recovered', params: {}, severity: 'info', priority: PRIORITY.recovered! }, t);
      this.oneShotShown = false;
    }
    if (this.oneShot && t > this.oneShot.expiresAtMs) this.oneShot = null;

    const live: Candidate[] = i.active.map((e) => fromEvent(e));
    const nm = i.gesture?.nearMiss;
    if (nm && nm.reason !== 'handsTooFar') { // handsTooFar comes through its coaching episode
      live.push({
        id: nm.reason, params: nm.params, severity: SEVERITY[nm.reason] ?? 'info', priority: PRIORITY[nm.reason] ?? 50,
        handTrackId: nm.handTrackId,
      });
    }
    const g = i.gesture;
    if (g?.gesture === 'pullUp' && g.inputUsable && i.clay.height >= CONFIG.MAX_HEIGHT - 1e-6) {
      live.push({ id: 'atLimit', params: { limit: 'maxHeight' }, severity: 'info', priority: PRIORITY.atLimit! });
    }

    const best = live.reduce<Candidate | null>((a, b) => (!a || b.priority > a.priority ? b : a), null);
    if (!best || (this.oneShot && this.oneShot.priority > best.priority)) {
      // a one-shot that comes back after being covered is shown again, but never spoken twice
      if (this.oneShotShown && this.current !== this.oneShot && this.oneShot?.speak) {
        this.oneShot = { ...this.oneShot, speak: false };
      }
      this.oneShotShown ||= this.oneShot !== null;
      this.current = this.oneShot;
      return this.current;
    }
    // same cause as shown now → refresh its data, don't speak again
    if (this.current && keyOf(this.current) === keyOf(best)) {
      this.current = { ...this.current, ...best, expiresAtMs: t + CONFIG.HINT_TTL_MS, speak: false };
    } else {
      this.current = this.issue(best, t);
    }
    return this.current;
  }

  /** Called from tick(): drop a hint whose TTL ran out (e.g. tracker stalled, no more updates). */
  expire(nowMs: number): Hint | null {
    if (this.current && nowMs > this.current.expiresAtMs) this.current = null;
    return this.current;
  }

  private issue(c: Candidate, t: number): Hint {
    const last = this.lastSpokenMs.get(c.id);
    const speak = c.id !== 'atLimit' && (last === undefined || t - last >= CONFIG.HINT_COOLDOWN_MS);
    if (speak) this.lastSpokenMs.set(c.id, t);
    return { ...c, expiresAtMs: t + CONFIG.HINT_TTL_MS, speak };
  }
}

function fromEvent(e: ClayEvent): Candidate {
  const params: Record<string, number | string> = { ...e.data };
  if (e.cause) params.cause = e.cause;
  return {
    id: e.type,
    episodeId: e.episodeId,
    params,
    severity: SEVERITY[e.type] ?? 'info',
    priority: PRIORITY[e.type] ?? 10,
    band: e.band,
  };
}
