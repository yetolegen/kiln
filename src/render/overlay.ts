import { CONFIG } from '../config';
import type { EngineSnapshot, ProjectionParams, Vec2 } from '../types';
import type { LessonGoal, LessonShape } from '../ui/tutorialGeometry';
import { LESSON_FINISH_STEP } from '../ui/tutorialGeometry';
import { HandVisuals } from './handVisuals';
import { drawCavitySection } from './cavitySection';
import { drawHandGlove } from './handGlove';

/** Guide labels sit on paper, clay or the camera preview: a paper-coloured halo keeps them legible on all three. */
function haloText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number): void {
  ctx.save(); ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.strokeStyle = '#f8f7f4e6'; ctx.setLineDash([]); ctx.strokeText(text, x, y); ctx.restore();
  ctx.fillText(text, x, y);
}

export function createOverlay(parent: HTMLElement, cursorParent: HTMLElement = parent) {
  const canvas = document.createElement('canvas');
  canvas.className = 'overlay-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  parent.append(canvas);
  const pointer = document.createElement('div');
  pointer.className = 'hand-cursor'; pointer.hidden = true; pointer.setAttribute('aria-hidden', 'true');
  pointer.innerHTML = '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="none" stroke="#211d19" stroke-width="7"/><circle cx="24" cy="24" r="20" fill="none" stroke="#fff5db" stroke-width="2"/><circle class="hand-cursor__progress" cx="24" cy="24" r="20" fill="none" stroke="#ffe0a2" stroke-width="4" stroke-dasharray="126" stroke-dashoffset="126" transform="rotate(-90 24 24)"/><circle cx="24" cy="24" r="5" fill="#fff5db" stroke="#211d19" stroke-width="2"/></svg>';
  const pointerProgress = pointer.querySelector('.hand-cursor__progress')!;
  cursorParent.append(pointer);
  const ctx = canvas.getContext('2d');
  let width = 0, height = 0, dpr = 1;
  let projection: ProjectionParams | null = null;
  const visuals = new HandVisuals();
  let lastAction = '', flashUntil = 0;
  const skeleton = import.meta.env.DEV && new URLSearchParams(location.search).get('skeleton') === '1';
  return {
    setProjection(p: ProjectionParams): void {
      projection = p;
      visuals.reset();
      width = p.viewportWidth; height = p.viewportHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    },
    render(snapshot: EngineSnapshot, nowMs: number, dwellProgress = 0, uiCursor: Vec2 | null = null, goal: LessonGoal | null = null, lessonStatus = 'working'): void {
      pointer.hidden = true;
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      if (projection && snapshot.clay && ['studio', 'tutorial'].includes(snapshot.phase)) {
        const p = projection, c = snapshot.clay, scale = p.pixelsPerWorldUnit;
        if (snapshot.phase === 'studio') {
          const y = p.bottomYPx - c.maxHeightWorld * scale;
          ctx.strokeStyle = '#8a611c99'; ctx.fillStyle = '#8a611c'; ctx.lineWidth = 1; ctx.setLineDash([3, 7]);
          ctx.beginPath(); ctx.moveTo(p.axisXPx - 1.6 * scale, y); ctx.lineTo(p.axisXPx + 1.6 * scale, y); ctx.stroke();
          ctx.font = '11px system-ui'; haloText(ctx, 'Предел высоты', Math.max(8, p.axisXPx - 1.6 * scale - ctx.measureText('Предел высоты').width - 8), y - 7);
        }
        if (c.bottomHole) {
          const r = c.cavityRadiusWorld * scale, top = p.bottomYPx - c.height * scale;
          ctx.strokeStyle = '#a8432c'; ctx.fillStyle = '#ffb6a5'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
          for (const side of [-1, 1]) {
            ctx.beginPath(); ctx.moveTo(p.axisXPx + side * r, top); ctx.lineTo(p.axisXPx + side * r, p.bottomYPx + 8); ctx.stroke();
          }
          ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(p.axisXPx, p.bottomYPx - 18); ctx.lineTo(p.axisXPx, p.bottomYPx + 10);
          ctx.moveTo(p.axisXPx - 5, p.bottomYPx + 4); ctx.lineTo(p.axisXPx, p.bottomYPx + 10); ctx.lineTo(p.axisXPx + 5, p.bottomYPx + 4); ctx.stroke();
          if (snapshot.phase === 'studio') {
            const label = 'Дно пробито · разрез', x = p.axisXPx - r - 20, y = top - 16;
            ctx.font = '12px system-ui'; ctx.fillStyle = '#211d19eb'; ctx.fillRect(x - 4, y - 14, ctx.measureText(label).width + 8, 20);
            ctx.fillStyle = '#ffb6a5'; ctx.fillText(label, x, y);
          }
        }
        ctx.setLineDash([]);
      }
      if (snapshot.phase === 'tutorial' && goal && projection) {
        const p = projection, t = goal.target, scale = p.pixelsPerWorldUnit;
        const color = lessonStatus === 'failed' ? '#a8432c' : lessonStatus === 'matched' ? '#2f6b4e' : '#2f6f6b';
        ctx.fillStyle = lessonStatus === 'failed' ? '#a8432c14' : '#2f6f6b1a';
        ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.setLineDash([7, 5]); ctx.beginPath();
        for (let i = 0; i < t.radii.length; i++) {
          const x = p.axisXPx - t.radii[i] * scale, y = p.bottomYPx - t.height * i / (t.radii.length - 1) * scale;
          if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        for (let i = t.radii.length - 1; i >= 0; i--) ctx.lineTo(p.axisXPx + t.radii[i] * scale, p.bottomYPx - t.height * i / (t.radii.length - 1) * scale);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        const top = p.bottomYPx - t.height * scale;
        ctx.beginPath(); ctx.ellipse(p.axisXPx, top, t.radii.at(-1)! * scale, t.radii.at(-1)! * scale * .15, 0, 0, Math.PI * 2); ctx.stroke();
        const section = (shape: Pick<LessonShape, 'height' | 'cavityRadiusWorld' | 'cavityDepthWorld'>, stroke: string, openBottom = false) => {
          if (shape.cavityDepthWorld <= 0) return;
          const r = shape.cavityRadiusWorld * scale, y = p.bottomYPx - shape.height * scale;
          ctx.strokeStyle = stroke; ctx.beginPath(); ctx.moveTo(p.axisXPx - r, y);
          ctx.lineTo(p.axisXPx - r, y + shape.cavityDepthWorld * scale);
          if (openBottom) ctx.moveTo(p.axisXPx + r, y + shape.cavityDepthWorld * scale);
          else ctx.lineTo(p.axisXPx + r, y + shape.cavityDepthWorld * scale);
          ctx.lineTo(p.axisXPx + r, y); ctx.stroke();
          ctx.beginPath(); ctx.ellipse(p.axisXPx, y, r, r * .15, 0, 0, Math.PI * 2); ctx.stroke();
        };
        section(t, color);
        if (snapshot.clay?.cavityDepthWorld) {
          ctx.setLineDash([]); ctx.lineWidth = 1;
          section(snapshot.clay, snapshot.clay.bottomHole ? '#a8432c' : '#8a611c', snapshot.clay.bottomHole);
        }
        ctx.setLineDash([]); ctx.fillStyle = color; ctx.font = '12px system-ui';
        const total = LESSON_FINISH_STEP + 1;
        const label = goal.step === LESSON_FINISH_STEP ? `${total}/${total} · Обучение окончено` : `Цель ${goal.step + 1}/${total}${t.cavityDepthWorld ? ' · глубина в разрезе' : ''}`;
        haloText(ctx, label, p.axisXPx - t.radii.at(-1)! * scale, top - 22);
      }
      if (snapshot.phase === 'studio' && snapshot.target && projection) {
        const target = snapshot.target, p = projection;
        ctx.strokeStyle = '#2f6f6bbb'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
        for (const side of [-1, 1]) {
          ctx.beginPath();
          for (let i = 0; i < target.radii.length; i++) {
            const x = p.axisXPx + side * target.radii[i] * p.pixelsPerWorldUnit;
            const y = p.bottomYPx - target.height * i / (target.radii.length - 1) * p.pixelsPerWorldUnit;
            if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        ctx.setLineDash([]); ctx.fillStyle = '#2f6f6b'; ctx.font = '12px system-ui';
        haloText(ctx, 'Образец', p.axisXPx + target.radii.at(-1)! * p.pixelsPerWorldUnit + 10, p.bottomYPx - target.height * p.pixelsPerWorldUnit);
      }
      if (projection && snapshot.clay && ['studio', 'tutorial'].includes(snapshot.phase)) {
        // the yellow safe-depth line belongs to the lesson step that teaches it; free shaping keeps the pot clear
        const thumbLimit = snapshot.phase === 'tutorial' && goal?.step === 3;
        drawCavitySection(ctx, snapshot.clay, projection, thumbLimit);
      }
      const input = snapshot.input;
      const gesture = snapshot.gesture;
      const acting = !!gesture?.deforming && !!input && gesture.sourceFrameId === input.frameId && nowMs - input.tMs <= CONFIG.MAX_INPUT_AGE_MS;
      const actionKey = acting ? `${gesture!.gesture}:${gesture!.activeTrackId}` : '';
      if (actionKey && actionKey !== lastAction) flashUntil = nowMs + 180;
      lastAction = actionKey;
      for (const hand of visuals.update(input, nowMs)) {
        if (!hand.opacity) continue;
        const active = acting && (gesture!.activeTrackId === hand.trackId || gesture!.gesture === 'widen');
        const error = snapshot.hint?.handTrackId === hand.trackId && snapshot.hint.severity !== 'info' && snapshot.hint.expiresAtMs > nowMs;
        drawHandGlove(ctx, hand.points, hand.opacity, active, active && nowMs < flashUntil, error, skeleton);
      }
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      if (!input || nowMs < input.tMs || nowMs - input.tMs > CONFIG.MAX_INPUT_AGE_MS) return;
      if (['ready', 'oneHand'].includes(input.status)) {
        for (const hand of [input.screenLeft, input.screenRight]) {
          if (!hand) continue;
          ctx.fillStyle = '#a5e9ed'; ctx.strokeStyle = '#211d19'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(hand.palmPx.x, hand.palmPx.y, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        }
      }
      const action = snapshot.gesture;
      if (input.status === 'ready' && action?.inputUsable && action.sourceFrameId === input.frameId && ['studio', 'tutorial'].includes(snapshot.phase)) {
        for (const hand of [input.screenLeft, input.screenRight]) {
          if (!hand) continue;
          const dualGrip = action.gesture === 'widen' && action.supportTrackId === null && action.contact.valid;
          const active = dualGrip || hand.trackId === action.activeTrackId, support = hand.trackId === action.supportTrackId;
          if (!active && !support) continue;
          const { x, y } = hand.palmPx;
          ctx.strokeStyle = support ? '#2f6b4e' : '#58402e66'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(x, y, 32, 0, Math.PI * 2); ctx.stroke();
          if (active) {
            ctx.strokeStyle = '#a8822f'; ctx.lineWidth = 5;
            ctx.beginPath(); ctx.arc(x, y, 32, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * action.activationProgress); ctx.stroke();
          }
          ctx.fillStyle = support ? '#2f6b4e' : '#7a5a1a'; ctx.font = '12px system-ui';
          haloText(ctx, support ? 'Опора' : action.activationProgress >= 1 ? 'Медленно' : `${Math.round(action.activationProgress * 100)}%`, x - 22, y + 50);
        }
      }
      const cursor = uiCursor ?? (['ready', 'oneHand'].includes(input.status) && snapshot.gesture?.sourceFrameId === input.frameId ? snapshot.gesture.cursorPx : null);
      if (cursor) {
        pointer.hidden = false;
        pointer.style.transform = `translate(${cursor.x - 24}px, ${cursor.y - 24}px)`;
        pointerProgress.setAttribute('stroke-dashoffset', String(126 * (1 - dwellProgress)));
      }
    },
    dispose(): void { canvas.remove(); pointer.remove(); },
  };
}
