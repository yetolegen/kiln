import type { ClayState, ProjectionParams } from '../types';

/** A section through the actual mesh dimensions, drawn over the pot without modifying it. */
export function drawCavitySection(ctx: CanvasRenderingContext2D, clay: ClayState, p: ProjectionParams, thumbLimit: boolean): void {
  if (clay.cavityDepthWorld <= 0 && !thumbLimit) return;
  const scale = p.pixelsPerWorldUnit, x = p.axisXPx, top = p.bottomYPx - clay.height * scale;
  const r = clay.cavityRadiusWorld * scale, floor = top + clay.cavityDepthWorld * scale;
  ctx.save(); ctx.setLineDash([]); ctx.lineWidth = 1.5;
  if (clay.cavityDepthWorld > 0) {
    ctx.fillStyle = '#ffd4a01c'; ctx.strokeStyle = '#ffd4a0';
    // Each wall's filled section spans the measured inner and outer surface.
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(x + side * r, top); ctx.lineTo(x + side * r, floor);
      for (let i = 0; i < clay.radii.length; i++) {
        const y = p.bottomYPx - clay.height * i / (clay.radii.length - 1) * scale;
        if (y <= floor) ctx.lineTo(x + side * clay.radii[i] * scale, y);
      }
      ctx.closePath(); ctx.fill();
    }
    ctx.beginPath(); ctx.moveTo(x - r, top); ctx.lineTo(x - r, floor);
    if (clay.bottomHole) ctx.moveTo(x + r, floor); else ctx.lineTo(x + r, floor);
    ctx.lineTo(x + r, top); ctx.stroke();
    const wallFraction = clay.thickness / Math.max(.001, clay.thickness + clay.cavityRadiusWorld);
    const label = `Полость ${Math.round(100 * clay.cavityDepthWorld / clay.height)}% высоты · стенка ${Math.round(wallFraction * 100)}% радиуса`;
    ctx.font = '11px system-ui'; ctx.textAlign = 'center';
    const w = ctx.measureText(label).width;
    ctx.fillStyle = '#211d19eb'; ctx.fillRect(x - w / 2 - 5, p.bottomYPx + 12, w + 10, 19);
    ctx.fillStyle = '#ffd4a0'; ctx.fillText(label, x, p.bottomYPx + 25);
  }
  if (thumbLimit) {
    const depth = Math.min(clay.height, clay.safeIndentDepthWorld), y = top + depth * scale;
    const width = Math.max(r + 12, clay.radii.at(-1)! * scale * .7);
    ctx.strokeStyle = '#ffe075'; ctx.lineWidth = 2; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(x - width, y); ctx.lineTo(x + width, y); ctx.stroke();
    ctx.setLineDash([]); ctx.font = '11px system-ui'; ctx.textAlign = 'center';
    const label = 'Предел: ≈ 1 фаланга', w = ctx.measureText(label).width;
    ctx.fillStyle = '#211d19eb'; ctx.fillRect(x - w / 2 - 4, y + 5, w + 8, 18);
    ctx.fillStyle = '#ffe075'; ctx.fillText(label, x, y + 18);
  }
  ctx.restore();
}
