import { CONFIG } from '../config';
import type { EngineSnapshot, ProjectionParams } from '../types';

const CHAINS = [[0, 1, 2, 3, 4], [0, 5, 6, 7, 8], [5, 9, 10, 11, 12], [9, 13, 14, 15, 16], [13, 17, 18, 19, 20], [0, 17]];

export function createOverlay(parent: HTMLElement) {
  const canvas = document.createElement('canvas');
  canvas.className = 'overlay-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  parent.append(canvas);
  const ctx = canvas.getContext('2d');
  let width = 0, height = 0, dpr = 1;
  return {
    setProjection(p: ProjectionParams): void {
      width = p.viewportWidth; height = p.viewportHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    },
    render(snapshot: EngineSnapshot, nowMs: number, dwellProgress = 0): void {
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const input = snapshot.input;
      if (!input || nowMs - input.tMs > CONFIG.MAX_INPUT_AGE_MS) return;
      ctx.strokeStyle = '#ffddaa'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      ctx.shadowColor = '#eec086'; ctx.shadowBlur = 10;
      for (const hand of [input.screenLeft, input.screenRight]) {
        if (!hand) continue;
        for (const chain of CHAINS) {
          ctx.beginPath();
          for (let i = 0; i < chain.length; i++) {
            const point = hand.landmarksPx[chain[i]];
            if (!point) break;
            if (!i) ctx.moveTo(point.x, point.y); else ctx.lineTo(point.x, point.y);
          }
          ctx.stroke();
        }
      }
      ctx.shadowBlur = 0;
      const cursor = snapshot.gesture?.inputUsable ? snapshot.gesture.cursorPx : null;
      if (cursor) {
        ctx.fillStyle = '#fff5db'; ctx.beginPath(); ctx.arc(cursor.x, cursor.y, 6, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff66'; ctx.beginPath(); ctx.arc(cursor.x, cursor.y, 21, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#ffe0a2'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cursor.x, cursor.y, 21, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * dwellProgress); ctx.stroke();
      }
    },
    dispose(): void { canvas.remove(); },
  };
}
