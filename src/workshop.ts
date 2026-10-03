import { createScreens, type StartupState } from './ui/screens';
import { CameraSession, cameraProblem, cameraProjection } from './browser/camera';
import { connectTracking, loadTracker } from './browser/tracking';
import type { HandTracker } from './tracking/handTracker';
import { createController } from './engine/controller';
import { createSoundPlayer, unlockSound } from './audio/sound';
import { createScene } from './render/scene';
import { createOverlay } from './render/overlay';
import { DwellController } from './ui/dwell';
import { createHud } from './ui/hud';
import { PresentationHint } from './ui/presentationHint';
import { LessonHints } from './ui/lessonHints';
import { createTutorial } from './ui/tutorial';
import { createFinishing } from './ui/finishing';
import { createKiln } from './render/kiln';
import { createInspection } from './ui/inspection';
import { createModal } from './ui/modal';
import { createRecovery } from './ui/recovery';
import { createDecorating } from './ui/decorating';
import { createSharing } from './ui/sharing';
import { createToolLessons } from './ui/toolLessons';
import type { AppPhase, CoreController, EngineSnapshot, ProjectionParams } from './types';
import './ui/styles.css';
import './ui/workshopTheme.css';
import './ui/atelierTheme.css';
import './ui/final.css';
import './ui/paper.css';
import './ui/studio.css';

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
let muted = false;
const screens = createScreens(root, () => { void start(); }, (command) => core.dispatch(command, performance.now()), () => {
  muted = !muted; sound.setMuted(muted); return muted;
}, () => inspection.enter());
const dwell = new DwellController();
const sharing = createSharing(screens, dwell);
const modal = createModal(screens, core, dwell);
const recovery = createRecovery(screens, core, modal, dwell);
const hud = createHud(screens.page, screens.refreshTargets);
const presentationHint = new PresentationHint();
const lessonHints = new LessonHints();
const tutorial = createTutorial(screens.page, (command) => core.dispatch(command, performance.now()),
  (parent) => screens.addAction('lesson-retry', 'Попробовать снова · с первого шага', () => core.dispatch({ type: 'restart', newSessionId: crypto.randomUUID() }, performance.now()), parent), screens.refreshTargets);
const scene = createScene(screens.viewport);
const inspection = createInspection(screens, scene, core, () => { dwell.requireRelease(); project(true); }, () => dwell.requireRelease(), result => { void sharing.open(result); });
const decorating = createDecorating(screens, scene, core, dwell, () => project(true));
const kiln = createKiln(screens.viewport, scene.setSurface);
const finishing = createFinishing(screens, (command) => core.dispatch(command, performance.now()), scene.exportPng, (result) => inspection.enter(result), result => { void sharing.open(result); });
const toolLessons = createToolLessons(screens, core, modal, recovery, finishing, inspection, sharing, () => decorating.close(), () => decorating.enter(true));
const overlay = createOverlay(screens.viewport, screens.page);
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
  let failedStage: 'wasm' | 'model' = 'model';
  const request = loadTracker(async () => {
    const { HandTracker, HandTrackerError } = await import('./tracking/handTracker');
    try { return await HandTracker.create(); }
    catch (error) { if (error instanceof HandTrackerError) failedStage = error.stage; throw error; }
  }).then((loaded) => {
    if (disposed) { loaded.close(); return; }
    tracker = loaded;
    tracking = connectTracking(core, loaded, screens.video);
    core.dispatch({ type: 'modelReady' }, performance.now());
  }).catch(() => {
    state.error = failedStage;
  }).finally(() => { modelLoading = null; });
  modelLoading = request;
  return request;
}

function project(force = false): void {
  if (!state.cameraActive || document.hidden || (!tracking && !mockMode)) return;
  const next = cameraProjection(mockMode ? { videoWidth: 1280, videoHeight: 720 } : screens.video, screens.viewport.getBoundingClientRect(), revision + 1, layoutPhase);
  if (!force && projection && next.viewportWidth === projection.viewportWidth && next.viewportHeight === projection.viewportHeight &&
      next.videoWidth === projection.videoWidth && next.videoHeight === projection.videoHeight && next.axisXPx === projection.axisXPx &&
      next.bottomYPx === projection.bottomYPx && next.pixelsPerWorldUnit === projection.pixelsPerWorldUnit) return;
  projection = next;
  revision = next.revision;
  scene.setProjection(next);
  overlay.setProjection(next);
  dwell.reset();
  screens.refreshTargets();
  if (mockMode) { core.resetInput(revision); core.updateProjection(next); }
  else tracking?.resume(next, performance.now());
  if (inspection.active || decorating.active || modal.active) core.setPaused(true, performance.now());
}

async function start(): Promise<void> {
  if (state.busy || disposed) return;
  // The unlock call stays in the actual click, before any asynchronous work.
  unlockSound();
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
  if (document.hidden) sound.silence();
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

function render(): void {
  if (disposed) return;
  // Camera callbacks may run after the frame timestamp but before this callback.
  const nowMs = performance.now();
  const snapshot = core.tick(nowMs);
  if (snapshot.phase !== layoutPhase) { layoutPhase = snapshot.phase; project(); }
  screens.update(snapshot, state, nowMs);
  inspection.update(snapshot, state.cameraActive && !state.error);
  finishing.update(snapshot, state.cameraActive && !state.error);
  decorating.update(snapshot);
  const lessonHint = inspection.active || modal.active ? null : tutorial.update(snapshot, nowMs);
  recovery.update(snapshot, tutorial.status === 'completed');
  toolLessons.update(snapshot);
  screens.setTutorialCompleted(tutorial.status === 'completed');
  const coreHint = lessonHints.update(snapshot, tutorial.goal?.step ?? null, presentationHint.update(snapshot, nowMs));
  const activeHint = snapshot.phase === 'tutorial' && tutorial.status === 'completed' ? lessonHint :
    lessonHint?.severity === 'error' && coreHint?.id !== 'trackingUncertain' ? lessonHint : coreHint ?? lessonHint;
  hud.update(snapshot, nowMs, activeHint);
  sound.update(snapshot, !document.hidden && state.cameraActive && !inspection.active);
  if (inspection.usingHands || decorating.usingHands) dwell.reset();
  const selected = inspection.usingHands || decorating.usingHands ? null : dwell.update(snapshot, nowMs, screens.targets, screens.revision);
  screens.showDwell(dwell.activeId, dwell.progress);
  if (selected) screens.activate(selected);
  kiln.update(snapshot, nowMs);
  scene.render(snapshot, nowMs);
  overlay.render(snapshot, nowMs, dwell.progress, dwell.cursorPx, tutorial.goal, tutorial.status);
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
  recovery.destroy(); modal.destroy();
  sharing.destroy();
  toolLessons.destroy();
  decorating.destroy();
  inspection.destroy();
  scene.dispose();
  kiln.destroy();
  overlay.dispose();
  hud.destroy();
  tutorial.destroy();
  sound.destroy();
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
