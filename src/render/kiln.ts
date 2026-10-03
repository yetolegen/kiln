import { CONFIG } from '../config';
import type { AppPhase, EngineSnapshot } from '../types';

import { glazeColor } from '../engine/materials';
export { GLAZES, glazeColor } from '../engine/materials';

export function createKiln(parent: HTMLElement, setSurface: (color: string, gloss: number, glow: number) => void) {
  const glow = document.createElement('div'); glow.className = 'kiln-glow'; glow.hidden = true; parent.append(glow);
  let phase: AppPhase | null = null, firingAt = 0, lastId: string | null = null;
  return {
    update(snapshot: EngineSnapshot, nowMs: number): void {
      const changed = phase !== snapshot.phase;
      if (changed && snapshot.phase === 'firing') firingAt = nowMs;
      phase = snapshot.phase;
      const id = ['glaze', 'firing', 'result'].includes(phase) ? snapshot.result?.glazeId ?? snapshot.glazeId : null;
      glow.hidden = phase !== 'firing';
      if (phase === 'firing') {
        const progress = Math.min(1, (nowMs - firingAt) / CONFIG.FIRING_MS);
        const heat = Math.sin(progress * Math.PI);
        glow.style.opacity = String(heat * .85);
        setSurface(glazeColor(id), progress, heat * 1.8);
      } else if (changed || id !== lastId) setSurface(glazeColor(id), phase === 'result' ? 1 : id ? .5 : 0, 0);
      lastId = id;
    },
    destroy(): void { glow.remove(); },
  };
}
