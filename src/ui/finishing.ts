import { createGalleryStore } from '../browser/storage';
import { GLAZES } from '../render/kiln';
import type { AppCommand, EngineSnapshot } from '../types';
import type { createScreens } from './screens';
import { downloadPot, renderResult } from './result';
import { renderGallery } from './gallery';

export function createFinishing(screens: ReturnType<typeof createScreens>, dispatch: (command: AppCommand) => void, exportPng: () => Promise<Blob | null>) {
  const store = createGalleryStore();
  let revision = -1, savedId: string | null = null, selectedId: string | null = null;
  let confirm: HTMLButtonElement | null = null;
  let jars: HTMLButtonElement[] = [];
  return {
    update(snapshot: EngineSnapshot, enabled: boolean): void {
      if (snapshot.phase === 'result' && snapshot.result && snapshot.result.id !== savedId) { store.save(snapshot.result); savedId = snapshot.result.id; }
      if (revision !== screens.contentRevision) {
        revision = screens.contentRevision; confirm = null; jars = []; selectedId = null;
        if (!enabled) return;
        if (snapshot.phase === 'glaze') {
          const choices = document.createElement('div'); choices.className = 'glaze-choices'; screens.details.append(choices);
          for (const glaze of GLAZES) {
            const jar = screens.addAction(`glaze-${glaze.id}`, glaze.name, () => dispatch({ type: 'selectGlaze', glazeId: glaze.id }), choices);
            jar.classList.add('glaze-jar'); jar.style.setProperty('--glaze', glaze.color); jar.setAttribute('aria-pressed', 'false'); jars.push(jar);
          }
          confirm = screens.addAction('fire', 'В печь', () => dispatch({ type: 'confirmGlaze' }), screens.details);
          confirm.disabled = !snapshot.glazeId;
        } else if (snapshot.phase === 'result' && snapshot.result) {
          const result = snapshot.result;
          renderResult(screens.details, result, store.persistent);
          const download = screens.addAction('download', 'Сохранить PNG', () => {
            download.disabled = true; screens.refreshTargets();
            void downloadPot(exportPng, result).then((success) => {
              download.textContent = success ? 'PNG готов · ещё раз' : 'PNG недоступен · повторить';
              download.disabled = false; screens.refreshTargets();
            });
          });
        } else if (snapshot.phase === 'gallery') {
          let page = 0; const pots = store.list();
          const area = document.createElement('div'); screens.details.append(area);
          const previous = screens.addAction('previous', '← Назад', () => { page--; refresh(); });
          const next = screens.addAction('next', 'Дальше →', () => { page++; refresh(); });
          const count = document.createElement('p'); count.className = 'gallery-count'; screens.details.append(count);
          function refresh(): void {
            renderGallery(area, pots, page, (target) => store.best(target));
            previous.disabled = page <= 0; next.disabled = (page + 1) * 2 >= pots.length;
            count.textContent = pots.length ? `${page + 1} / ${Math.ceil(pots.length / 2)} · до 24 сосудов в этом браузере` : '';
            screens.refreshTargets();
          }
          refresh();
        }
        screens.refreshTargets();
      }
      if (snapshot.phase === 'glaze' && selectedId !== snapshot.glazeId) {
        selectedId = snapshot.glazeId;
        for (let i = 0; i < jars.length; i++) jars[i].setAttribute('aria-pressed', String(GLAZES[i].id === selectedId));
        if (confirm) confirm.disabled = !selectedId;
        screens.refreshTargets();
      }
    },
  };
}
