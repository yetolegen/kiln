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
    update(snapshot: EngineSnapshot, nowMs: number, activeHint: Hint | null = snapshot.hint): void {
      const shaping = ['studio', 'tutorial'].includes(snapshot.phase);
      hud.hidden = !shaping && !activeHint;
      gesture.hidden = !shaping; tracking.hidden = !shaping;
      if (hud.hidden) return;
      const pointer = snapshot.gesture?.gesture === 'point' && !!snapshot.gesture.cursorPx && !!snapshot.input && ['ready', 'oneHand'].includes(snapshot.input.status) && nowMs - snapshot.input.tMs <= CONFIG.MAX_INPUT_AGE_MS;
      const currentGesture = pointer ? 'point' : snapshot.gesture?.inputUsable ? snapshot.gesture.gesture : 'none';
      if (currentGesture !== lastGesture) { gesture.textContent = gestureText[currentGesture]; lastGesture = currentGesture; }
      const status = snapshot.input && nowMs - snapshot.input.tMs <= CONFIG.MAX_INPUT_AGE_MS ? snapshot.input.status : 'stale';
      const label = pointer ? 'Указатель готов' : ru.tracking[status];
      if (label !== lastTracking) { tracking.textContent = label; lastTracking = label; }
      if (activeHint !== lastHint) {
        lastHint = activeHint;
        banner.hidden = !lastHint || (snapshot.phase === 'tutorial' && typeof lastHint.params.instruction === 'string');
        banner.textContent = lastHint ? hintText(lastHint) : '';
        banner.dataset.severity = lastHint?.severity ?? 'info';
      }
    },
    destroy(): void { hud.remove(); },
  };
}
