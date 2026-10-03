import type { CoreController, EngineSnapshot } from '../types';
import type { createScreens } from './screens';
import type { createModal } from './modal';
import type { createRecovery } from './recovery';
import type { createFinishing } from './finishing';
import type { createInspection } from './inspection';
import type { createSharing } from './sharing';
import { ToolLessonProgress, type ToolFacts, type ToolLesson } from './toolLessonProgress';
import { createClay, enforceInvariants } from '../engine/clay';
import { isDestroyed } from './sculptingLock';
import { CONFIG } from '../config';

const MODULES: { id: ToolLesson; name: string }[] = [
  { id: 'recovery', name: 'Сохранить и восстановить' }, { id: 'rotation', name: 'Вращение руками' },
  { id: 'attachment', name: 'Добавить и удалить деталь' }, { id: 'stamp', name: 'Штамп и глазурь' }, { id: 'sharing', name: 'Полка и ссылка' },
];

export function createToolLessons(screens: ReturnType<typeof createScreens>, core: CoreController, modal: ReturnType<typeof createModal>,
    recovery: ReturnType<typeof createRecovery>, finishing: ReturnType<typeof createFinishing>, inspection: ReturnType<typeof createInspection>, sharing: ReturnType<typeof createSharing>, closeEditor: () => void) {
  const panel = document.createElement('aside'); panel.className = 'tool-lesson'; panel.hidden = true;
  const title = document.createElement('h2'), note = document.createElement('p'), instruction = document.createElement('p'), actions = document.createElement('nav');
  note.className = 'tool-lesson__note'; instruction.setAttribute('role', 'status');
  panel.append(title, note, instruction, actions); screens.page.append(panel);
  let lesson: ToolLessonProgress | null = null, current: ToolLesson | null = null, revision = -1, finished = false, controlsRevision = -1;
  let completedAt: number | null = null, controlsComplete = false;
  const facts = (s: EngineSnapshot): ToolFacts => ({ saved: recovery.savedCount, restored: recovery.restoredCount, damaged: isDestroyed(s),
    handRotation: inspection.handRotation, attachments: s.customization?.attachments.length ?? 0, stamps: s.customization?.stamps.length ?? 0,
    glazed: !!s.glazeId, shelfViews: inspection.shelfViews, links: sharing.completedLinks });
  function end() {
    if (!lesson) return;
    if (core.tick(performance.now()).phase === 'firing') return;
    inspection.close(); closeEditor();
    lesson = null; current = null; finished = false; completedAt = null; panel.hidden = true; screens.removeActions('tool-');
    delete screens.page.dataset.toolLesson;
    recovery.setTraining(false); finishing.setTraining(false); core.dispatch({ type: 'backToMenu' }, performance.now());
  }
  function begin(id: ToolLesson) {
    if (core.tick(performance.now()).phase === 'firing') return;
    const now = performance.now();
    if (lesson) end();
    core.dispatch({ type: 'backToMenu' }, now);
    core.dispatch({ type: 'start', mode: 'free', sessionId: `lesson-${crypto.randomUUID()}` }, now);
    recovery.setTraining(true, () => begin(id)); finishing.setTraining(true);
    const prepared = core.captureCheckpoint(now);
    // the lesson needs its prepared training pot: if it cannot be set up, say so instead of silently returning
    const unavailable = () => {
      recovery.setTraining(false); finishing.setTraining(false); core.dispatch({ type: 'backToMenu' }, now);
      modal.show('tool-lesson-error', 'Урок недоступен', 'Не удалось подготовить учебный сосуд. Ваша работа не изменилась; попробуйте открыть урок ещё раз.',
        [{ id: 'ok', label: 'Понятно', run: () => {} }]);
    };
    if (!prepared) { unavailable(); return; }
    const clay = createClay();
    if (id === 'recovery') clay.height = .4;
    else { clay.cavityRadiusWorld = .5; clay.cavityDepthWorld = .8; }
    enforceInvariants(clay);
    prepared.clay = { ...clay, radii: Array.from(clay.radii), damage: Array.from(clay.damage) };
    if (!core.restoreCheckpoint(prepared, now)) { unavailable(); return; } // else the lesson would run on the wrong pot
    if (id !== 'recovery') core.dispatch({ type: 'finishShaping' }, now);
    screens.invalidateContent();
    current = id; lesson = new ToolLessonProgress(id, facts(core.tick(now))); finished = false; completedAt = null; controlsRevision = -1;
    screens.page.dataset.toolLesson = id;
    title.textContent = MODULES.find(m => m.id === id)!.name;
    note.textContent = id === 'recovery' ? 'Отдельный учебный черновик: подготовлена низкая форма. Повреждение создаёте вы настоящим нажимом; физические правила не изменены.' :
      'Подготовленный учебный сосуд. Контрольные точки, полка и рекорды вашей мастерской не изменяются.';
  }
  function choose() {
    modal.show('tool-lessons', 'Уроки новых возможностей', 'Можно пройти любой короткий урок. Пропуск не считается выполнением. Каждый урок использует отдельный учебный сосуд.', [
      ...MODULES.map(m => ({ id: `lesson-${m.id}`, label: m.name, run: () => begin(m.id) })),
      { id: 'cancel', label: 'Назад', run: () => {} },
    ]);
  }
  return {
    get active() { return lesson !== null; },
    update(snapshot: EngineSnapshot) {
      if (revision !== screens.contentRevision) {
        revision = screens.contentRevision;
        if (snapshot.phase === 'menu') screens.addAction('new-lessons', 'Уроки · новые возможности', choose);
        screens.refreshTargets();
      }
      if (!lesson || !current) return;
      if (snapshot.phase === 'menu') { end(); return; }
      panel.hidden = false;
      instruction.textContent = lesson.update(facts(snapshot)); panel.dataset.module = current; panel.dataset.complete = String(lesson.complete);
      if (controlsRevision !== screens.contentRevision || controlsComplete !== lesson.complete) {
        screens.removeActions('tool-'); actions.replaceChildren(); controlsRevision = screens.contentRevision; controlsComplete = lesson.complete;
        const repeat = screens.addAction('tool-repeat', 'Повторить урок', () => begin(current!), actions);
        const skip = screens.addAction('tool-skip', lesson.complete ? 'В мастерскую' : 'Пропустить · в мастерскую', end, actions);
        repeat.disabled = skip.disabled = snapshot.phase === 'firing'; screens.refreshTargets();
      }
      if (lesson.complete) completedAt ??= performance.now();
      // never mid-firing: the modal pauses the core and its choices are refused while firing; it shows once firing ends
      if (completedAt !== null && !finished && !modal.active && !sharing.active && snapshot.phase !== 'firing' && performance.now() - completedAt >= CONFIG.LESSON_DONE_MODAL_DELAY_MS) {
        finished = true;
        modal.show('tool-completed', 'Вы справились с обучением!', 'Действие выполнено и результат проверен. Учебная работа остаётся отдельной от вашей мастерской.', [
          { id: 'stay', label: 'Продолжить здесь', run: () => {} },
          { id: 'again', label: 'Повторить', run: () => begin(current!) }, { id: 'next', label: 'Другой урок', run: () => { end(); choose(); } },
          { id: 'menu', label: 'В мастерскую', run: end },
        ]);
      }
    },
    destroy() { panel.remove(); },
  };
}
