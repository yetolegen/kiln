import { ru, type StartupProblem } from '../i18n';
import type { EngineSnapshot } from '../types';
import { CONFIG } from '../config';

export interface StartupState {
  busy: boolean;
  cameraActive: boolean;
  error: StartupProblem | null;
}

export function createScreens(root: HTMLElement, onStart: () => void) {
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

  const content = document.createElement('section');
  content.className = 'workshop__content';
  const mark = document.createElement('img');
  mark.src = '/favicon.svg';
  mark.alt = '';
  mark.width = 88;
  mark.height = 88;
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
  start.addEventListener('click', onStart);
  const progress = document.createElement('progress');
  progress.max = 1;
  progress.value = 0;
  progress.setAttribute('aria-label', 'Настройка рук');
  progress.hidden = true;
  content.append(mark, title, description, status, progress, start);

  const footer = document.createElement('footer');
  footer.textContent = ru.footer;
  page.append(viewport, header, content, footer);
  root.replaceChildren(page);
  let lastView = '';
  let lastTracking = '';
  return {
    video, viewport,
    update(snapshot: EngineSnapshot, state: StartupState, nowMs: number): void {
      const view = `${snapshot.phase}/${state.busy}/${state.cameraActive}/${state.error}`;
      if (view !== lastView) {
        lastView = view;
        page.dataset.phase = snapshot.phase;
        page.classList.toggle('workshop--camera', state.cameraActive);
        page.classList.toggle('workshop--error', state.error !== null);
        start.hidden = state.cameraActive && !state.error;
        start.disabled = state.busy || (snapshot.phase === 'loading' && !state.error);
        progress.hidden = snapshot.phase !== 'calibrate' || !!state.error;
        mark.hidden = state.cameraActive;
        if (state.error) {
          [title.textContent, description.textContent] = ru.errors[state.error];
          status.textContent = '';
        } else {
          title.textContent = snapshot.phase === 'calibrate' ? ru.calibrateTitle : snapshot.phase === 'menu' ? ru.readyTitle : ru.title;
          description.textContent = snapshot.phase === 'calibrate' ? ru.calibrateText : snapshot.phase === 'menu' ? ru.readyText : ru.permission;
          status.textContent = state.busy ? ru.requesting : snapshot.phase === 'loading' ? ru.loading : '';
        }
        footer.textContent = state.cameraActive ? ru.live : ru.footer;
        lastTracking = '';
      }
      if (!progress.hidden && progress.value !== snapshot.calibrationProgress) progress.value = snapshot.calibrationProgress;
      if (state.cameraActive && !state.error) {
        const tracking = snapshot.input && nowMs - snapshot.input.tMs <= CONFIG.MAX_INPUT_AGE_MS ? snapshot.input.status : 'stale';
        if (tracking !== lastTracking) { status.textContent = ru.tracking[tracking]; lastTracking = tracking; }
      }
    },
    destroy(): void { start.removeEventListener('click', onStart); page.remove(); },
  };
}
