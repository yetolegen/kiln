import { phaseText, ru, type StartupProblem } from '../i18n';
import type { AppCommand, AppPhase, EngineSnapshot } from '../types';
import type { DwellRegion } from './dwell';
import { CONFIG } from '../config';
import { SculptingLock, isDestroyed } from './sculptingLock';
import { actionIcon } from './icons';
import { createProcess } from './process';

/** Buttons that end or leave the current shaping session: locked while sculpting, slower to dwell. */
const SESSION_ACTIONS = ['done', 'restart', 'menu', 'inspect', 'rotate'];
/** Shaping-screen actions folded behind «Ещё» on wide screens (studio.css); choosing one folds it back. */
const OVERFLOW_ACTIONS = ['restart', 'checkpoint-restore', 'camera-preview', 'rotate', 'focus'];

export interface StartupState {
  busy: boolean;
  cameraActive: boolean;
  error: StartupProblem | null;
}

export function createScreens(root: HTMLElement, onStart: () => void, dispatch: (command: AppCommand) => void, toggleMute: () => boolean, onInspect: () => void = () => {}, onRotate: () => void = () => {}) {
  const page = document.createElement('main');
  page.className = 'workshop';
  const viewport = document.createElement('div');
  viewport.className = 'camera-viewport';
  const video = document.createElement('video');
  video.className = 'camera-video';
  video.setAttribute('aria-hidden', 'true');
  viewport.append(video);

  const header = document.createElement('header');
  header.className = 'workshop__header';
  const brand = document.createElement('span');
  brand.className = 'wordmark';
  brand.textContent = ru.brand;
  const label = document.createElement('span');
  label.className = 'workshop__label';
  label.textContent = ru.eyebrow;
  header.append(brand, label);

  // Decorative welcome illustration: shown before the camera starts, never behind controls.
  const art = document.createElement('img');
  art.className = 'welcome-art';
  art.src = '/art/clay-wheel.webp';
  art.alt = '';
  art.width = 882;
  art.height = 665;
  art.decoding = 'async';
  art.setAttribute('fetchpriority', 'high');
  art.setAttribute('aria-hidden', 'true');

  const content = document.createElement('section');
  content.className = 'workshop__content';
  const title = document.createElement('h1');
  title.textContent = ru.title;
  const description = document.createElement('p');
  description.className = 'workshop__description';
  description.textContent = ru.description;
  const status = document.createElement('p');
  status.className = 'workshop__status';
  status.textContent = ru.status;
  status.setAttribute('role', 'status');
  const start = document.createElement('button');
  start.className = 'start-button';
  start.type = 'button';
  start.textContent = ru.start;
  start.insertAdjacentHTML('beforeend', '<svg class="start-button__arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 12h15M13 6l6 6-6 6"/></svg>');
  start.addEventListener('click', onStart);
  const progress = document.createElement('progress');
  progress.max = 1;
  progress.value = 0;
  progress.setAttribute('aria-label', 'Настройка рук');
  progress.hidden = true;
  const actions = document.createElement('nav');
  actions.className = 'phase-actions';
  actions.setAttribute('aria-label', 'Действия');
  const details = document.createElement('section');
  details.className = 'phase-details';
  const process = createProcess(); process.update(-1);
  content.append(process.element, title, description, status, progress, start, actions, details);

  const footer = document.createElement('footer');
  footer.textContent = ru.footer;
  page.append(viewport, header, art, content, footer);
  root.replaceChildren(page);
  let lastPhase: AppPhase | null = null;
  let lastMode: EngineSnapshot['mode'] = null;
  let lastBusy = false, lastActive = false;
  let lastError: StartupProblem | null | undefined;
  let lastTracking = '';
  let screenRevision = 0;
  let contentRevision = 0;
  const entries: { id: string; element: HTMLButtonElement; run: () => void }[] = [];
  const targets: DwellRegion[] = [];
  let dwelling: HTMLButtonElement | null = null;
  let lastDwell = -1;
  let muted = false;
  const sculpting = new SculptingLock();
  let controlsLocked = false, destroyed = false;
  let inspection = false, preview = false, focus = false;
  function setFocus(next: boolean): void {
    focus = next; page.dataset.focus = String(focus);
    const button = entries.find(e => e.id === 'focus')?.element;
    if (button) { button.textContent = focus ? 'Показать кнопки' : 'Только глина'; button.insertAdjacentHTML('afterbegin', actionIcon('focus')); button.setAttribute('aria-pressed', String(focus)); }
    // Real full screen only from an actual click or key press; a palm dwell is not a user gesture for the browser.
    const activated = (navigator as Navigator & { userActivation?: { isActive: boolean } }).userActivation?.isActive;
    if (focus && activated && !document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
    if (!focus && document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    screenRevision++;
    requestAnimationFrame(refreshTargets);
  }
  let actionScope: string | null = null;
  const eligible = (id: string, button: HTMLButtonElement) =>
    (!actionScope || id.startsWith(actionScope)) && (!inspection || id.startsWith('view-') || !!actionScope) &&
    !button.disabled && button.isConnected && !button.closest('[hidden], [inert]') &&
    !!button.getClientRects().length && getComputedStyle(button).visibility !== 'hidden';
  function refreshTargets(): void {
    targets.length = 0;
    for (const entry of entries) {
      if (!eligible(entry.id, entry.element)) continue;
      const rect = entry.element.getBoundingClientRect();
      let left = Math.max(0, rect.left), top = Math.max(0, rect.top), right = Math.min(innerWidth, rect.right), bottom = Math.min(innerHeight, rect.bottom);
      // Scrollable dialogs/toolbars expose only the visible portion of each target.
      for (let parent = entry.element.parentElement; parent; parent = parent.parentElement) {
        const style = getComputedStyle(parent), bounds = parent.getBoundingClientRect();
        if (/auto|scroll|hidden|clip/.test(style.overflowX)) { left = Math.max(left, bounds.left); right = Math.min(right, bounds.right); }
        if (/auto|scroll|hidden|clip/.test(style.overflowY)) { top = Math.max(top, bounds.top); bottom = Math.min(bottom, bounds.bottom); }
      }
      if (right <= left || bottom <= top) continue;
      const slow = SESSION_ACTIONS.includes(entry.id) && (lastPhase === 'studio' || lastPhase === 'tutorial');
      targets.push({ id: entry.id, x: left, y: top, width: right - left, height: bottom - top, ...(slow ? { dwellMs: CONFIG.DWELL_CONFIRM_MS } : {}) });
    }
  }
  function addAction(id: string, label: string, run: () => void, parent: HTMLElement = actions): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'dwell-button'; button.textContent = label; button.dataset.action = id;
    button.insertAdjacentHTML('afterbegin', actionIcon(id));
    const guarded = () => {
      if (!eligible(id, button)) return;
      if (OVERFLOW_ACTIONS.includes(id)) setMore(false);
      run();
    };
    button.addEventListener('click', guarded);
    entries.push({ id, element: button, run: guarded }); parent.append(button);
    return button;
  }
  function setMore(open: boolean): void {
    page.dataset.more = String(open);
    entries.find(entry => entry.id === 'more')?.element.setAttribute('aria-expanded', String(open));
    screenRevision++; refreshTargets(); // the folded buttons appear or vanish as hand targets
  }
  const newSession = () => crypto.randomUUID();
  const back = () => dispatch({ type: 'backToMenu' });
  function buildActions(snapshot: EngineSnapshot, state: StartupState): void {
    actions.replaceChildren(); details.replaceChildren();
    for (let i = entries.length - 1; i >= 0; i--) if (!entries[i].element.isConnected) entries.splice(i, 1);
    targets.length = 0;
    dwelling = null; screenRevision++; contentRevision++;
    if (state.error || !state.cameraActive) return;
    if (snapshot.phase === 'menu') {
      addAction('tutorial', 'Научиться · урок', () => dispatch({ type: 'start', mode: 'tutorial', sessionId: newSession() }));
      addAction('commission', 'Создать вазу · по образцу', () => dispatch({ type: 'start', mode: 'commission', sessionId: newSession(), targetId: 'vase@1' }));
      addAction('free', 'Свободная форма', () => dispatch({ type: 'start', mode: 'free', sessionId: newSession() }));
      addAction('gallery', 'Моя полка', () => dispatch({ type: 'openGallery' }));
      const descriptions: Record<string, string> = { tutorial: 'От первого касания до готовой формы', commission: 'Повторите прозрачный силуэт', free: 'Ваш замысел. Ваши движения.', gallery: 'Сохранённые работы из вашей мастерской' };
      for (const entry of entries) {
        const name = document.createElement('strong'); name.textContent = entry.element.textContent;
        const note = document.createElement('small'); note.textContent = descriptions[entry.id];
        entry.element.replaceChildren(name, note);
        entry.element.insertAdjacentHTML('afterbegin', actionIcon(entry.id));
      }
    } else if (snapshot.phase === 'studio' || snapshot.phase === 'tutorial') {
      if (snapshot.phase === 'studio') addAction('done', 'Готово: к оформлению', () => dispatch({ type: 'finishShaping' }));
      addAction('restart', 'Начать сначала', () => dispatch({ type: 'restart', newSessionId: newSession() }));
      addAction('menu', 'В мастерскую', back);
    } else if (snapshot.phase === 'result') {
      addAction('menu', 'Новый сосуд', back);
      addAction('gallery', 'Моя полка', () => dispatch({ type: 'openGallery' }));
    } else if (snapshot.phase === 'glaze' || snapshot.phase === 'gallery') addAction('menu', 'В мастерскую', back);
    if (['studio', 'tutorial', 'glaze', 'result'].includes(snapshot.phase)) addAction('inspect', 'Осмотреть в 3D', onInspect);
    page.dataset.more = 'false';
    if (snapshot.phase === 'studio' || snapshot.phase === 'tutorial') addAction('more', 'Ещё', () => setMore(page.dataset.more !== 'true')).setAttribute('aria-expanded', 'false');
    if (snapshot.phase === 'studio' || snapshot.phase === 'tutorial') {
      // Rotate only: shaping pauses, a fist turns the vessel, "Вернуться к лепке" restores the shaping view.
      addAction('rotate', 'Вращать', onRotate);
      // Clay only: every control but this one steps aside; hints about the hands stay.
      const focusButton = addAction('focus', focus ? 'Показать кнопки' : 'Только глина', () => setFocus(!focus));
      focusButton.setAttribute('aria-pressed', String(focus));
    }
    if (!['loading', 'permission', 'calibrate', 'firing'].includes(snapshot.phase)) {
      const mute = addAction('mute', muted ? 'Звук выключен' : 'Звук включён', () => {
        muted = toggleMute(); mute.textContent = muted ? 'Звук выключен' : 'Звук включён';
      });
      mute.classList.add('sound-toggle');
      const camera = addAction('camera-preview', preview ? 'Приглушить камеру' : 'Показать камеру', () => {
        preview = !preview; page.dataset.preview = String(preview);
        camera.textContent = preview ? 'Приглушить камеру' : 'Показать камеру';
        camera.setAttribute('aria-pressed', String(preview));
      });
      camera.classList.add('camera-toggle'); camera.setAttribute('aria-pressed', String(preview));
    }
    applySculptingLock();
    refreshTargets();
  }
  function applySculptingLock(): void {
    for (const entry of entries) {
      if (!SESSION_ACTIONS.includes(entry.id) || (lastPhase !== 'studio' && lastPhase !== 'tutorial')) continue;
      entry.element.disabled = controlsLocked || (entry.id === 'done' && destroyed);
      entry.element.title = entry.element.disabled ? destroyed ? 'Сосуд повреждён. Начните сначала.' : 'Уберите руки от глины, чтобы выбрать действие.' : '';
    }
    page.dataset.sculpting = String(controlsLocked);
  }
  const layout = new ResizeObserver(refreshTargets);
  // Visibility transitions finish after the lock refresh. Register newly visible targets then.
  const transition = (event: TransitionEvent) => { if (event.propertyName === 'visibility' || event.propertyName === 'opacity') refreshTargets(); };
  page.addEventListener('transitionend', transition);
  layout.observe(content);
  window.addEventListener('resize', refreshTargets);
  // Capture nested panel scrolling too: hand regions must follow visible buttons.
  window.addEventListener('scroll', refreshTargets, { passive: true, capture: true });
  return {
    video, viewport, page, details, actions, addAction, refreshTargets,
    get controlsLocked() { return controlsLocked; },
    get actionScope() { return actionScope; },
    setActionScope(scope: string | null): void {
      actionScope = scope; page.dataset.actionScope = scope ?? ''; screenRevision++; refreshTargets();
    },
    removeActions(prefix: string): void {
      for (let i = entries.length - 1; i >= 0; i--) if (entries[i].id.startsWith(prefix)) { entries[i].element.remove(); entries.splice(i, 1); }
      screenRevision++; refreshTargets();
    },
    setInspection(active: boolean): void {
      inspection = active; page.dataset.inspecting = String(active); content.inert = active; header.inert = active;
      screenRevision++; refreshTargets();
    },
    get targets(): readonly DwellRegion[] { return targets; },
    get revision(): number { return screenRevision; },
    get contentRevision(): number { return contentRevision; },
    invalidateContent(): void { lastPhase = null; },
    setTutorialCompleted(completed: boolean): void {
      if (lastPhase !== 'tutorial' || lastError) return;
      if (title.textContent === (completed ? 'Обучение окончено' : phaseText.tutorial[0])) return;
      title.textContent = completed ? 'Обучение окончено' : phaseText.tutorial[0];
      description.textContent = completed ? 'Форма готова. Вернитесь в мастерскую, чтобы создать свой сосуд.' : phaseText.tutorial[1];
    },
    activate(id: string): void { entries.find((entry) => entry.id === id)?.run(); },
    showDwell(id: string | null, progress: number): void {
      const element = entries.find((entry) => entry.id === id)?.element ?? null;
      if (element !== dwelling) {
        dwelling?.classList.remove('is-dwelling'); dwelling?.style.setProperty('--dwell', '0%');
        dwelling = element; dwelling?.classList.add('is-dwelling'); lastDwell = -1;
      }
      if (dwelling && progress !== lastDwell) { dwelling.style.setProperty('--dwell', `${progress * 100}%`); lastDwell = progress; }
    },
    update(snapshot: EngineSnapshot, state: StartupState, nowMs: number): void {
      const nextLock = sculpting.update(snapshot, nowMs), nextDestroyed = snapshot.phase === 'studio' && isDestroyed(snapshot);
      if (nextLock !== controlsLocked || nextDestroyed !== destroyed) {
        controlsLocked = nextLock; destroyed = nextDestroyed;
        applySculptingLock(); screenRevision++; refreshTargets();
      }
      if (snapshot.phase !== lastPhase || snapshot.mode !== lastMode || state.busy !== lastBusy || state.cameraActive !== lastActive || state.error !== lastError) {
        lastPhase = snapshot.phase; lastMode = snapshot.mode; lastBusy = state.busy; lastActive = state.cameraActive; lastError = state.error;
        page.dataset.phase = snapshot.phase;
        if (focus && snapshot.phase !== 'studio' && snapshot.phase !== 'tutorial') setFocus(false);
        process.update(snapshot.phase === 'studio' ? 0 : snapshot.phase === 'glaze' ? 2 : snapshot.phase === 'firing' ? 3 : snapshot.phase === 'result' ? 4 : -1);
        page.classList.toggle('workshop--camera', state.cameraActive);
        page.classList.toggle('workshop--error', state.error !== null);
        start.hidden = state.cameraActive && !state.error;
        start.disabled = state.busy || (snapshot.phase === 'loading' && !state.error);
        progress.hidden = snapshot.phase !== 'calibrate' || !!state.error;
        art.hidden = state.cameraActive;
        if (state.error) {
          [title.textContent, description.textContent] = ru.errors[state.error];
          status.textContent = '';
        } else {
          [title.textContent, description.textContent] = phaseText[snapshot.phase];
          if (snapshot.phase === 'glaze') { title.textContent = 'Форма готова'; description.textContent = 'Добавьте детали по желанию, выберите глазурь и отправьте сосуд в печь.'; }
          if (snapshot.phase === 'studio') title.textContent = snapshot.mode === 'commission' ? 'Создаём вазу' : 'Свободная форма';
          // While loading, the description already says ru.loading; the status line only reports the camera request.
          status.textContent = state.busy ? ru.requesting : '';
        }
        footer.textContent = state.cameraActive ? ru.live : ru.footer;
        lastTracking = '';
        buildActions(snapshot, state);
      }
      if (!progress.hidden && progress.value !== snapshot.calibrationProgress) progress.value = snapshot.calibrationProgress;
      if (state.cameraActive && !state.error && snapshot.phase === 'calibrate') {
        const tracking = snapshot.input && nowMs - snapshot.input.tMs <= CONFIG.MAX_INPUT_AGE_MS ? snapshot.input.status : 'stale';
        if (tracking !== lastTracking) { status.textContent = ru.tracking[tracking]; lastTracking = tracking; }
      }
    },
    destroy(): void { layout.disconnect(); page.removeEventListener('transitionend', transition); window.removeEventListener('resize', refreshTargets); window.removeEventListener('scroll', refreshTargets, true); start.removeEventListener('click', onStart); page.remove(); },
  };
}
