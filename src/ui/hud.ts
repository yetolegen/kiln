import { CONFIG } from '../config';
import { gestureText, hintText, ru } from '../i18n';
import type { EngineSnapshot, Hint } from '../types';
import { clayDamageReason } from './clayDamage';

export function createHud(parent: HTMLElement, onLayoutChange: () => void = () => {}) {
  const hud = document.createElement('aside');
  hud.className = 'hud';
  const gesture = document.createElement('span'); gesture.className = 'hud__gesture';
  const tracking = document.createElement('span'); tracking.className = 'hud__tracking';
  const activity = document.createElement('span'); activity.className = 'hud__activity';
  const banner = document.createElement('p'); banner.className = 'hud__hint'; banner.setAttribute('role', 'status');
  banner.hidden = true;
  hud.append(gesture, activity, tracking); parent.append(hud);
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
  let lastDamage: ReturnType<typeof clayDamageReason> | undefined;
  let lastGesture = '', lastTracking = '';
  // Tracking can drop for single frames; a hint that blinks on and off reads as the screen shaking.
  // Show at once, but hide only after it has stayed cleared for a moment.
  const HIDE_GRACE_MS = 700;
  let wantHidden = true, hideAt: number | null = null;
  return {
    update(snapshot: EngineSnapshot, nowMs: number, activeHint: Hint | null = snapshot.hint): void {
      const shaping = ['studio', 'tutorial'].includes(snapshot.phase);
      hud.hidden = !shaping && !activeHint;
      gesture.hidden = !shaping; tracking.hidden = !shaping;
      const pointer = snapshot.gesture?.gesture === 'point' && !!snapshot.gesture.cursorPx && !!snapshot.input && ['ready', 'oneHand'].includes(snapshot.input.status) && nowMs - snapshot.input.tMs <= CONFIG.MAX_INPUT_AGE_MS;
      const currentGesture = pointer ? 'point' : snapshot.gesture?.inputUsable ? snapshot.gesture.gesture : 'none';
      if (currentGesture !== lastGesture) { gesture.textContent = gestureText[currentGesture]; lastGesture = currentGesture; }
      const status = snapshot.input && nowMs - snapshot.input.tMs <= CONFIG.MAX_INPUT_AGE_MS ? snapshot.input.status : 'stale';
      const deforming = !!snapshot.gesture?.deforming && ['ready', 'oneHand'].includes(status);
      const activityText = deforming ? 'Глина меняется' : 'Глина на паузе';
      activity.hidden = !shaping; activity.dataset.active = String(deforming);
      if (activity.textContent !== activityText) activity.textContent = activityText;
      tracking.dataset.ready = String(status === 'ready');
      const label = pointer ? 'Указатель готов' : ru.tracking[status];
      if (label !== lastTracking) { tracking.textContent = label; lastTracking = label; }
      const damage = clayDamageReason(snapshot);
      if (activeHint !== lastHint || damage !== lastDamage) {
        lastHint = activeHint;
        lastDamage = damage;
        parent.dataset.damaged = String(!!damage);
        wantHidden = !damage && (!lastHint || (snapshot.phase === 'tutorial' && typeof lastHint.params.instruction === 'string' && lastHint.params.banner !== 'true'));
        const message = damage ? `${ru.claySpoiled}. ${ru.damage[damage]} Уберите руки от глины и выберите «Начать сначала».` : lastHint ? hintText(lastHint) : '';
        // keep the last words on screen while the hide grace runs
        if (message && banner.textContent !== message) banner.textContent = message;
        banner.dataset.severity = damage ? 'error' : lastHint?.severity ?? 'info';
        banner.setAttribute('role', damage ? 'alert' : 'status');
        layout();
      }
      if (!wantHidden) { hideAt = null; banner.hidden = false; }
      else if (!banner.hidden) {
        hideAt ??= nowMs + HIDE_GRACE_MS;
        if (nowMs >= hideAt || !shaping) { banner.hidden = true; hideAt = null; if (wantHidden && !lastHint) banner.textContent = ''; }
      }
    },
    destroy(): void { observer.disconnect(); window.removeEventListener('resize', layout); cancelAnimationFrame(layoutFrame); hud.remove(); banner.remove(); },
  };
}
