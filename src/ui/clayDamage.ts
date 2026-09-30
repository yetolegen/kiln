import type { EngineSnapshot } from '../types';

const SPOILED_DAMAGE = .35;

/** Presentation of actual damage, never a new physics/failure condition. */
export function clayDamageReason(snapshot: EngineSnapshot): 'bottomHole' | 'wallTorn' | 'pancake' | 'collapse' | 'surface' | null {
  const clay = snapshot.clay;
  if (!clay || !['studio', 'tutorial'].includes(snapshot.phase)) return null;
  if (clay.bottomHole) return 'bottomHole';
  if (clay.collapseCause === 'wallTorn') return 'wallTorn';
  if (clay.collapseCause === 'pancake') return 'pancake';
  if (clay.collapsed) return 'collapse';
  // light damage heals under rim compression and keeps its own «slow down» hint; spoiled = past the lesson's .35 limit
  return clay.damage.some((amount) => amount > SPOILED_DAMAGE) ? 'surface' : null;
}
