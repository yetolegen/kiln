import type { SessionResult } from '../types';
import { glazeColor } from '../render/kiln';

export function renderGallery(parent: HTMLElement, pots: readonly SessionResult[], page: number, best: (target: string) => number | null): void {
  parent.replaceChildren();
  if (!pots.length) { const empty = document.createElement('p'); empty.textContent = 'Здесь появится ваш первый обожжённый сосуд.'; parent.append(empty); return; }
  const grid = document.createElement('div'); grid.className = 'gallery-grid';
  for (const pot of pots.slice(page * 2, page * 2 + 2)) {
    const card = document.createElement('article'); card.className = 'gallery-card';
    const canvas = document.createElement('canvas'); canvas.width = 280; canvas.height = 220;
    canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', 'Сохранённый сосуд');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const scale = Math.min(52, 174 / pot.height), bottom = 198, center = 140;
      const gradient = ctx.createLinearGradient(60, 0, 220, 0);
      gradient.addColorStop(0, '#4d3c2d'); gradient.addColorStop(.4, glazeColor(pot.glazeId)); gradient.addColorStop(.8, glazeColor(pot.glazeId)); gradient.addColorStop(1, '#4d3c2d');
      ctx.fillStyle = gradient; ctx.beginPath();
      for (let i = 0; i < pot.finalProfile.length; i++) { const x = center - pot.finalProfile[i] * scale, y = bottom - pot.height * i / (pot.finalProfile.length - 1) * scale; if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      for (let i = pot.finalProfile.length - 1; i >= 0; i--) ctx.lineTo(center + pot.finalProfile[i] * scale, bottom - pot.height * i / (pot.finalProfile.length - 1) * scale);
      ctx.closePath(); ctx.fill();
      const radius = pot.finalProfile.at(-1)! * scale;
      ctx.fillStyle = glazeColor(pot.glazeId); ctx.beginPath(); ctx.ellipse(center, bottom - pot.height * scale, radius, radius * .15, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4d3c2d'; ctx.beginPath(); ctx.ellipse(center, bottom - pot.height * scale, Math.max(1, radius - pot.thickness * scale), Math.max(1, radius - pot.thickness * scale) * .15, 0, 0, Math.PI * 2); ctx.fill();
    }
    const title = document.createElement('h2'); title.textContent = pot.stats.mode === 'commission' ? 'Ваза по образцу' : 'Свободная форма';
    const date = document.createElement('p'); date.textContent = new Date(pot.completedAtIso).toLocaleDateString('ru-RU');
    card.append(canvas, title, date);
    if (pot.stats.mode === 'commission' && pot.stats.targetId && pot.stats.similarity) {
      const score = document.createElement('p'); score.textContent = `${Math.round(pot.stats.similarity.score)}% · лучший здесь: ${Math.round(best(pot.stats.targetId) ?? 0)}%`;
      card.append(score);
    }
    grid.append(card);
  }
  parent.append(grid);
}
