import type { EngineSnapshot } from '../types';

/** Presentation of actual damage, never a new physics/failure condition. */
export function clayDamageReason(snapshot: EngineSnapshot): 'bottomHole' | 'wallTorn' | 'pancake' | 'collapse' | 'surface' | null {
  const clay = snapshot.clay;
  if (!clay || !['studio', 'tutorial'].includes(snapshot.phase)) return null;
  if (clay.bottomHole) return 'bottomHole';
  if (clay.collapseCause === 'wallTorn') return 'wallTorn';
  if (clay.collapseCause === 'pancake') return 'pancake';
  if (clay.collapsed) return 'collapse';
  return clay.damage.some((amount) => amount > 0) ? 'surface' : null;
}
