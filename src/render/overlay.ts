import { CONFIG } from '../config';
import type { EngineSnapshot, ProjectionParams, Vec2 } from '../types';
import type { LessonGoal, LessonShape } from '../ui/tutorialGeometry';
import { HandVisuals } from './handVisuals';
import { drawCavitySection } from './cavitySection';

const CHAINS = [[0, 1, 2, 3, 4], [0, 5, 6, 7, 8], [5, 9, 10, 11, 12], [9, 13, 14, 15, 16], [13, 17, 18, 19, 20], [0, 17]];

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
          ctx.strokeStyle = '#e6aa7480'; ctx.fillStyle = '#e6aa74'; ctx.lineWidth = 1; ctx.setLineDash([3, 7]);
          ctx.beginPath(); ctx.moveTo(p.axisXPx - 1.6 * scale, y); ctx.lineTo(p.axisXPx + 1.6 * scale, y); ctx.stroke();
          ctx.font = '11px system-ui'; ctx.fillText('Предел высоты', Math.max(8, p.axisXPx - 1.6 * scale - ctx.measureText('Предел высоты').width - 8), y - 7);
        }
        if (c.bottomHole) {
          const r = c.cavityRadiusWorld * scale, top = p.bottomYPx - c.height * scale;
          ctx.strokeStyle = '#ff927c'; ctx.fillStyle = '#ffb6a5'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
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
        const color = lessonStatus === 'failed' ? '#ff9c85' : lessonStatus === 'matched' ? '#9ee3c4' : '#a5e9ed';
        ctx.fillStyle = lessonStatus === 'failed' ? '#ff9c8510' : '#a5e9ed1c';
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
          section(snapshot.clay, snapshot.clay.bottomHole ? '#ff927c' : '#ffd4a0', snapshot.clay.bottomHole);
        }
        ctx.setLineDash([]); ctx.fillStyle = color; ctx.font = '12px system-ui';
        const label = goal.step === 5 ? '6/6 · Обучение окончено' : `Цель ${goal.step + 1}/6${t.cavityDepthWorld ? ' · глубина в разрезе' : ''}`;
        ctx.fillText(label, p.axisXPx - t.radii.at(-1)! * scale, top - 22);
      }
      if (snapshot.phase === 'studio' && snapshot.target && projection) {
        const target = snapshot.target, p = projection;
        ctx.strokeStyle = '#cce5dfbb'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
        for (const side of [-1, 1]) {
          ctx.beginPath();
          for (let i = 0; i < target.radii.length; i++) {
            const x = p.axisXPx + side * target.radii[i] * p.pixelsPerWorldUnit;
            const y = p.bottomYPx - target.height * i / (target.radii.length - 1) * p.pixelsPerWorldUnit;
            if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        ctx.setLineDash([]); ctx.fillStyle = '#cce5df'; ctx.font = '12px system-ui';
        ctx.fillText('Образец', p.axisXPx + target.radii.at(-1)! * p.pixelsPerWorldUnit + 10, p.bottomYPx - target.height * p.pixelsPerWorldUnit);
      }
      if (projection && snapshot.clay && ['studio', 'tutorial'].includes(snapshot.phase)) {
        const thumbLimit = snapshot.phase === 'tutorial' ? goal?.step === 2 : snapshot.gesture?.gesture === 'indent' || snapshot.clay.cavityDepthWorld === 0;
        drawCavitySection(ctx, snapshot.clay, projection, thumbLimit);
      }
      const input = snapshot.input;
      ctx.strokeStyle = '#ffddaa'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.shadowColor = '#eec086'; ctx.shadowBlur = 10;
      for (const hand of visuals.update(input, nowMs)) {
        if (!hand.opacity) continue;
        ctx.globalAlpha = hand.opacity;
        for (const chain of CHAINS) {
          ctx.beginPath();
          for (let i = 0; i < chain.length; i++) {
            const x = hand.points[chain[i] * 2], y = hand.points[chain[i] * 2 + 1];
            if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
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
          const active = hand.trackId === action.activeTrackId, support = hand.trackId === action.supportTrackId;
          if (!active && !support) continue;
          const { x, y } = hand.palmPx;
          ctx.strokeStyle = support ? '#9ee3c4' : '#ffffff66'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(x, y, 32, 0, Math.PI * 2); ctx.stroke();
          if (active) {
            ctx.strokeStyle = '#ffe0a2'; ctx.lineWidth = 5;
            ctx.beginPath(); ctx.arc(x, y, 32, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * action.activationProgress); ctx.stroke();
          }
          ctx.fillStyle = support ? '#9ee3c4' : '#ffe0a2'; ctx.font = '12px system-ui';
          ctx.fillText(support ? 'Опора' : action.activationProgress >= 1 ? 'Медленно' : `${Math.round(action.activationProgress * 100)}%`, x - 22, y + 50);
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
