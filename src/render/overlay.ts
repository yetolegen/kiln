import { CONFIG } from '../config';
import type { EngineSnapshot, ProjectionParams } from '../types';
import { HandVisuals } from './handVisuals';

const CHAINS = [[0, 1, 2, 3, 4], [0, 5, 6, 7, 8], [5, 9, 10, 11, 12], [9, 13, 14, 15, 16], [13, 17, 18, 19, 20], [0, 17]];

export function createOverlay(parent: HTMLElement) {
  const canvas = document.createElement('canvas');
  canvas.className = 'overlay-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  parent.append(canvas);
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
    render(snapshot: EngineSnapshot, nowMs: number, dwellProgress = 0): void {
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
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
      const cursor = ['ready', 'oneHand'].includes(input.status) && snapshot.gesture?.sourceFrameId === input.frameId ? snapshot.gesture.cursorPx : null;
      if (cursor) {
        ctx.fillStyle = '#fff5db'; ctx.beginPath(); ctx.arc(cursor.x, cursor.y, 6, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff66'; ctx.beginPath(); ctx.arc(cursor.x, cursor.y, 21, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#ffe0a2'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cursor.x, cursor.y, 21, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * dwellProgress); ctx.stroke();
      }
    },
    dispose(): void { canvas.remove(); },
  };
}
