import type { CoreController } from '../types';
import type { createScreens } from './screens';
import type { DwellController } from './dwell';
import { createDialogFocus } from './dialogFocus';

export interface ModalChoice { id: string; label: string; run: () => void; disabled?: boolean; reason?: string }
export function createModal(screens: ReturnType<typeof createScreens>, core: CoreController, dwell: DwellController) {
  const layer = document.createElement('section'); layer.className = 'work-modal'; layer.hidden = true;
  layer.setAttribute('role', 'dialog'); layer.setAttribute('aria-modal', 'true');
  const card = document.createElement('div'); card.className = 'work-modal__card';
  const title = document.createElement('h2'); title.id = 'work-modal-title'; layer.setAttribute('aria-labelledby', title.id);
  const eyebrow = document.createElement('span'); eyebrow.className = 'work-modal__eyebrow';
  const text = document.createElement('p'); text.id = 'work-modal-description'; layer.setAttribute('aria-describedby', text.id);
  const correction = document.createElement('p'); correction.className = 'work-modal__correction';
  const actions = document.createElement('nav'); actions.setAttribute('aria-label', 'Продолжить работу');
  card.append(eyebrow, title, text, correction, actions); layer.append(card); screens.page.append(layer);
  const focus = createDialogFocus(layer);
  let key: string | null = null, previousScope: string | null = null;
  const close = () => {
    if (!key) return;
    // restore the scope the modal interrupted (e.g. the decoration editor's 'decor-'), not null
    key = null; layer.hidden = true; focus.leave(); screens.removeActions('modal-'); screens.setActionScope(previousScope);
    core.setPaused(false, performance.now()); dwell.requireRelease();
  };
  return {
    get active() { return key !== null; },
    get key() { return key; }, close,
    show(id: string, heading: string, message: string, choices: ModalChoice[], advice = ''): void {
      if (key === id) return;
      if (!key) previousScope = screens.actionScope;
      screens.removeActions('modal-'); actions.replaceChildren(); key = id;
      layer.hidden = false; title.textContent = heading; text.textContent = message;
      layer.dataset.kind = id;
      eyebrow.textContent = id === 'damage' ? 'Лепка остановлена' : id.includes('complet') ? '✓ Урок пройден' : id === 'tool-lessons' ? 'Практика в мастерской' : 'Контрольная точка';
      correction.textContent = advice; correction.hidden = !advice;
      core.setPaused(true, performance.now()); screens.setActionScope('modal-'); dwell.requireRelease();
      for (const choice of choices) {
        const group = document.createElement('div'); group.className = 'work-modal__choice'; actions.append(group);
        const button = screens.addAction(`modal-${choice.id}`, choice.label, () => { close(); choice.run(); }, group);
        button.disabled = !!choice.disabled; button.title = choice.reason ?? '';
        if (choice.reason) { const reason = document.createElement('small'); reason.id = `modal-${choice.id}-reason`; reason.textContent = choice.reason; button.setAttribute('aria-describedby', reason.id); group.append(reason); }
      }
      focus.enter();
      screens.refreshTargets();
    },
    destroy(): void { close(); layer.remove(); },
  };
}
