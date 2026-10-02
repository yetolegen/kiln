import { createGalleryStore } from '../browser/storage';
import { GLAZES } from '../render/kiln';
import type { AppCommand, EngineSnapshot, SessionResult } from '../types';
import type { createScreens } from './screens';
import { downloadPot, renderResult } from './result';
import { renderGallery } from './gallery';

export function createFinishing(screens: ReturnType<typeof createScreens>, dispatch: (command: AppCommand) => void, exportPng: () => Promise<Blob | null>, openWork: (result: SessionResult) => void = () => {}, share: (result: SessionResult) => void = () => {}) {
  const personalStore = createGalleryStore(); let store = personalStore, training = false;
  let revision = -1, savedId: string | null = null, selectedId: string | null = null;
  let confirm: HTMLButtonElement | null = null;
  let jars: HTMLButtonElement[] = [];
  let saveStatus: 'saved' | 'memory' | 'duplicate' | 'invalid' = 'invalid';
  return {
    setTraining(active: boolean) { training = active; store = active ? createGalleryStore(() => { throw Error('isolated lesson shelf'); }) : personalStore; revision = -1; savedId = null; },
    update(snapshot: EngineSnapshot, enabled: boolean): void {
      if (snapshot.phase === 'result' && snapshot.result && snapshot.result.id !== savedId) { saveStatus = store.saveDetailed(snapshot.result); savedId = snapshot.result.id; }
      if (revision !== screens.contentRevision) {
        revision = screens.contentRevision; confirm = null; jars = []; selectedId = null;
        if (!enabled) return;
        if (snapshot.phase === 'glaze') {
          const choices = document.createElement('div'); choices.className = 'glaze-choices'; screens.details.append(choices);
          let glazePage = Math.max(0, Math.floor(GLAZES.findIndex(g => g.id === snapshot.glazeId) / 3));
          const paging = document.createElement('nav'); paging.className = 'glaze-pages'; screens.details.append(paging);
          const previous = screens.addAction('glazepage-previous', '← Глазури', () => { glazePage--; showGlazes(); }, paging);
          const next = screens.addAction('glazepage-next', 'Глазури →', () => { glazePage++; showGlazes(); }, paging);
          function showGlazes() {
            screens.removeActions('glaze-'); choices.replaceChildren(); jars = [];
            for (const glaze of GLAZES.slice(glazePage * 3, glazePage * 3 + 3)) {
              const jar = screens.addAction(`glaze-${glaze.id}`, glaze.name, () => dispatch({ type: 'selectGlaze', glazeId: glaze.id }), choices);
              jar.classList.add('glaze-jar'); jar.dataset.glazeId = glaze.id; jar.style.setProperty('--glaze', glaze.color);
              jar.setAttribute('aria-pressed', String(glaze.id === selectedId)); jars.push(jar);
            }
            previous.disabled = glazePage === 0; next.disabled = (glazePage + 1) * 3 >= GLAZES.length; screens.refreshTargets();
          }
          showGlazes();
          confirm = screens.addAction('fire', 'В печь', () => dispatch({ type: 'confirmGlaze' }), screens.details);
          confirm.disabled = !snapshot.glazeId;
        } else if (snapshot.phase === 'result' && snapshot.result) {
          const result = snapshot.result;
          screens.addAction('result-share', 'Поделиться сосудом', () => share(result));
          renderResult(screens.details, result, store.persistent);
          if (training) { const status = screens.details.querySelector('.storage-status'); if (status) status.textContent = 'Учебная работа · отдельная временная полка. Ваши работы и рекорды не изменены.'; }
          if (saveStatus === 'invalid') { const status = screens.details.querySelector('.storage-status'); if (status) status.textContent = 'Сохранение не выполнено: данные сосуда не прошли проверку.'; }
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
            screens.removeActions('shelf-open-');
            renderGallery(area, pots, page, (target) => store.best(target));
            const cards = area.querySelectorAll<HTMLElement>('.gallery-card');
            for (const [i, pot] of pots.slice(page * 2, page * 2 + 2).entries()) screens.addAction(`shelf-open-${i}`, 'Осмотреть сосуд', () => openWork(pot), cards[i]);
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
        for (const jar of jars) jar.setAttribute('aria-pressed', String(jar.dataset.glazeId === selectedId));
        if (confirm) confirm.disabled = !selectedId;
        screens.refreshTargets();
      }
    },
  };
}
