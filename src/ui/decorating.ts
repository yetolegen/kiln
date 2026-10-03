import { CONFIG } from '../config';
import type { CoreController, EngineSnapshot } from '../types';
import { anchorOnBody, emptyCustomization, readCustomization, type Attachment, type AttachmentKind, type Customization, type Stamp, type StampKind } from '../engine/customization';
import { GLAZES } from '../engine/materials';
import type { createScene } from '../render/scene';
import type { createScreens } from './screens';
import type { DwellController } from './dwell';
import { HandOrbit } from './handOrbit';
import { createProcess } from './process';

type Tool = 'inspect' | 'place' | 'editAttachment' | 'stamp';
export function createDecorating(screens: ReturnType<typeof createScreens>, scene: ReturnType<typeof createScene>, core: CoreController, dwell: DwellController, onExit: () => void) {
  const layer = document.createElement('section'); layer.className = 'decoration-editor'; layer.hidden = true;
  const surface = document.createElement('div'); surface.className = 'inspection__surface';
  const header = document.createElement('header'); header.className = 'inspection__header';
  const process = createProcess(); process.update(1);
  const title = document.createElement('h2'), help = document.createElement('p'); help.setAttribute('role', 'status'); header.append(process.element, title, help);
  const actions = document.createElement('nav'); actions.className = 'inspection__actions';
  layer.append(surface, header, actions); screens.page.append(layer);
  const orbit = new HandOrbit(); let active = false, tool: Tool = 'inspect', contentRevision = -1;
  let draft: Attachment | Stamp | null = null, originalId: string | null = null, placed = false;
  let data: Customization = emptyCustomization(), snapshot: EngineSnapshot | null = null;
  let lastFrame = -1, lastEpoch = -1, issue = '', editMistakes = 0;
  const label = (value: Attachment | Stamp) => ({ sphere: 'Комок', cylinder: 'Цилиндр', cone: 'Шип', star: 'Звезда', dots: 'Точки', wave: 'Волна' })[value.kind];
  function boundary() { orbit.reset(); dwell.requireRelease(); lastFrame = -1; lastEpoch = -1; }
  function warn(message: string) { help.textContent = message; if (issue !== message) editMistakes++; issue = message; }
  function toolbar(mode = 'home') { screens.removeActions('decor-'); actions.replaceChildren(); layer.dataset.panel = mode; boundary(); }
  function button(id: string, text: string, run: () => void) { return screens.addAction(`decor-${id}`, text, run, actions); }
  let previewVisible = false;
  function clearPreview() { if (previewVisible) scene.previewDecoration(null); previewVisible = false; }
  function preview() { scene.previewDecoration(draft); previewVisible = !!draft; }
  function cancel() { draft = null; originalId = null; placed = false; clearPreview(); home(); }
  function home() {
    tool = 'inspect'; toolbar(); title.textContent = 'Оформление · вращение';
    help.textContent = 'Раскройте пальцы, затем зажмите щипок и ведите руку, чтобы осмотреть сосуд. Глина больше не деформируется.';
    button('add', 'Добавить деталь', () => choose(false)); button('stamp', 'Добавить штамп', () => choose(true));
    button('list', `Мои детали и штампы · ${data.attachments.length + data.stamps.length}`, () => list(0));
    button('closer', '+ Приблизить', () => scene.inspectionView('closer')); button('farther', '− Отдалить', () => scene.inspectionView('farther'));
    button('reset', 'Сбросить вид', () => { scene.inspectionView('reset'); boundary(); });
    button('close', 'К глазури и обжигу', close); screens.refreshTargets();
  }
  function choose(stamp: boolean) {
    toolbar('choose'); title.textContent = stamp ? 'Выберите рисунок' : 'Выберите объёмную деталь';
    help.textContent = stamp ? 'Штамп — рисунок на внешней стенке. Не отверстие и не гравировка. До 8 штампов.' : 'Накладная деталь из глины. До 6 деталей. После установки можно изменить размер и наклон.';
    const kinds = stamp ? ['star', 'dots', 'wave'] as const : ['sphere', 'cylinder', 'cone'] as const;
    for (const kind of kinds) {
      const b = button(kind, ({ sphere: 'Овальный комок', cylinder: 'Цилиндр', cone: 'Шип', star: 'Звезда', dots: 'Точки', wave: 'Волна' })[kind], () => {
        const anchor = { point: { x: 0, y: .5, z: 1 }, normal: { x: 0, y: 0, z: 1 } };
        draft = stamp ? { id: crypto.randomUUID(), kind: kind as StampKind, anchor, size: .28, rotation: 0, color: 'chalk' } :
          { id: crypto.randomUUID(), kind: kind as AttachmentKind, anchor, length: .3, width: .22, rotation: 0, tilt: 0, material: 'amber' };
        originalId = null; placed = false; place();
      });
      b.disabled = stamp ? data.stamps.length >= 8 : data.attachments.length >= 6;
    }
    button('cancel', 'Назад', home); screens.refreshTargets();
  }
  function place() {
    if (!draft) return; tool = 'length' in draft ? 'place' : 'stamp'; placed = false; toolbar('place');
    title.textContent = `${label(draft)} · размещение`;
    help.textContent = `Наведите указательный палец на внешнюю стенку${'length' in draft ? ' или ободок' : ''}. Когда деталь станет зелёной, задержите щипок. Затем разомкните пальцы и выберите «Применить».`;
    button('cancel', 'Отмена', cancel); screens.refreshTargets();
  }
  const angle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
  function change(key: 'length' | 'width' | 'size' | 'rotation' | 'tilt', delta: number) {
    if (!draft || !snapshot?.clay) return;
    const next = { ...draft, [key]: key === 'rotation' ? angle(draft.rotation + delta) : Math.round(((draft as unknown as Record<string, number>)[key] + delta) * 1000) / 1000 } as Attachment | Stamp;
    const c = { ...emptyCustomization(), ...('length' in next ? { attachments: [next] } : { stamps: [next] }) };
    if (!readCustomization(c)) { warn('size' in next ? 'Размер штампа должен быть от 0,08 до 0,45. Верните размер в эти границы.' : 'Слишком длинная или тонкая деталь. Допустимы длина 0,08–0,8, ширина 0,08–0,45 и отношение сторон до 4:1. Уменьшите размер или наклон.'); return; }
    if (!anchorOnBody(next.anchor, snapshot.clay, 'size' in next ? next.size : 0)) { warn('Штамп пересекает край или дно. Уменьшите его либо переместите к середине стенки.'); return; }
    draft = next; issue = ''; preview(); edit();
  }
  function edit() {
    if (!draft) return; tool = 'editAttachment'; toolbar('edit'); title.textContent = `${label(draft)} · изменение`;
    help.textContent = 'Деталь выбрана. Настройте её кнопками и выберите «Применить». «Отмена» сохранит прежний вариант.';
    if ('length' in draft) {
      button('shorter', 'Длина −', () => change('length', -.04)); button('longer', 'Длина +', () => change('length', .04));
      button('narrower', 'Ширина −', () => change('width', -.04)); button('wider', 'Ширина +', () => change('width', .04));
      button('tilt-left', 'Наклон −', () => change('tilt', -.15)); button('tilt-right', 'Наклон +', () => change('tilt', .15));
    } else {
      button('smaller', 'Размер −', () => change('size', -.04)); button('larger', 'Размер +', () => change('size', .04));
      button('color', `Цвет: ${GLAZES.find(g => g.id === (draft as Stamp).color)?.name}`, () => {
        if (!draft || !('color' in draft)) return; draft.color = GLAZES[(GLAZES.findIndex(g => g.id === (draft as Stamp).color) + 1) % GLAZES.length].id; preview(); edit();
      });
    }
    button('turn-left', 'Повернуть −', () => change('rotation', -Math.PI / 12)); button('turn-right', 'Повернуть +', () => change('rotation', Math.PI / 12));
    button('move', 'Переместить', place); button('apply', 'Применить', apply); button('cancel', 'Отмена', cancel);
    if (originalId) button('delete', 'Удалить выбранное', () => { commit({ ...data, attachments: data.attachments.filter(a => a.id !== originalId), stamps: data.stamps.filter(s => s.id !== originalId) }); cancel(); });
    screens.refreshTargets();
  }
  function commit(next: Customization) {
    next = { ...next, editMistakes: data.editMistakes + editMistakes }; editMistakes = 0;
    core.dispatch({ type: 'customize', value: next }, performance.now()); data = core.tick(performance.now()).customization ?? data;
  }
  function apply() {
    if (!draft || !placed || !snapshot?.clay || !anchorOnBody(draft.anchor, snapshot.clay, 'size' in draft ? draft.size : 0)) { warn('Сначала установите деталь на внешней стенке сосуда.'); return; }
    const next = structuredClone(data);
    if ('length' in draft) next.attachments = [...next.attachments.filter(a => a.id !== originalId), draft];
    else next.stamps = [...next.stamps.filter(s => s.id !== originalId), draft];
    commit(next); cancel();
  }
  function list(page: number) {
    toolbar('list'); title.textContent = 'Мои детали и штампы'; help.textContent = 'Выберите элемент. Изменения сохранятся только после «Применить».';
    const items = [...data.attachments, ...data.stamps];
    items.slice(page * 3, page * 3 + 3).forEach((value, i) => button(`select-${i}`, `${page * 3 + i + 1}. ${label(value)}`, () => { draft = structuredClone(value); originalId = value.id; placed = true; preview(); edit(); }));
    const back = button('previous', '← Назад', () => list(page - 1)); back.disabled = page === 0;
    const next = button('next', 'Дальше →', () => list(page + 1)); next.disabled = (page + 1) * 3 >= items.length;
    button('cancel', 'К оформлению', home); screens.refreshTargets();
  }
  function close() {
    if (!active) return; if (editMistakes) commit(data); active = false; layer.hidden = true; draft = null; clearPreview();
    screens.removeActions('decor-'); screens.setActionScope(null); scene.setInspection(false); screens.setInspection(false);
    core.setPaused(false, performance.now()); boundary(); onExit();
  }
  const reset = () => { boundary(); if (active && (tool === 'place' || tool === 'stamp')) clearPreview(); };
  window.addEventListener('resize', reset); document.addEventListener('visibilitychange', reset);
  surface.addEventListener('pointerdown', reset);
  return {
    get active() { return active; }, get usingHands() { return active && orbit.state !== 'idle'; },
    enter() {
      snapshot = core.tick(performance.now()); if (snapshot.phase !== 'glaze' || !scene.supportsInspection) return;
      active = true; data = snapshot.customization ?? emptyCustomization(); layer.hidden = false;
      core.setPaused(true, performance.now()); screens.setInspection(true); screens.setActionScope('decor-'); scene.setInspection(true, surface); home();
    },
    update(next: EngineSnapshot) {
      snapshot = next;
      if (contentRevision !== screens.contentRevision) {
        contentRevision = screens.contentRevision;
        if (next.phase === 'glaze') {
          const button = screens.addAction('decoration', 'Детали и штампы', () => this.enter());
          button.disabled = !scene.supportsInspection; button.title = button.disabled ? 'Размещение требует WebGL. Форма и сохранённое оформление не потеряны.' : '';
        }
        screens.refreshTargets();
      }
      if (!active) return;
      if (next.phase !== 'glaze') { close(); return; }
      if (screens.actionScope !== 'decor-') { orbit.reset(); scene.setPointerOrbit(false); return; }
      data = next.customization ?? data;
      if (!scene.supportsInspection) {
        help.textContent = '3D недоступно. Оформление сохранено. Вернитесь к глазури; для размещения нужен WebGL.'; clearPreview(); orbit.reset();
        for (const button of actions.querySelectorAll<HTMLButtonElement>('button')) if (!['decor-close', 'decor-cancel'].includes(button.dataset.action!)) button.disabled = true;
        screens.refreshTargets(); return;
      }
      const input = next.input, rect = scene.canvas.getBoundingClientRect();
      const delta = orbit.update(document.hidden ? null : input, performance.now(), screens.targets, rect.width, rect.height);
      layer.dataset.grab = orbit.state; layer.dataset.tool = tool;
      scene.setPointerOrbit(tool === 'inspect' && orbit.state === 'idle');
      if (tool === 'inspect') { if (delta) scene.rotateInspection(delta.x, delta.y); return; }
      if (tool !== 'place' && tool !== 'stamp') return;
      if (!input || !['ready', 'oneHand'].includes(input.status) || performance.now() - input.tMs > CONFIG.MAX_INPUT_AGE_MS) { clearPreview(); help.textContent = 'Отслеживание потеряно. Покажите руку, раскройте пальцы и начните новый захват.'; return; }
      if (input.epoch !== lastEpoch) { lastEpoch = input.epoch; lastFrame = -1; }
      if (input.frameId === lastFrame) return; lastFrame = input.frameId;
      const hands = [input.screenLeft, input.screenRight].filter(h => h !== null);
      const h = orbit.activeTrackId !== null ? hands.find(h => h.trackId === orbit.activeTrackId) : hands.find(h => scene.pickSurface(h.indexTipPx));
      if (!h || !draft || !next.clay) { clearPreview(); return; }
      const hit = scene.pickSurface(h.indexTipPx);
      if (!hit || !anchorOnBody(hit, next.clay, 'size' in draft ? draft.size : 0)) { clearPreview(); help.textContent = 'Наведите палец на видимую внешнюю стенку, дальше от края и дна. Внутри сосуда и на круге разместить нельзя.'; return; }
      const changed = Math.hypot(hit.point.x - draft.anchor.point.x, hit.point.y - draft.anchor.point.y, hit.point.z - draft.anchor.point.z) > .002;
      draft = { ...draft, anchor: hit }; if (changed || !previewVisible) preview();
      help.textContent = 'Место подходит. Соедините большой и указательный и задержите щипок, чтобы закрепить деталь.';
      if (!orbit.canGrab(h.trackId) && orbit.state === 'idle') help.textContent = 'Разомкните большой и указательный пальцы, затем снова соедините их. После паузы отслеживания нужен новый захват.';
      if (orbit.state === 'dragging') { placed = true; preview(); edit(); }
    },
    close,
    destroy() { close(); window.removeEventListener('resize', reset); document.removeEventListener('visibilitychange', reset); surface.removeEventListener('pointerdown', reset); layer.remove(); },
  };
}
