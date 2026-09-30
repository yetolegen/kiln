import { CONFIG } from '../config';
import { gestureText, hintText, ru } from '../i18n';
import type { EngineSnapshot, Hint } from '../types';

export function createHud(parent: HTMLElement, onLayoutChange: () => void = () => {}) {
  const hud = document.createElement('aside');
  hud.className = 'hud';
  const gesture = document.createElement('span'); gesture.className = 'hud__gesture';
  const tracking = document.createElement('span'); tracking.className = 'hud__tracking';
  const banner = document.createElement('p'); banner.className = 'hud__hint'; banner.setAttribute('role', 'status');
  banner.hidden = true;
  hud.append(gesture, tracking); parent.append(hud);
  const heading = parent.querySelector('h1');
  if (heading) heading.before(banner); else parent.prepend(banner);
  let layoutFrame = 0;
  const layout = () => {
    cancelAnimationFrame(layoutFrame);
    layoutFrame = requestAnimationFrame(() => {
      const actions = parent.querySelector('.phase-actions');
      // buttons pinned to the side (wide shaping screens): the card goes under the instructions instead
      const above = actions && getComputedStyle(actions).position === 'fixed' ? parent.querySelector('.workshop__description') : actions;
      if (above) parent.style.setProperty('--lesson-after-actions', `${above.getBoundingClientRect().bottom + 12}px`);
      onLayoutChange();
    });
  };
  const observer = new ResizeObserver(layout);
  observer.observe(banner);
  const actions = parent.querySelector('.phase-actions');
  if (actions) observer.observe(actions);
  window.addEventListener('resize', layout);
  layout();
  let lastHint: Hint | null | undefined;
  let lastGesture = '', lastTracking = '';
  return {
    update(snapshot: EngineSnapshot, nowMs: number, activeHint: Hint | null = snapshot.hint): void {
      const shaping = ['studio', 'tutorial'].includes(snapshot.phase);
      hud.hidden = !shaping && !activeHint;
      gesture.hidden = !shaping; tracking.hidden = !shaping;
      const pointer = snapshot.gesture?.gesture === 'point' && !!snapshot.gesture.cursorPx && !!snapshot.input && ['ready', 'oneHand'].includes(snapshot.input.status) && nowMs - snapshot.input.tMs <= CONFIG.MAX_INPUT_AGE_MS;
      const currentGesture = pointer ? 'point' : snapshot.gesture?.inputUsable ? snapshot.gesture.gesture : 'none';
      if (currentGesture !== lastGesture) { gesture.textContent = gestureText[currentGesture]; lastGesture = currentGesture; }
      const status = snapshot.input && nowMs - snapshot.input.tMs <= CONFIG.MAX_INPUT_AGE_MS ? snapshot.input.status : 'stale';
      const label = pointer ? 'Указатель готов' : ru.tracking[status];
      if (label !== lastTracking) { tracking.textContent = label; lastTracking = label; }
      if (activeHint !== lastHint) {
        lastHint = activeHint;
        banner.hidden = !lastHint || (snapshot.phase === 'tutorial' && typeof lastHint.params.instruction === 'string' && lastHint.params.banner !== 'true');
        banner.textContent = lastHint ? hintText(lastHint) : '';
        banner.dataset.severity = lastHint?.severity ?? 'info';
        layout();
      }
    },
    destroy(): void { observer.disconnect(); window.removeEventListener('resize', layout); cancelAnimationFrame(layoutFrame); hud.remove(); banner.remove(); },
  };
}
