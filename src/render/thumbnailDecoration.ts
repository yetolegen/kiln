import type { SessionResult } from '../types';
import { glazeColor } from '../engine/materials';

/** Front elevation thumbnail; back-facing decorations are visible in the 3D shelf viewer. */
export function thumbnailDecoration(ctx: CanvasRenderingContext2D, pot: SessionResult, scale: number, bottom: number, center: number) {
  for (const a of pot.customization?.attachments ?? []) {
    if (a.anchor.point.z < 0) continue;
    const { x, y } = a.anchor.point;
    ctx.save(); ctx.translate(center + x * scale, bottom - y * scale); ctx.rotate(a.rotation + a.tilt);
    ctx.fillStyle = glazeColor(a.material); ctx.strokeStyle = '#3b2b2566'; ctx.beginPath();
    if (a.kind === 'cone') { ctx.moveTo(-a.width * scale / 2, 0); ctx.lineTo(0, -a.length * scale); ctx.lineTo(a.width * scale / 2, 0); ctx.closePath(); }
    else if (a.kind === 'cylinder') ctx.rect(-a.width * scale / 2, -a.length * scale / 2, a.width * scale, a.length * scale);
    else ctx.ellipse(0, 0, a.width * scale / 2, a.length * scale / 2, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke(); ctx.restore();
  }
  for (const s of pot.customization?.stamps ?? []) {
    if (s.anchor.point.z < 0) continue;
    ctx.save(); ctx.translate(center + s.anchor.point.x * scale, bottom - s.anchor.point.y * scale); ctx.rotate(s.rotation);
    ctx.fillStyle = glazeColor(s.color); ctx.strokeStyle = glazeColor(s.color); ctx.lineWidth = Math.max(1, s.size * scale / 12);
    const r = s.size * scale / 2;
    if (s.kind === 'star') {
      ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, radius = i % 2 ? r * .43 : r; const x = Math.cos(a) * radius, y = Math.sin(a) * radius; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.closePath(); ctx.fill();
    } else if (s.kind === 'dots') {
      for (const x of [-.5, 0, .5]) for (const y of [-.5, 0, .5]) { ctx.beginPath(); ctx.arc(x * r, y * r, r * .13, 0, Math.PI * 2); ctx.fill(); }
    } else for (const y of [-.5, 0, .5]) { ctx.beginPath(); ctx.moveTo(-r, y * r); ctx.bezierCurveTo(-r / 2, (y - .5) * r, r / 2, (y + .5) * r, r, y * r); ctx.stroke(); }
    ctx.restore();
  }
}
