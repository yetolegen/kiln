import { decodeShare } from '../browser/shareCodec';
import { createScene } from '../render/scene';
import { createScreens } from './screens';
import { createController } from '../engine/controller';
import { DwellController } from './dwell';
import { HandOrbit } from './handOrbit';
import { CameraSession, cameraProjection } from '../browser/camera';
import { createOverlay } from '../render/overlay';
import type { EngineSnapshot } from '../types';
import type { HandTracker } from '../tracking/handTracker';
import type { connectTracking } from '../browser/tracking';
import { glazeColor } from '../engine/materials';
import type { DisplayArtifact } from '../engine/artifact';

/** Hash route bootstraps without importing MediaPipe, opening a camera, or fabricating session statistics. */
export async function createPublicViewer(root: HTMLElement, hash: string) {
  const goWorkshop = () => { location.href = location.pathname; };
  let artifact: DisplayArtifact;
  try { artifact = await decodeShare(hash); }
  catch {
    const main = document.createElement('main'); main.className = 'share-error';
    const h = document.createElement('h1'); h.textContent = 'Не удалось открыть сосуд';
    const p = document.createElement('p'); p.textContent = 'Ссылка повреждена, слишком велика или создана неизвестной версией KILN. Камера не включалась.';
    const button = document.createElement('button'); button.className = 'start-button'; button.textContent = 'В мастерскую'; button.onclick = goWorkshop;
    main.append(h, p, button); root.replaceChildren(main); return () => main.remove();
  }
  const core = createController(), dwell = new DwellController(), orbit = new HandOrbit();
  const screens = createScreens(root, () => {}, () => {}, () => false);
  screens.page.dataset.viewer = 'true';
  screens.setInspection(true); screens.setActionScope('public-');
  const scene = createScene(screens.viewport), overlay = createOverlay(screens.viewport, screens.page);
  const layer = document.createElement('section'); layer.className = 'public-viewer';
  const surface = document.createElement('div'); surface.className = 'inspection__surface';
  const header = document.createElement('header'); header.className = 'inspection__header';
  const title = document.createElement('h2'); title.textContent = 'KILN · сосуд по ссылке';
  const help = document.createElement('p'); help.textContent = 'Только просмотр · вращайте мышью или касанием. Камера выключена. Изделие не добавляется на вашу полку.';
  const mode = document.createElement('span'); mode.className = 'inspection__mode'; mode.textContent = 'Коллекция KILN · только просмотр';
  header.append(mode, title, help);
  const actions = document.createElement('nav'); actions.className = 'inspection__actions';
  layer.append(surface, header, actions); screens.page.append(layer);
  let tracker: HandTracker | null = null, tracking: ReturnType<typeof connectTracking> | null = null;
  let disposed = false, animation = 0, revision = 0;
  const camera = new CameraSession(screens.video, () => { tracking?.pause(performance.now()); orbit.reset(); hands.disabled = false; hands.textContent = 'Повторить камеру'; help.textContent = 'Камера прервалась. Просмотр мышью и касанием доступен.'; screens.refreshTargets(); });
  function display(now: number): EngineSnapshot {
    return { ...core.tick(now), phase: 'gallery', mode: null, clay: artifact.clay, customization: artifact.customization,
      stats: null, result: null, target: null, glazeId: artifact.glazeId, gesture: null, hint: null, events: [], activeIssues: [] };
  }
  function project() {
    const rect = screens.viewport.getBoundingClientRect();
    const projection = cameraProjection(screens.video.videoWidth ? screens.video : { videoWidth: 1280, videoHeight: 720 }, rect, ++revision, 'gallery');
    scene.setProjection(projection); overlay.setProjection(projection); orbit.reset(); dwell.requireRelease();
    if (tracking) { tracking.resume(projection, performance.now()); core.setPaused(true, performance.now()); }
    screens.refreshTargets();
  }
  const hands = screens.addAction('public-hands', 'Включить управление руками', () => { void enableHands(); }, actions);
  async function enableHands() {
    hands.disabled = true; help.textContent = 'Загрузка распознавания. Разрешите камеру, чтобы вращать сосуд щипком.'; screens.refreshTargets();
    try {
      if (!tracker) {
        const { HandTracker } = await import('../tracking/handTracker');
        tracker = await HandTracker.create(); if (disposed) { tracker.close(); return; }
      }
      await camera.start(); if (disposed) { camera.stop(); return; }
      const { connectTracking } = await import('../browser/tracking'); tracking = connectTracking(core, tracker, screens.video);
      project(); hands.textContent = 'Камера включена';
      help.textContent = 'Раскройте пальцы, затем зажмите щипок вдали от кнопок и ведите руку для вращения. Разомкните щипок, чтобы отпустить.';
    } catch { help.textContent = 'Камера недоступна. Вращение мышью и касанием работает; можно повторить разрешение камеры.'; hands.disabled = false; }
    screens.refreshTargets();
  }
  for (const [id, text] of [['closer', '+'], ['farther', '−'], ['top', 'Сверху'], ['bottom', 'Снизу'], ['reset', 'Сбросить вид']]) {
    const button = screens.addAction(`public-${id}`, text, () => { orbit.reset(); scene.inspectionView(id); }, actions);
    button.setAttribute('aria-label', id === 'closer' ? 'Приблизить' : id === 'farther' ? 'Отдалить' : text);
  }
  screens.addAction('public-workshop', 'Создать свой сосуд', goWorkshop, actions);
  scene.setArtifact(artifact); scene.setSurface(glazeColor(artifact.glazeId), 1, 0); project(); scene.render(display(performance.now()), performance.now()); scene.setInspection(true, surface);
  screens.refreshTargets();
  const resize = () => project(); const visibility = () => { orbit.reset(); dwell.requireRelease(); if (document.hidden) tracking?.pause(performance.now()); else project(); };
  surface.addEventListener('pointerdown', () => { orbit.reset(); dwell.requireRelease(); scene.setPointerOrbit(true); });
  window.addEventListener('resize', resize); document.addEventListener('visibilitychange', visibility);
  function render() {
    if (disposed) return; const now = performance.now(), snapshot = display(now), rect = scene.canvas.getBoundingClientRect();
    const delta = orbit.update(document.hidden ? null : snapshot.input, now, screens.targets, rect.width, rect.height);
    if (delta) scene.rotateInspection(delta.x, delta.y);
    scene.setPointerOrbit(orbit.state === 'idle');
    if (orbit.state !== 'idle') dwell.reset();
    const selected = orbit.state === 'idle' ? dwell.update(snapshot, now, screens.targets, screens.revision) : null;
    screens.showDwell(dwell.activeId, dwell.progress); if (selected) screens.activate(selected);
    scene.render(snapshot, now); overlay.render(snapshot, now, dwell.progress, dwell.cursorPx);
    if (!scene.supportsInspection) {
      help.textContent = '3D недоступно. Сохранён плоский силуэт; детали и штампы в этом режиме не отображаются. Изделие в ссылке не изменилось.';
      for (const button of actions.querySelectorAll<HTMLButtonElement>('button')) if (!['public-workshop', 'public-hands'].includes(button.dataset.action!)) button.disabled = true;
      screens.refreshTargets();
    }
    animation = requestAnimationFrame(render);
  }
  animation = requestAnimationFrame(render);
  return () => { disposed = true; cancelAnimationFrame(animation); tracking?.pause(performance.now()); camera.stop(); tracker?.close(); scene.dispose(); overlay.dispose(); screens.destroy(); window.removeEventListener('resize', resize); document.removeEventListener('visibilitychange', visibility); };
}
