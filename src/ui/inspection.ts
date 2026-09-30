import type { CoreController, EngineSnapshot } from '../types';
import type { createScene } from '../render/scene';
import type { createScreens } from './screens';

export function createInspection(screens: ReturnType<typeof createScreens>, scene: ReturnType<typeof createScene>, core: CoreController, resetInput: () => void) {
  const layer = document.createElement('section'); layer.className = 'inspection'; layer.hidden = true;
  layer.setAttribute('role', 'dialog'); layer.setAttribute('aria-modal', 'true'); layer.setAttribute('aria-labelledby', 'inspection-title');
  const surface = document.createElement('div'); surface.className = 'inspection__surface'; surface.tabIndex = 0;
  surface.setAttribute('aria-label', 'Вращение сосуда: перетаскивайте мышью или пальцем. Стрелки — поворот, плюс и минус — масштаб.');
  const header = document.createElement('header'); header.className = 'inspection__header';
  const title = document.createElement('h2'); title.id = 'inspection-title'; title.textContent = 'Форма со всех сторон';
  const help = document.createElement('p'); help.textContent = 'Лепка приостановлена · вращайте мышью или пальцем · колесо / щипок — масштаб';
  header.append(title, help);
  const actions = document.createElement('nav'); actions.className = 'inspection__actions'; actions.setAttribute('aria-label', 'Осмотр сосуда');
  layer.append(surface, header, actions); screens.page.append(layer);
  let active = false, phase: EngineSnapshot['phase'] | null = null;
  const close = () => {
    if (!active) return;
    active = false; layer.hidden = true; scene.setInspection(false); screens.setInspection(false);
    screens.removeActions('view-'); actions.replaceChildren(); core.setPaused(false, performance.now()); resetInput();
    screens.page.querySelector<HTMLButtonElement>('[data-action="inspect"]')?.focus({ preventScroll: true });
  };
  const keyboard = (event: KeyboardEvent) => {
    if (!active) return;
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
  return {
    get active() { return active; },
    enter(): void {
      if (active || !scene.supportsInspection) return;
      phase = core.tick(performance.now()).phase;
      if (!['studio', 'tutorial', 'glaze', 'result'].includes(phase)) return;
      active = true; layer.hidden = false; core.setPaused(true, performance.now());
      screens.setInspection(true); scene.setInspection(true, surface);
      for (const [action, label] of [['left', '←'], ['right', '→'], ['up', '↑'], ['down', '↓'], ['top', 'Сверху'], ['bottom', 'Снизу'], ['closer', '+'], ['farther', '−'], ['reset', 'Сбросить вид']]) {
        const button = screens.addAction(`view-${action}`, label, () => scene.inspectionView(action), actions);
        button.setAttribute('aria-label', ({ left: 'Повернуть влево', right: 'Повернуть вправо', up: 'Повернуть вверх', down: 'Повернуть вниз', closer: 'Приблизить', farther: 'Отдалить' } as Record<string, string>)[action] ?? label);
      }
      screens.addAction('view-close', 'Вернуться к сосуду', close, actions);
      screens.refreshTargets(); surface.focus({ preventScroll: true });
    },
    update(snapshot: EngineSnapshot, available: boolean): void {
      if (active && (phase !== snapshot.phase || !available || !scene.supportsInspection)) close();
      const button = screens.page.querySelector<HTMLButtonElement>('[data-action="inspect"]');
      if (button && !scene.supportsInspection) { button.disabled = true; button.title = 'Осмотр требует WebGL. Обновите страницу после восстановления графики.'; }
    },
    close,
    destroy(): void { window.removeEventListener('keydown', keyboard, true); layer.remove(); },
  };
}
