import { CONFIG } from '../config';
import { gestureText, hintText, ru } from '../i18n';
import type { EngineSnapshot, Hint } from '../types';

export function createHud(parent: HTMLElement) {
  const hud = document.createElement('aside');
  hud.className = 'hud';
  const gesture = document.createElement('span'); gesture.className = 'hud__gesture';
  const tracking = document.createElement('span'); tracking.className = 'hud__tracking';
  const banner = document.createElement('p'); banner.className = 'hud__hint'; banner.setAttribute('role', 'status');
  hud.append(gesture, tracking, banner); parent.append(hud);
  let lastHint: Hint | null | undefined;
  let lastGesture = '', lastTracking = '';
  return {
    update(snapshot: EngineSnapshot, nowMs: number): void {
      hud.hidden = !['studio', 'tutorial'].includes(snapshot.phase);
      if (hud.hidden) return;
      const currentGesture = snapshot.gesture?.inputUsable ? snapshot.gesture.gesture : 'none';
      if (currentGesture !== lastGesture) { gesture.textContent = gestureText[currentGesture]; lastGesture = currentGesture; }
      const status = snapshot.input && nowMs - snapshot.input.tMs <= CONFIG.MAX_INPUT_AGE_MS ? snapshot.input.status : 'stale';
      if (status !== lastTracking) { tracking.textContent = ru.tracking[status]; lastTracking = status; }
      if (snapshot.hint !== lastHint) {
        lastHint = snapshot.hint;
        banner.hidden = !lastHint;
        banner.textContent = lastHint ? hintText(lastHint) : '';
        banner.dataset.severity = lastHint?.severity ?? 'info';
      }
    },
    destroy(): void { hud.remove(); },
  };
}
