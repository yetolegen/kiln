import type { EngineSnapshot, Hint } from '../types';
import { TUTORIAL_STEPS } from './tutorial';

const CONDITIONS = new Set<Hint['id']>([
  'noHands', 'oneHand', 'trackingUncertain', 'collapse', 'tear', 'wobble', 'tooThin',
  'overhang', 'thinFloor', 'overStretch', 'tooFlat',
]);

/** Scope technique coaching to the visible lesson. Physical damage/tracking warnings remain visible. */
export class LessonHints {
  private context = '';
  private boundaryMs = -Infinity;
  private rewrittenSource: Hint | null = null;
  private rewrittenHint: Hint | null = null;
  changed = false;
  update(snapshot: EngineSnapshot, step: number | null, hint: Hint | null): Hint | null {
    const context = snapshot.phase === 'tutorial' ? `${snapshot.stats?.sessionId}:${step}` : snapshot.phase;
    this.changed = context !== this.context;
    if (this.changed) {
      this.context = context; this.boundaryMs = snapshot.input?.tMs ?? -Infinity;
      this.rewrittenSource = this.rewrittenHint = null;
    }
    if (snapshot.phase !== 'tutorial' || step === null || !hint) return hint;
    if (CONDITIONS.has(hint.id)) return hint;
    if (!snapshot.input || snapshot.input.tMs <= this.boundaryMs) return null;
    const expected = TUTORIAL_STEPS[step].gesture;
    const miss = snapshot.gesture?.nearMiss;
    if (miss?.reason === hint.id) {
      if (miss.intended !== expected) return null;
      if (hint.id !== 'notMoving') return hint;
      if (hint !== this.rewrittenSource) {
        this.rewrittenSource = hint;
        this.rewrittenHint = { ...hint, params: { ...hint.params, instruction: TUTORIAL_STEPS[step].text } };
      }
      return this.rewrittenHint;
    }
    // Unscoped technique events may be retained by the core after a step change.
    // The lesson card supplies current-step instructions until a matching near-miss arrives.
    return null;
  }
}
