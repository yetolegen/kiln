import { encodeShare } from '../browser/shareCodec';
import { artifactFromResult } from '../engine/artifact';
import type { SessionResult } from '../types';
import type { createScreens } from './screens';
import type { DwellController } from './dwell';
import { createDialogFocus } from './dialogFocus';

export function createSharing(screens: ReturnType<typeof createScreens>, dwell: DwellController) {
  const layer = document.createElement('section'); layer.className = 'work-modal share-panel'; layer.hidden = true;
  layer.setAttribute('role', 'dialog'); layer.setAttribute('aria-modal', 'true'); layer.setAttribute('aria-label', 'Поделиться сосудом');
  const card = document.createElement('div'); card.className = 'work-modal__card';
  const title = document.createElement('h2'); title.textContent = 'Покажите свою работу';
  const status = document.createElement('p'); status.setAttribute('role', 'status');
  const link = document.createElement('a'); link.className = 'share-url'; link.target = '_blank'; link.rel = 'noopener';
  const actions = document.createElement('nav'); card.append(title, status, link, actions); layer.append(card); screens.page.append(layer);
  const focus = createDialogFocus(layer);
  let generation = 0, previousScope: string | null = null;
  let completedLinks = 0;
  const message = (text: string) => { status.textContent = text; screens.refreshTargets(); dwell.requireRelease(); };
  const close = () => { generation++; layer.hidden = true; focus.leave(); screens.removeActions('share-'); screens.setActionScope(previousScope); dwell.requireRelease(); };
  return {
    async open(result: SessionResult) {
      const request = ++generation; previousScope = screens.actionScope; layer.hidden = false; link.textContent = ''; link.removeAttribute('href');
      screens.removeActions('share-'); status.textContent = 'Готовим ссылку…'; screens.setActionScope('share-'); dwell.requireRelease();
      screens.addAction('share-close', 'Вернуться', close, actions); focus.enter(); screens.refreshTargets();
      try {
        const hash = await encodeShare(artifactFromResult(result)); if (request !== generation) return;
        completedLinks++;
        const url = location.origin + location.pathname + hash; link.href = url; link.textContent = url;
        status.textContent = 'Ссылка содержит форму и оформление. Получатель увидит сосуд без камеры. Ссылка открывает просмотр; результаты и рекорды не передаются.';
        screens.addAction('share-copy', 'Скопировать ссылку', () => {
          void navigator.clipboard?.writeText(url).then(() => { if (request === generation) message('Ссылка скопирована.'); }, () => { if (request === generation) message('Браузер не разрешил копирование. Полная ссылка доступна ниже.'); });
          if (!navigator.clipboard) message('Копирование недоступно. Полная ссылка доступна ниже.');
        }, actions);
        screens.refreshTargets();
        // Async content moves the controls. Resting hands must leave the new targets first.
        dwell.requireRelease();
      } catch (error) { if (request === generation) status.textContent = error instanceof Error ? error.message : 'Не удалось создать ссылку. Изделие сохранено на полке.'; }
    },
    get active() { return !layer.hidden; }, close,
    get completedLinks() { return completedLinks; },
    destroy() { close(); layer.remove(); },
  };
}
