import type { CoreController, EngineSnapshot, SessionResult } from '../types';
import type { createScene } from '../render/scene';
import type { createScreens } from './screens';
import { artifactFromResult } from '../engine/artifact';
import { HandOrbit } from './handOrbit';
import { downloadPot } from './result';

export function createInspection(screens: ReturnType<typeof createScreens>, scene: ReturnType<typeof createScene>, core: CoreController, resetInput: () => void, inputBoundary: () => void = () => {}, share: (result: SessionResult) => void = () => {}) {
  const orbit = new HandOrbit();
  let handRotation = 0, shelfViews = 0;
  const layer = document.createElement('section'); layer.className = 'inspection'; layer.hidden = true;
  layer.setAttribute('role', 'dialog'); layer.setAttribute('aria-modal', 'true'); layer.setAttribute('aria-labelledby', 'inspection-title');
  const surface = document.createElement('div'); surface.className = 'inspection__surface'; surface.tabIndex = 0;
  surface.setAttribute('role', 'region');
  surface.setAttribute('aria-label', 'Вращение сосуда: перетаскивайте мышью или пальцем. Стрелки — поворот, плюс и минус — масштаб.');
  const header = document.createElement('header'); header.className = 'inspection__header';
  const title = document.createElement('h2'); title.id = 'inspection-title'; title.textContent = 'Форма со всех сторон';
  const help = document.createElement('p'); help.textContent = 'Раскройте ладонь, затем сожмите кулак вдали от кнопок и ведите руку для вращения. Раскройте ладонь, чтобы отпустить. Мышь и касание тоже работают.';
  const mode = document.createElement('span'); mode.className = 'inspection__mode'; mode.textContent = 'Свободное вращение · лепка на паузе';
  const motion = document.createElement('p'); motion.className = 'inspection__motion'; motion.textContent = 'Кулак → движение руки → поворот сосуда';
  header.append(mode, title, motion, help);
  const actions = document.createElement('nav'); actions.className = 'inspection__actions'; actions.setAttribute('aria-label', 'Осмотр сосуда');
  layer.append(surface, header, actions); screens.page.append(layer);
  let active = false, phase: EngineSnapshot['phase'] | null = null;
  const close = () => {
    if (!active) return;
    active = false; layer.hidden = true; orbit.reset(); scene.setArtifact(null); scene.setInspection(false); screens.setInspection(false);
    screens.removeActions('view-'); actions.replaceChildren(); core.setPaused(false, performance.now()); resetInput();
    screens.page.querySelector<HTMLButtonElement>(`[data-action="${layer.dataset.kind === 'rotate' ? 'rotate' : 'inspect'}"]`)?.focus({ preventScroll: true });
  };
  const keyboard = (event: KeyboardEvent) => {
    if (!active || (screens.actionScope && screens.actionScope !== 'view-')) return;
    const action = ({ ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', '+': 'closer', '=': 'closer', '-': 'farther', '0': 'reset' } as Record<string, string>)[event.key];
    if (action || event.key === 'Escape') {
      event.preventDefault(); event.stopImmediatePropagation();
      if (event.key === 'Escape') close(); else scene.inspectionView(action);
    }
    if (event.key === 'Tab') {
      const focusable = [surface, ...layer.querySelectorAll<HTMLButtonElement>('button')];
      const index = focusable.indexOf(document.activeElement as HTMLButtonElement);
      if (event.shiftKey && index <= 0) { event.preventDefault(); focusable.at(-1)?.focus(); }
      if (!event.shiftKey && index === focusable.length - 1) { event.preventDefault(); surface.focus(); }
    }
  };
  window.addEventListener('keydown', keyboard, true);
  const resetGrab = () => { orbit.reset(); inputBoundary(); };
  window.addEventListener('resize', resetGrab); document.addEventListener('visibilitychange', resetGrab);
  surface.addEventListener('pointerdown', resetGrab);
  return {
    get active() { return active; },
    get usingHands() { return active && orbit.state !== 'idle'; },
    get handRotation() { return handRotation; }, get shelfViews() { return shelfViews; },
    /** rotate: the in-session "rotate only" mode: same paused orbit, a compact header and just a way back to shaping. */
    enter(result?: SessionResult, kind: 'inspect' | 'rotate' = 'inspect'): void {
      if (active || !scene.supportsInspection) return;
      if (kind === 'rotate' && result) kind = 'inspect';
      phase = core.tick(performance.now()).phase;
      if (!['studio', 'tutorial', 'glaze', 'result'].includes(phase) && !(result && phase === 'gallery')) return;
      active = true; layer.hidden = false; core.setPaused(true, performance.now());
      orbit.reset(); inputBoundary(); scene.setArtifact(result ? artifactFromResult(result) : null);
      if (result) shelfViews++;
      layer.dataset.kind = kind;
      title.textContent = result ? 'Сосуд с полки · только просмотр' : kind === 'rotate' ? 'Режим вращения' : 'Форма со всех сторон';
      mode.textContent = result ? 'Коллекция · только просмотр' : kind === 'rotate' ? 'Вращение · лепка на паузе' : 'Свободное вращение · лепка на паузе';
      screens.setInspection(true); scene.setInspection(true, surface);
      const views = kind === 'rotate' ? [['reset', 'Сбросить вид']] : [['left', '←'], ['right', '→'], ['up', '↑'], ['down', '↓'], ['top', 'Сверху'], ['bottom', 'Снизу'], ['closer', '+'], ['farther', '−'], ['reset', 'Сбросить вид']];
      for (const [action, label] of views) {
        const button = screens.addAction(`view-${action}`, label, () => scene.inspectionView(action), actions);
        button.setAttribute('aria-label', ({ left: 'Повернуть влево', right: 'Повернуть вправо', up: 'Повернуть вверх', down: 'Повернуть вниз', closer: 'Приблизить', farther: 'Отдалить' } as Record<string, string>)[action] ?? label);
      }
      screens.addAction('view-close', kind === 'rotate' ? 'Вернуться к лепке' : 'Вернуться к сосуду', close, actions);
      if (result) screens.addAction('view-download', 'Сохранить PNG', () => { void downloadPot(scene.exportPng, result); }, actions);
      if (result) screens.addAction('view-share', 'Поделиться', () => share(result), actions);
      screens.refreshTargets(); surface.focus({ preventScroll: true });
    },
    update(snapshot: EngineSnapshot, available: boolean): void {
      if (active && phase !== snapshot.phase) close();
      if (active) {
        if (screens.actionScope && screens.actionScope !== 'view-') { orbit.reset(); return; }
        const wasGrabbing = orbit.state !== 'idle';
        if (!available || !scene.supportsInspection) orbit.reset();
        else {
          const rect = scene.canvas.getBoundingClientRect();
          const delta = orbit.update(snapshot.input, performance.now(), screens.targets, rect.width, rect.height);
          if (delta) { scene.rotateInspection(delta.x, delta.y); handRotation += Math.hypot(delta.x, delta.y); }
        }
        if (wasGrabbing && orbit.state === 'idle') inputBoundary();
        scene.setPointerOrbit(orbit.state === 'idle');
        layer.dataset.grab = orbit.state;
        const motionText = orbit.state === 'dragging' ? 'Рука вращает сосуд · раскройте ладонь, чтобы отпустить' : orbit.state === 'armed' ? 'Задержите кулак на мгновение' : 'Кулак → движение руки → поворот сосуда';
        if (motion.textContent !== motionText) motion.textContent = motionText;
        if (!scene.supportsInspection) {
          help.textContent = '3D-графика недоступна. Форма сохранена; показан плоский силуэт. Для вращения обновите страницу после восстановления WebGL.';
          for (const button of actions.querySelectorAll<HTMLButtonElement>('button')) if (!['view-close', 'view-share'].includes(button.dataset.action!)) button.disabled = true;
          screens.refreshTargets();
        }
      }
      const button = screens.page.querySelector<HTMLButtonElement>('[data-action="inspect"]');
      if (button && !scene.supportsInspection) { button.disabled = true; button.title = 'Осмотр требует WebGL. Обновите страницу после восстановления графики.'; }
    },
    close,
    destroy(): void { window.removeEventListener('keydown', keyboard, true); window.removeEventListener('resize', resetGrab); document.removeEventListener('visibilitychange', resetGrab); surface.removeEventListener('pointerdown', resetGrab); layer.remove(); },
  };
}
