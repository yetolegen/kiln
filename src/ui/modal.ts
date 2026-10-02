import type { CoreController } from '../types';
import type { createScreens } from './screens';
import type { DwellController } from './dwell';

export interface ModalChoice { id: string; label: string; run: () => void; disabled?: boolean; reason?: string }
export function createModal(screens: ReturnType<typeof createScreens>, core: CoreController, dwell: DwellController) {
  const layer = document.createElement('section'); layer.className = 'work-modal'; layer.hidden = true;
  layer.setAttribute('role', 'dialog'); layer.setAttribute('aria-modal', 'true');
  const card = document.createElement('div'); card.className = 'work-modal__card';
  const title = document.createElement('h2'); title.id = 'work-modal-title'; layer.setAttribute('aria-labelledby', title.id);
  const text = document.createElement('p'); const actions = document.createElement('nav');
  card.append(title, text, actions); layer.append(card); screens.page.append(layer);
  let key: string | null = null;
  const close = () => {
    if (!key) return;
    key = null; layer.hidden = true; screens.removeActions('modal-'); screens.setActionScope(null);
    core.setPaused(false, performance.now()); dwell.requireRelease();
  };
  return {
    get active() { return key !== null; },
    get key() { return key; }, close,
    show(id: string, heading: string, message: string, choices: ModalChoice[]): void {
      if (key === id) return;
      screens.removeActions('modal-'); actions.replaceChildren(); key = id;
      layer.hidden = false; title.textContent = heading; text.textContent = message;
      core.setPaused(true, performance.now()); screens.setActionScope('modal-'); dwell.requireRelease();
      for (const choice of choices) {
        const button = screens.addAction(`modal-${choice.id}`, choice.label, () => { close(); choice.run(); }, actions);
        button.disabled = !!choice.disabled; button.title = choice.reason ?? '';
        if (choice.reason) { const reason = document.createElement('small'); reason.textContent = choice.reason; actions.append(reason); }
      }
      screens.refreshTargets();
    },
    destroy(): void { close(); layer.remove(); },
  };
}
