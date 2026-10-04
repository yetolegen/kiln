import type { CoreController, EngineSnapshot } from '../types';
import { createCheckpointStore } from '../browser/checkpointStore';
import type { createScreens } from './screens';
import type { createModal } from './modal';
import type { DwellController } from './dwell';
import { isDestroyed } from './sculptingLock';
import { CONFIG } from '../config';

export function createRecovery(screens: ReturnType<typeof createScreens>, core: CoreController,
    modal: ReturnType<typeof createModal>, dwell: DwellController) {
  const personalStore = createCheckpointStore();
  let store = personalStore, savedCount = 0, restoredCount = 0;
  let revision = -1, terminalKey = '', completionKey = '';
  let completedAt: number | null = null, trainingRestart: (() => void) | null = null;
  let save: HTMLButtonElement | null = null, restore: HTMLButtonElement | null = null;
  let restoreNotice: string | null = null;
  // One checkpoint slot per browser: in a pot, «Восстановить» offers only a point saved in this session (or the
  // session the menu's «Продолжить с точки» resumed), never an older pot from another session.
  let savedSession = store.load()?.stats.sessionId ?? null, resumedSession: string | null = null;
  const ownsPoint = (s: EngineSnapshot | null) => !!savedSession && !!s?.stats?.sessionId && (s.stats.sessionId === savedSession || s.stats.sessionId === resumedSession);
  let last: EngineSnapshot | null = null; // the latest frame's snapshot; ticking the core here would drop its queued events
  const status = document.createElement('p'); status.className = 'checkpoint-status'; status.setAttribute('role', 'status');
  const message = (text: string, tone = 'neutral') => { status.textContent = text; status.dataset.tone = tone; screens.refreshTargets(); };
  function restoreNow() {
    const saved = store.load();
    const resumed = core.tick(performance.now()).phase === 'menu' ? crypto.randomUUID() : undefined;
    const ok = saved && core.restoreCheckpoint(saved, performance.now(), resumed);
    if (ok) { restoredCount++; if (resumed) { resumedSession = resumed; savedSession = saved.stats.sessionId; } }
    dwell.requireRelease();
    restoreNotice = ok ? 'Точка восстановлена — вы вернулись к сохранённой версии. Уберите руки от глины, затем начните новое движение.' : null;
    message(restoreNotice ?? 'Не удалось восстановить точку. Текущая работа сохранена.', ok ? 'success' : 'warning');
    terminalKey = '';
  }
  function askRestore() {
    // a checkpoint from the other mode switches the session to it: say so instead of doing it silently
    const saved = store.load(), now = last;
    const label = (mode: string) => (mode === 'commission' ? '«Ваза по образцу»' : '«Свободная форма»');
    const switchMode = saved && now && now.phase !== 'menu' && now.mode && saved.mode !== now.mode
      ? ` Точка сделана в режиме ${label(saved.mode)}: работа переключится на этот режим.` : '';
    modal.show('restore', 'Восстановить работу?', 'Глина и оформление вернутся к сохранённой точке. Более поздние детали будут потеряны. Ошибки и время остаются в статистике.' + switchMode, [
      { id: 'restore', label: 'Да, восстановить', run: restoreNow }, { id: 'cancel', label: 'Оставить как есть', run: () => {} },
    ]);
  }
  function saveNow() {
    const snapshot = core.captureCheckpoint(performance.now());
    const ok = snapshot && store.save(snapshot); if (ok) { savedCount++; savedSession = snapshot.stats.sessionId; resumedSession = null; }
    // a capture refused by the engine (clay held or ruined) and a snapshot the store rejects are different failures
    if (snapshot && !ok) console.warn('KILN: checkpoint store rejected a captured snapshot', snapshot);
    message(ok ? store.persistent ? 'Точка сохранена. Можно вернуться к этой версии.' : 'Точка доступна до закрытия страницы.'
      : snapshot ? 'Не удалось сохранить точку: данные формы не прошли проверку. Работа продолжается; попробуйте ещё раз после следующего движения.'
      : 'Сначала отпустите глину. Повреждённую форму сохранить нельзя.', ok ? 'success' : 'warning');
  }
  function askSave() {
    if (!store.available) { saveNow(); return; }
    modal.show('replace', 'Заменить контрольную точку?', 'Предыдущая точка будет заменена текущей формой и оформлением.', [
      { id: 'replace', label: 'Заменить точку', run: saveNow }, { id: 'cancel', label: 'Отмена', run: () => {} },
    ]);
  }
  return {
    get savedCount() { return savedCount; }, get restoredCount() { return restoredCount; },
    /** restart: how "Начать сначала" re-prepares a training pot; a plain core restart would use default clay */
    setTraining(active: boolean, restart?: () => void) {
      trainingRestart = active ? restart ?? null : null;
      store = active ? createCheckpointStore(() => { throw Error('isolated lesson memory'); }) : personalStore;
      savedSession = store.load()?.stats.sessionId ?? null; resumedSession = null;
      revision = -1; screens.removeActions('checkpoint-');
    },
    update(snapshot: EngineSnapshot, lessonCompleted: boolean): void {
      last = snapshot;
      if (revision !== screens.contentRevision) {
        revision = screens.contentRevision; save = restore = null;
        const offered = snapshot.phase === 'menu' ? store.available : ownsPoint(snapshot);
        message(restoreNotice ?? (offered ? 'Точка доступна · можно восстановить.' : 'Точка не сохранена · сохраните целую форму.'), restoreNotice ? 'success' : 'neutral');
        if (['studio', 'glaze'].includes(snapshot.phase)) {
          save = screens.addAction('checkpoint-save', 'Сохранить точку', askSave);
          restore = screens.addAction('checkpoint-restore', 'Восстановить', askRestore);
          screens.details.append(status);
        } else if (snapshot.phase === 'menu' && store.available) {
          screens.addAction('checkpoint-resume', 'Продолжить с точки', askRestore);
          screens.details.append(status);
        }
      }
      restoreNotice = null;
      const disabled = screens.controlsLocked || isDestroyed(snapshot);
      if (save && save.disabled !== disabled) { save.disabled = disabled; save.title = disabled ? 'Сначала отпустите глину. Повреждённую форму сохранить нельзя.' : ''; screens.refreshTargets(); }
      const restoreOff = !ownsPoint(snapshot) || screens.controlsLocked;
      if (restore && restore.disabled !== restoreOff) { restore.disabled = restoreOff; screens.refreshTargets(); }
      if (['studio', 'tutorial'].includes(snapshot.phase) && isDestroyed(snapshot)) {
        const key = `${snapshot.stats?.sessionId}:${snapshot.clay?.collapseCause}`;
        if (key !== terminalKey && !modal.active) {
          terminalKey = key;
          const cause = snapshot.clay!.collapseCause;
          const heading = cause === 'bottomHole' ? 'Дно пробито' : cause === 'wallTorn' ? 'Стенка разорвалась' : 'Сосуд сплющен в лепёшку';
          const explanation = cause === 'bottomHole' ? 'Большой палец прошёл слишком глубоко.' : cause === 'wallTorn' ? 'Отверстие растянуто слишком сильно — разрыв пошёл от края.' : 'Давление продолжалось после достижения нужной высоты.';
          const correction = cause === 'bottomHole' ? 'Вводите палец медленно, до безопасной отметки.' : cause === 'wallTorn' ? 'Остановите раскрытие раньше, сохраняя толщину стенок.' : 'Остановите давление, когда край достигнет нужной высоты.';
          modal.show('damage', heading, explanation, [
            { id: 'restore', label: 'Восстановить точку', run: restoreNow, disabled: !ownsPoint(snapshot) || snapshot.phase === 'tutorial', reason: snapshot.phase === 'tutorial' ? 'Этот урок повторяется с первого шага; личная точка сохраняется отдельно.' : !ownsPoint(snapshot) ? 'Сначала сохраните точку на целой форме.' : undefined },
            { id: 'restart', label: 'Начать сначала', run: trainingRestart ?? (() => core.dispatch({ type: 'restart', newSessionId: crypto.randomUUID() }, performance.now())) },
            { id: 'menu', label: 'В мастерскую', run: () => core.dispatch({ type: 'backToMenu' }, performance.now()) },
          ], correction);
        }
      } else if (!isDestroyed(snapshot)) terminalKey = '';
      const fresh = lessonCompleted && snapshot.phase === 'tutorial' && completionKey !== snapshot.stats?.sessionId;
      completedAt = fresh ? completedAt ?? performance.now() : null;
      if (fresh && !modal.active && performance.now() - completedAt! >= CONFIG.LESSON_DONE_MODAL_DELAY_MS) {
        completionKey = snapshot.stats?.sessionId ?? '';
        modal.show('lesson-complete', 'Вы справились с обучением!', 'Вы создали форму по образцу. Теперь можно сделать собственный сосуд. Выберите продолжение ладонью.', [
          { id: 'stay', label: 'Продолжить здесь', run: () => {} },
          { id: 'menu', label: 'В мастерскую', run: () => core.dispatch({ type: 'backToMenu' }, performance.now()) },
        ]);
      }
    },
    destroy(): void { screens.removeActions('checkpoint-'); status.remove(); },
  };
}
