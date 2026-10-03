import type { ProjectionParams } from '../types';

/**
 * Sunlit studio behind the wheel: warm plaster wall, concrete floor, window light falling from the upper left,
 * and a few clay crumbs. Painted once per viewport change (never per frame), sized from the same projection the
 * clay uses so the wheel always stands on the floor. Decorative only: no input, no hit testing.
 */
export function createBackdrop(parent: HTMLElement) {
  const canvas = document.createElement('canvas');
  canvas.className = 'backdrop-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  parent.prepend(canvas);
  let drawn = '';

  function paint(p: ProjectionParams): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = p.viewportWidth, h = p.viewportHeight, ppu = p.pixelsPerWorldUnit;
    const key = `${w}x${h}@${dpr}:${p.axisXPx}:${p.bottomYPx}:${ppu}`;
    if (key === drawn || w <= 0 || h <= 0) return;
    drawn = key;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Wall/floor seam well behind the wheel: in a real room it reads above the vessel's foot.
    const seam = Math.max(h * .18, Math.min(h * .62, p.bottomYPx - 1.35 * ppu));
    let seed = 1;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

    const wall = ctx.createLinearGradient(0, 0, w, seam);
    wall.addColorStop(0, '#f1ece4'); wall.addColorStop(.55, '#ebe5dc'); wall.addColorStop(1, '#e2dbd1');
    ctx.fillStyle = wall; ctx.fillRect(0, 0, w, seam);
    const floor = ctx.createLinearGradient(0, seam, 0, h);
    floor.addColorStop(0, '#ddd5ca'); floor.addColorStop(.25, '#e6dfd5'); floor.addColorStop(1, '#ede7de');
    ctx.fillStyle = floor; ctx.fillRect(0, seam, w, h - seam);

    // Window light: three tall panes on the wall, their stretched footprints on the floor. Gaps are the mullions.
    const light = (shape: [number, number][], alpha: number, blur: number) => {
      ctx.save(); ctx.filter = `blur(${blur}px)`; ctx.globalAlpha = alpha; ctx.fillStyle = '#fffaf1';
      ctx.beginPath(); shape.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill(); ctx.restore();
    };
    const pane = w * .085, gap = w * .018, x0 = w * .04;
    for (let i = 0; i < 3; i++) {
      const left = x0 + i * (pane + gap), skew = seam * .55;
      light([[left, seam * .08], [left + pane, seam * .08], [left + pane + skew, seam], [left + skew, seam]], .55, 14);
      const fx = left + skew, fl = (h - seam) * 1.2;
      light([[fx, seam], [fx + pane, seam], [fx + pane + fl * .9, h], [fx + fl * .9, h]], .42, 22);
    }
    // Soft contact shade along the seam, as where wall meets floor.
    const shade = ctx.createLinearGradient(0, seam - 2, 0, seam + 26);
    shade.addColorStop(0, '#b9ad9e55'); shade.addColorStop(1, '#b9ad9e00');
    ctx.fillStyle = shade; ctx.fillRect(0, seam - 2, w, 28);

    // Concrete speckle, faint enough to read as texture, not noise.
    for (let i = 0; i < Math.round(w * (h - seam) / 900); i++) {
      const x = rand() * w, y = seam + rand() * (h - seam), dark = rand() < .55;
      ctx.fillStyle = dark ? '#8f826f' : '#ffffff'; ctx.globalAlpha = .05 + rand() * .06;
      ctx.fillRect(x, y, 1 + rand() * 1.5, 1 + rand() * 1.5);
    }
    ctx.globalAlpha = 1;

    // Clay crumbs on the floor beside the wheel, never behind the vessel itself.
    const wheelHalf = 1.9 * ppu, floorTop = Math.max(seam + 12, p.bottomYPx + .25 * ppu);
    for (let i = 0; i < 46; i++) {
      const side = rand() < .5 ? -1 : 1, x = p.axisXPx + side * (wheelHalf * (.75 + rand() * 1.1));
      const y = floorTop + rand() * Math.max(20, h - floorTop - 10);
      if (x < 0 || x > w || y > h) continue;
      const r = .8 + rand() * (rand() < .15 ? 3.4 : 1.6);
      ctx.fillStyle = rand() < .5 ? '#b5653f' : '#c98a63'; ctx.globalAlpha = .55 + rand() * .35;
      ctx.beginPath(); ctx.ellipse(x, y, r * 1.25, r, rand() * Math.PI, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  return {
    canvas,
    setProjection: paint,
    dispose(): void { canvas.remove(); },
  };
}
