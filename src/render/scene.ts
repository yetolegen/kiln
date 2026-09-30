import {
  ACESFilmicToneMapping, CylinderGeometry, DirectionalLight, HemisphereLight, Mesh, MeshStandardMaterial,
  OrthographicCamera, Scene, SRGBColorSpace, WebGLRenderer,
} from 'three';
import type { ClayState, EngineSnapshot, ProjectionParams } from '../types';
import { createPotView } from './pot';

const TILT = Math.PI / 12;

export function configureCamera(camera: OrthographicCamera, p: ProjectionParams): void {
  const cos = Math.cos(TILT), ppu = p.pixelsPerWorldUnit;
  camera.left = -p.axisXPx / ppu;
  camera.right = (p.viewportWidth - p.axisXPx) / ppu;
  // Compensate the viewing tilt so every point on the z=0 interaction plane maps exactly.
  camera.top = p.bottomYPx / ppu * cos;
  camera.bottom = (p.bottomYPx - p.viewportHeight) / ppu * cos;
  camera.position.set(0, Math.sin(TILT) * 12, Math.cos(TILT) * 12);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}

export function createScene(parent: HTMLElement) {
  const canvas = document.createElement('canvas');
  canvas.className = 'scene-canvas';
  canvas.dataset.testid = 'pot-canvas';
  canvas.setAttribute('aria-label', 'Сосуд на гончарном круге');
  const fallback = document.createElement('canvas');
  fallback.className = 'scene-canvas';
  fallback.dataset.testid = 'pot-fallback';
  fallback.hidden = true;
  fallback.setAttribute('aria-label', 'Сосуд на гончарном круге');
  parent.append(canvas, fallback);
  const context = fallback.getContext('2d');
  let renderer: WebGLRenderer | null = null;
  const useFallback = (event?: Event) => {
    event?.preventDefault();
    canvas.hidden = true;
    fallback.hidden = false;
  };
  try {
    renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setClearColor(0, 0);
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;
  } catch { useFallback(); }
  canvas.addEventListener('webglcontextlost', useFallback);
  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, .1, 100);
  const pot = createPotView();
  scene.add(pot.group, new HemisphereLight('#ffe7c8', '#39271e', 2.6));
  const key = new DirectionalLight('#ffe2c3', 4);
  key.position.set(-3, 5, 6);
  scene.add(key);
  const rim = new DirectionalLight('#c4ddd0', 2);
  rim.position.set(4, 2, -3);
  scene.add(rim);
  const wheelGeometry = new CylinderGeometry(1.75, 1.8, .13, 64);
  const wheelMaterial = new MeshStandardMaterial({ color: '#70513c', roughness: .7 });
  const wheel = new Mesh(wheelGeometry, wheelMaterial);
  wheel.position.y = -.065;
  scene.add(wheel);
  let projection: ProjectionParams | null = null;
  let lastSnapshot: EngineSnapshot | null = null;
  let color = '#b9825e';
  let dpr = 1;

  return {
    canvas,
    setProjection(p: ProjectionParams): void {
      projection = p;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      configureCamera(camera, p);
      renderer?.setPixelRatio(dpr);
      renderer?.setSize(p.viewportWidth, p.viewportHeight, false);
      fallback.width = Math.round(p.viewportWidth * dpr);
      fallback.height = Math.round(p.viewportHeight * dpr);
    },
    setSurface(nextColor: string, gloss = 0, glow = 0): void {
      color = nextColor;
      pot.material.color.set(color);
      pot.material.roughness = .85 - gloss * .65;
      pot.material.metalness = gloss * .08;
      pot.material.emissive.set('#ff640b');
      pot.material.emissiveIntensity = glow;
    },
    render(snapshot: EngineSnapshot, nowMs: number): void {
      if (!projection) return;
      lastSnapshot = snapshot;
      const visible = !['loading', 'permission', 'calibrate', 'gallery'].includes(snapshot.phase);
      pot.group.visible = visible && !!snapshot.clay;
      wheel.visible = visible;
      if (snapshot.clay && visible) pot.update(snapshot.clay, snapshot.hint?.band ?? snapshot.gesture?.contact.activeBand ?? null, nowMs);
      wheel.rotation.y = nowMs * .0002;
      if (!canvas.hidden && renderer) {
        try { renderer.render(scene, camera); } catch { useFallback(); }
      }
      if (!fallback.hidden && context) {
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        context.clearRect(0, 0, projection.viewportWidth, projection.viewportHeight);
        if (snapshot.clay && visible) drawFallback(context, snapshot.clay, projection, color, snapshot.hint?.band ?? snapshot.clay.activeBand, nowMs);
      }
    },
    async exportPng(): Promise<Blob | null> {
      try {
        if (!lastSnapshot || !projection) return null;
        if (!canvas.hidden && renderer) renderer.render(scene, camera);
        const source = canvas.hidden ? fallback : canvas;
        const picture = document.createElement('canvas'); picture.width = 1200; picture.height = 1200;
        const ctx = picture.getContext('2d'); if (!ctx || !lastSnapshot.clay) return null;
        const p = projection, clay = lastSnapshot.clay;
        ctx.fillStyle = '#211d19'; ctx.fillRect(0, 0, 1200, 1200);
        const x = Math.max(0, p.axisXPx - p.pixelsPerWorldUnit * 1.95);
        const y = Math.max(0, p.bottomYPx - (clay.height + .45) * p.pixelsPerWorldUnit);
        const width = Math.min(p.viewportWidth - x, p.pixelsPerWorldUnit * 3.9);
        const height = Math.min(p.viewportHeight - y, p.bottomYPx + p.pixelsPerWorldUnit * .35 - y);
        const scale = Math.min(960 / width, 870 / height), dw = width * scale, dh = height * scale;
        ctx.drawImage(source, x * dpr, y * dpr, width * dpr, height * dpr, (1200 - dw) / 2, 170 + (870 - dh) / 2, dw, dh);
        ctx.fillStyle = '#eedac4'; ctx.textAlign = 'center'; ctx.font = '54px Georgia'; ctx.fillText('K I L N', 600, 100);
        ctx.fillStyle = '#bba58d'; ctx.font = '22px system-ui'; ctx.fillText('Форма, созданная движением', 600, 1120);
        return await new Promise<Blob | null>((resolve) => picture.toBlob(resolve, 'image/png'));
      } catch { return null; }
    },
    dispose(): void {
      canvas.removeEventListener('webglcontextlost', useFallback);
      renderer?.dispose(); pot.dispose(); wheelGeometry.dispose(); wheelMaterial.dispose();
      canvas.remove(); fallback.remove();
    },
  };
}

function drawFallback(ctx: CanvasRenderingContext2D, clay: ClayState, p: ProjectionParams, color: string, band: number | null, nowMs: number): void {
  const scale = p.pixelsPerWorldUnit, x = p.axisXPx, bottom = p.bottomYPx;
  ctx.save();
  ctx.translate(Math.sin(nowMs * .012) * clay.wobble * 4, 0);
  ctx.fillStyle = '#70513c';
  ctx.beginPath(); ctx.ellipse(x, bottom + scale * .06, scale * 1.8, scale * .18, 0, 0, Math.PI * 2); ctx.fill();
  const gradient = ctx.createLinearGradient(x - 1.6 * scale, 0, x + 1.6 * scale, 0);
  gradient.addColorStop(0, '#53372a'); gradient.addColorStop(.38, color); gradient.addColorStop(.75, color); gradient.addColorStop(1, '#53372a');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  for (let i = 0; i < clay.radii.length; i++) {
    const px = x - clay.radii[i] * scale, y = bottom - clay.height * i / (clay.radii.length - 1) * scale;
    if (!i) ctx.moveTo(px, y); else ctx.lineTo(px, y);
  }
  for (let i = clay.radii.length - 1; i >= 0; i--) ctx.lineTo(x + clay.radii[i] * scale, bottom - clay.height * i / (clay.radii.length - 1) * scale);
  ctx.closePath(); ctx.fill();
  const r = clay.radii[clay.radii.length - 1] * scale;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.ellipse(x, bottom - clay.height * scale, r, r * .15, 0, 0, Math.PI * 2); ctx.fill();
  if (clay.cavityRadiusWorld > 0 && clay.cavityDepthWorld > 0) {
    const inner = clay.cavityRadiusWorld * scale;
    ctx.fillStyle = `rgba(49, 28, 18, ${Math.min(.95, .35 + clay.cavityDepthWorld / clay.height)})`;
    ctx.beginPath(); ctx.ellipse(x, bottom - clay.height * scale, inner, inner * .15, 0, 0, Math.PI * 2); ctx.fill();
    if (clay.bottomHole) {
      ctx.strokeStyle = '#ffad95'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
      for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + side * inner, bottom - clay.height * scale); ctx.lineTo(x + side * inner, bottom + 5); ctx.stroke(); }
      ctx.setLineDash([]); ctx.fillStyle = '#ffd4c1'; ctx.font = '12px system-ui'; ctx.fillText('Сквозное дно', x - inner, bottom + 25);
    }
  }
  ctx.lineWidth = 2;
  for (let i = 0; i < clay.damage.length; i++) {
    if (clay.damage[i] < .05) continue;
    const y = bottom - clay.height * i / (clay.damage.length - 1) * scale;
    ctx.globalAlpha = clay.damage[i]; ctx.strokeStyle = '#49291c';
    ctx.beginPath(); ctx.moveTo(x - 12, y - 7); ctx.lineTo(x + 2, y); ctx.lineTo(x - 4, y + 8); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  if (band !== null) {
    const b = Math.max(0, Math.min(clay.radii.length - 1, band));
    ctx.strokeStyle = '#ffe0a2';
    ctx.beginPath(); ctx.ellipse(x, bottom - clay.height * b / (clay.radii.length - 1) * scale, clay.radii[b] * scale, clay.radii[b] * scale * .1, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}
