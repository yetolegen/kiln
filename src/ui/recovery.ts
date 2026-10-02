import type { CoreController, EngineSnapshot } from '../types';
import { createCheckpointStore } from '../browser/checkpointStore';
import type { createScreens } from './screens';
import type { createModal } from './modal';
import type { DwellController } from './dwell';
import { isDestroyed } from './sculptingLock';

export function createRecovery(screens: ReturnType<typeof createScreens>, core: CoreController,
    modal: ReturnType<typeof createModal>, dwell: DwellController) {
  const personalStore = createCheckpointStore();
  let store = personalStore, savedCount = 0, restoredCount = 0;
  let revision = -1, terminalKey = '', completionKey = '';
  let save: HTMLButtonElement | null = null, restore: HTMLButtonElement | null = null;
  const status = document.createElement('p'); status.className = 'checkpoint-status'; status.setAttribute('role', 'status');
  const message = (text: string) => { status.textContent = text; screens.refreshTargets(); };
  function restoreNow() {
    const saved = store.load();
    const ok = saved && core.restoreCheckpoint(saved, performance.now(), core.tick(performance.now()).phase === 'menu' ? crypto.randomUUID() : undefined);
    if (ok) restoredCount++;
    dwell.requireRelease();
    message(ok ? 'Точка восстановлена. Уберите руки от глины, затем начните новое движение.' : 'Не удалось восстановить точку. Текущая работа сохранена.');
    terminalKey = '';
  }
  function askRestore() {
    modal.show('restore', 'Восстановить работу?', 'Глина и оформление вернутся к сохранённой точке. Более поздние детали будут потеряны. Ошибки и время остаются в статистике.', [
      { id: 'restore', label: 'Да, восстановить', run: restoreNow }, { id: 'cancel', label: 'Оставить как есть', run: () => {} },
    ]);
  }
  function saveNow() {
    const snapshot = core.captureCheckpoint(performance.now());
    const ok = snapshot && store.save(snapshot); if (ok) savedCount++;
    message(ok ? store.persistent ? 'Точка сохранена в этом браузере.' : 'Точка доступна до закрытия страницы.' : 'Сначала отпустите глину. Повреждённую форму сохранить нельзя.');
  }
  function askSave() {
    if (!store.available) { saveNow(); return; }
    modal.show('replace', 'Заменить контрольную точку?', 'Предыдущая точка будет заменена текущей формой и оформлением.', [
      { id: 'replace', label: 'Заменить точку', run: saveNow }, { id: 'cancel', label: 'Отмена', run: () => {} },
    ]);
  }
  return {
    get savedCount() { return savedCount; }, get restoredCount() { return restoredCount; },
    setTraining(active: boolean) {
      store = active ? createCheckpointStore(() => { throw Error('isolated lesson memory'); }) : personalStore;
      revision = -1; screens.removeActions('checkpoint-');
    },
    update(snapshot: EngineSnapshot, lessonCompleted: boolean): void {
      if (revision !== screens.contentRevision) {
        revision = screens.contentRevision; save = restore = null; status.textContent = '';
        if (['studio', 'glaze'].includes(snapshot.phase)) {
          save = screens.addAction('checkpoint-save', 'Сохранить точку', askSave);
          restore = screens.addAction('checkpoint-restore', 'Восстановить', askRestore);
          screens.details.append(status);
        } else if (snapshot.phase === 'menu' && store.available) {
          screens.addAction('checkpoint-resume', 'Продолжить с точки', askRestore);
          screens.details.append(status);
        }
      }
      const disabled = screens.controlsLocked || isDestroyed(snapshot);
      if (save && save.disabled !== disabled) { save.disabled = disabled; save.title = disabled ? 'Сначала отпустите глину. Повреждённую форму сохранить нельзя.' : ''; screens.refreshTargets(); }
      if (restore && restore.disabled !== (!store.available || screens.controlsLocked)) { restore.disabled = !store.available || screens.controlsLocked; screens.refreshTargets(); }
      if (['studio', 'tutorial'].includes(snapshot.phase) && isDestroyed(snapshot)) {
        const key = `${snapshot.stats?.sessionId}:${snapshot.clay?.collapseCause}`;
        if (key !== terminalKey && !modal.active) {
          terminalKey = key;
          const cause = snapshot.clay!.collapseCause;
          const explanation = cause === 'bottomHole' ? 'Дно пробито: большой палец прошёл слишком глубоко. В следующей попытке вводите его медленно, до безопасной отметки.' :
            cause === 'wallTorn' ? 'Стенка разорвалась от края: отверстие растянуто слишком сильно. В следующий раз остановитесь раньше и сохраните толщину стенок.' :
              'Сосуд сплющен в лепёшку. В следующий раз остановите давление, когда высота достигнет нужной формы.';
          modal.show('damage', 'Глина испортилась, начните заново', `${explanation} Это часть обучения — сохранённая точка поможет попробовать ещё раз.`, [
            { id: 'restore', label: 'Восстановить точку', run: restoreNow, disabled: !store.available || snapshot.phase === 'tutorial', reason: snapshot.phase === 'tutorial' ? 'Этот урок повторяется с первого шага; личная точка сохраняется отдельно.' : !store.available ? 'Сначала сохраните точку на целой форме.' : undefined },
            { id: 'restart', label: 'Начать сначала', run: () => core.dispatch({ type: 'restart', newSessionId: crypto.randomUUID() }, performance.now()) },
            { id: 'menu', label: 'В мастерскую', run: () => core.dispatch({ type: 'backToMenu' }, performance.now()) },
          ]);
        }
      } else if (!isDestroyed(snapshot)) terminalKey = '';
      if (lessonCompleted && snapshot.phase === 'tutorial' && completionKey !== snapshot.stats?.sessionId && !modal.active) {
        completionKey = snapshot.stats?.sessionId ?? '';
        modal.show('lesson-complete', 'Вы справились с обучением!', 'Вы создали форму по образцу. Теперь можно сделать собственный сосуд. Выберите продолжение ладонью.', [
          { id: 'menu', label: 'В мастерскую', run: () => core.dispatch({ type: 'backToMenu' }, performance.now()) },
        ]);
      }
    },
    destroy(): void { screens.removeActions('checkpoint-'); status.remove(); },
  };
}
