// Session stats and finalization (PLAN §9). Counts episode BEGINS only; tracking issues are kept
// apart from the user's own mistakes; coaching isn't counted as a mistake at all.
import type {
  ClayEvent, ClayEventType, ClayState, GestureState, SessionMode, SessionResult, SessionStats, SimilarityResult,
} from '../types';

export class SessionTracker {
  private readonly execution: Partial<Record<ClayEventType, number>> = {};
  private readonly tracking: Partial<Record<ClayEventType, number>> = {};
  private readonly gestureMs: SessionStats['gestureMs'] = {};
  private activeMs = 0;
  private frozenAtMs: number | null = null;
  private similarityResult: SimilarityResult | undefined;
  private result: SessionResult | null = null;

  constructor(
    readonly sessionId: string,
    readonly mode: SessionMode,
    private readonly startedAtMs: number,
    readonly targetId?: string,
  ) {}

  get frozen(): boolean {
    return this.frozenAtMs !== null;
  }

  /** dtS = time this observation stands for (already capped by the caller). */
  record(events: readonly ClayEvent[], gesture: GestureState | null, dtS: number): void {
    if (this.frozen) return;
    for (const e of events) {
      if (e.phase !== 'begin') continue;
      const bucket = e.category === 'execution' ? this.execution : e.category === 'tracking' ? this.tracking : null;
      if (bucket) bucket[e.type] = (bucket[e.type] ?? 0) + 1;
    }
    if (gesture) {
      this.gestureMs[gesture.gesture] = (this.gestureMs[gesture.gesture] ?? 0) + dtS * 1000;
      if (gesture.deforming) this.activeMs += dtS * 1000;
    }
  }

  /** finishShaping: nothing after this changes the stats. */
  freeze(tMs: number, similarity?: SimilarityResult): void {
    if (this.frozen) return;
    this.frozenAtMs = tMs;
    this.similarityResult = similarity;
  }

  stats(nowMs: number): SessionStats {
    return {
      sessionId: this.sessionId,
      mode: this.mode,
      durationMs: (this.frozenAtMs ?? nowMs) - this.startedAtMs,
      activeMs: this.activeMs,
      executionEpisodes: { ...this.execution },
      trackingEpisodes: { ...this.tracking },
      gestureMs: { ...this.gestureMs },
      targetId: this.targetId,
      similarity: this.similarityResult,
    };
  }

  /** Exactly one result per session; later calls return the same object. Arrays are copies. */
  finalize(clay: ClayState, glazeId: string, completedAtIso: string, nowMs: number): SessionResult {
    this.freeze(nowMs);
    this.result ??= {
      schemaVersion: 2,
      id: this.sessionId,
      completedAtIso,
      stats: this.stats(nowMs),
      finalProfile: Array.from(clay.radii),
      height: clay.height,
      thickness: clay.thickness,
      cavityRadiusWorld: clay.cavityRadiusWorld,
      cavityDepthWorld: clay.cavityDepthWorld,
      damage: Array.from(clay.damage),
      collapsed: clay.collapsed,
      glazeId,
    };
    return this.result;
  }
}
