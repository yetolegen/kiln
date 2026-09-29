import { createScreens, type StartupState } from './ui/screens';
import { CameraSession, cameraProblem, cameraProjection } from './browser/camera';
import { connectTracking, loadTracker } from './browser/tracking';
import { HandTracker, HandTrackerError } from './tracking/handTracker';
import { createController } from './engine/controller';
import { createSoundPlayer, unlockSound } from './audio/sound';
import { createVoicePlayer, unlockVoice } from './audio/voice';
import { createScene } from './render/scene';
import { createOverlay } from './render/overlay';
import { DwellController } from './ui/dwell';
import { createHud } from './ui/hud';
import { PresentationHint } from './ui/presentationHint';
import { createTutorial } from './ui/tutorial';
import { createFinishing } from './ui/finishing';
import { createKiln } from './render/kiln';
import type { AppPhase, CoreController, EngineSnapshot, ProjectionParams } from './types';
import './ui/styles.css';

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('KILN app root is missing.');

let core: CoreController = createController({ nowIso: () => new Date().toISOString() });
let mockMode = false;
let destroyMock: (() => void) | null = null;
if (import.meta.env.DEV && new URLSearchParams(location.search).get('dev') === '1' && new URLSearchParams(location.search).get('mock') === '1') {
  const { installMockCore } = await import('./dev/mockCore');
  const mock = installMockCore();
  core = mock.core;
  destroyMock = mock.destroy;
  mockMode = true;
}
const state: StartupState = { busy: false, cameraActive: false, error: null };
const sound = createSoundPlayer();
const voice = createVoicePlayer();
let muted = false;
const screens = createScreens(root, () => { void start(); }, (command) => core.dispatch(command, performance.now()), () => {
  muted = !muted; sound.setMuted(muted); voice.setMuted(muted); return muted;
});
const dwell = new DwellController();
const hud = createHud(screens.page);
const presentationHint = new PresentationHint();
const tutorial = createTutorial(screens.page, (command) => core.dispatch(command, performance.now()));
const scene = createScene(screens.viewport);
const kiln = createKiln(screens.viewport, scene.setSurface);
const finishing = createFinishing(screens, (command) => core.dispatch(command, performance.now()), scene.exportPng);
const overlay = createOverlay(screens.viewport);
const camera = new CameraSession(screens.video, () => failCamera('interrupted'));
let tracker: HandTracker | null = null;
let tracking: ReturnType<typeof connectTracking> | null = null;
let projection: ProjectionParams | null = null;
let revision = 0;
let disposed = false;
let modelLoading: Promise<void> | null = null;
let animation = 0;
let resizeFrame = 0;
let forceProjection = false;
let layoutPhase: AppPhase = 'loading';
let debug: { update(snapshot: EngineSnapshot, nowMs: number): void; destroy(): void } | null = null;

function failCamera(problem: NonNullable<StartupState['error']>): void {
  tracking?.pause(performance.now());
  camera.stop();
  state.cameraActive = false;
  state.error = problem;
}

function prepareModel(): Promise<void> {
  if (modelLoading) return modelLoading;
  const request = loadTracker(() => HandTracker.create()).then((loaded) => {
    if (disposed) { loaded.close(); return; }
    tracker = loaded;
    tracking = connectTracking(core, loaded, screens.video);
    core.dispatch({ type: 'modelReady' }, performance.now());
  }).catch((error: unknown) => {
    state.error = error instanceof HandTrackerError ? error.stage : 'model';
  }).finally(() => { modelLoading = null; });
  modelLoading = request;
  return request;
}

function project(force = false): void {
  if (!state.cameraActive || document.hidden || (!tracking && !mockMode)) return;
  const next = cameraProjection(mockMode ? { videoWidth: 1280, videoHeight: 720 } : screens.video, screens.viewport.getBoundingClientRect(), revision + 1, layoutPhase);
  if (!force && projection && next.viewportWidth === projection.viewportWidth && next.viewportHeight === projection.viewportHeight &&
      next.videoWidth === projection.videoWidth && next.videoHeight === projection.videoHeight) return;
  projection = next;
  revision = next.revision;
  scene.setProjection(next);
  overlay.setProjection(next);
  dwell.reset();
  screens.refreshTargets();
  if (mockMode) { core.resetInput(revision); core.updateProjection(next); }
  else tracking?.resume(next, performance.now());
}

async function start(): Promise<void> {
  if (state.busy || disposed) return;
  // Both unlock calls stay in the actual click, before any asynchronous work.
  unlockSound();
  unlockVoice();
  state.error = null;
  state.busy = true;
  try {
    if (!tracker) await prepareModel();
    if (!tracker || disposed) return;
    await camera.start();
    if (disposed) { camera.stop(); return; }
    state.cameraActive = true;
    project(true);
  } catch (error) {
    if (!disposed) failCamera(cameraProblem(error));
  } finally { state.busy = false; }
}

function resize(): void {
  if (resizeFrame) return;
  resizeFrame = requestAnimationFrame(() => {
    resizeFrame = 0;
    project(forceProjection);
    forceProjection = false;
  });
}
function orientation(): void { forceProjection = true; resize(); }
const observer = new ResizeObserver(resize);
observer.observe(screens.viewport);
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', orientation);
screens.video.addEventListener('resize', resize);

function visibility(): void {
  if (document.hidden) { sound.silence(); voice.stop(); }
  if (document.hidden) tracking?.pause(performance.now());
  else project(true);
}
document.addEventListener('visibilitychange', visibility);
function pageHide(): void {
  tracking?.pause(performance.now());
  camera.stop();
  if (state.cameraActive) state.error = 'interrupted';
  state.cameraActive = false;
}
window.addEventListener('pagehide', pageHide);

function render(nowMs: number): void {
  if (disposed) return;
  const snapshot = core.tick(nowMs);
  if (snapshot.phase !== layoutPhase) { layoutPhase = snapshot.phase; project(true); }
  screens.update(snapshot, state, nowMs);
  finishing.update(snapshot, state.cameraActive && !state.error);
  const activeHint = presentationHint.update(snapshot, nowMs);
  hud.update(snapshot, nowMs, activeHint);
  tutorial.update(snapshot, nowMs);
  sound.update(snapshot, !document.hidden && state.cameraActive);
  voice.update(document.hidden || !state.cameraActive ? null : activeHint);
  const selected = dwell.update(snapshot, nowMs, screens.targets, screens.revision);
  screens.showDwell(dwell.activeId, dwell.progress);
  if (selected) screens.activate(selected);
  kiln.update(snapshot, nowMs);
  scene.render(snapshot, nowMs);
  overlay.render(snapshot, nowMs, dwell.progress);
  debug?.update(snapshot, nowMs);
  animation = requestAnimationFrame(render);
}
animation = requestAnimationFrame(render);
if (mockMode) { state.cameraActive = true; project(true); }
else void prepareModel();

if (import.meta.env.DEV && new URLSearchParams(location.search).get('dev') === '1' && !mockMode) {
  void import('./dev/debug').then(({ createDebugPanel }) => { if (!disposed) debug = createDebugPanel(); });
}

function dispose(): void {
  disposed = true;
  pageHide();
  tracker?.close();
  debug?.destroy();
  scene.dispose();
  kiln.destroy();
  overlay.dispose();
  hud.destroy();
  tutorial.destroy();
  sound.destroy();
  voice.destroy();
  destroyMock?.();
  observer.disconnect();
  cancelAnimationFrame(animation);
  cancelAnimationFrame(resizeFrame);
  window.removeEventListener('resize', resize);
  window.removeEventListener('orientationchange', orientation);
  window.removeEventListener('pagehide', pageHide);
  document.removeEventListener('visibilitychange', visibility);
  screens.video.removeEventListener('resize', resize);
  screens.destroy();
}
if (import.meta.hot) import.meta.hot.dispose(dispose);
