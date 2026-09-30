import {
  ACESFilmicToneMapping, BoxGeometry, CylinderGeometry, DirectionalLight, HemisphereLight, Mesh, MeshStandardMaterial,
  OrthographicCamera, PerspectiveCamera, Scene, SRGBColorSpace, WebGLRenderer, TorusGeometry,
  IcosahedronGeometry, InstancedMesh, Object3D, Spherical, Vector3,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { ClayState, EngineSnapshot, ProjectionParams } from '../types';
import { createPotView, rimTearBottom } from './pot';
import { WheelEffects } from './wheelEffects';

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
  const inspectionCamera = new PerspectiveCamera(38, 1, .01, 100);
  let controls: OrbitControls | null = null, inspecting = false;
  let inspectionDistance = 8;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pot = createPotView();
  scene.add(pot.group, new HemisphereLight('#f1ede4', '#28392e', 2));
  const key = new DirectionalLight('#ffe2c3', 3.1);
  key.position.set(-3, 5, 6);
  scene.add(key);
  const rim = new DirectionalLight('#c4ddd0', 2);
  rim.position.set(4, 2, -3);
  scene.add(rim);
  const inspectionFill = new DirectionalLight('#f3e6d4', 2.3);
  inspectionFill.visible = false; scene.add(inspectionFill, inspectionFill.target);
  const wheelGeometry = new CylinderGeometry(1.75, 1.8, .13, 64);
  const wheelMaterial = new MeshStandardMaterial({ color: '#706857', roughness: .55, metalness: .3 });
  const wheel = new Mesh(wheelGeometry, wheelMaterial);
  wheel.position.y = -.065;
  scene.add(wheel);
  const grooveGeometry = new TorusGeometry(1, .009, 4, 96);
  const grooveMaterial = new MeshStandardMaterial({ color: '#b0a58d', roughness: .6, metalness: .25 });
  for (const radius of [1.3, 1.48, 1.68]) {
    const groove = new Mesh(grooveGeometry, grooveMaterial);
    groove.rotation.x = Math.PI / 2; groove.position.y = .068; groove.scale.setScalar(radius); wheel.add(groove);
  }
  const markGeometry = new BoxGeometry(.16, .004, .018);
  for (let i = 0; i < 8; i++) {
    const mark = new Mesh(markGeometry, grooveMaterial), angle = i * Math.PI / 4;
    mark.position.set(Math.sin(angle) * 1.57, .068, Math.cos(angle) * 1.57); mark.rotation.y = angle + Math.PI / 2; wheel.add(mark);
  }
  const effects = new WheelEffects();
  const dropGeometry = new IcosahedronGeometry(.023, 0);
  const dropMaterial = new MeshStandardMaterial({ color: '#c88963', roughness: .5 });
  const drops = new InstancedMesh(dropGeometry, dropMaterial, effects.capacity);
  drops.frustumCulled = false; scene.add(drops);
  const particle = new Object3D();
  let projection: ProjectionParams | null = null;
  let lastSnapshot: EngineSnapshot | null = null;
  let color = '#b9825e';
  let dpr = 1;
  const activeCamera = () => inspecting ? inspectionCamera : camera;

  function inspectionView(action: string): void {
    if (!controls) return;
    const delta = inspectionCamera.position.clone().sub(controls.target);
    const spherical = new Spherical().setFromVector3(delta);
    if (action === 'left') spherical.theta -= Math.PI / 8;
    if (action === 'right') spherical.theta += Math.PI / 8;
    if (action === 'up') spherical.phi -= Math.PI / 8;
    if (action === 'down') spherical.phi += Math.PI / 8;
    if (action === 'closer') spherical.radius *= .8;
    if (action === 'farther') spherical.radius *= 1.25;
    if (action === 'top') { spherical.phi = .02; spherical.theta = 0; }
    if (action === 'bottom') { spherical.phi = Math.PI - .02; spherical.theta = 0; }
    if (action === 'reset') { spherical.phi = Math.PI / 2 - .3; spherical.theta = 0; spherical.radius = inspectionDistance; }
    spherical.phi = Math.max(.01, Math.min(Math.PI - .01, spherical.phi));
    spherical.radius = Math.max(controls.minDistance, Math.min(controls.maxDistance, spherical.radius));
    inspectionCamera.position.copy(new Vector3().setFromSpherical(spherical).add(controls.target));
    controls.update();
  }

  return {
    canvas,
    get supportsInspection(): boolean { return !canvas.hidden && renderer !== null; },
    inspectionView,
    setInspection(active: boolean, surface?: HTMLElement): void {
      inspecting = active && !canvas.hidden && renderer !== null;
      if (!controls && surface) {
        controls = new OrbitControls(inspectionCamera, surface);
        controls.enablePan = false; controls.enableDamping = false;
      }
      if (controls) {
        controls.enabled = inspecting;
        if (inspecting && lastSnapshot?.clay && projection) {
          const clay = lastSnapshot.clay;
          controls.target.set(0, clay.height / 2, 0);
          const radius = Math.hypot(Math.max(...clay.radii), clay.height / 2);
          inspectionDistance = radius / Math.sin(19 * Math.PI / 180) / Math.min(1, projection.viewportWidth / projection.viewportHeight) * 1.25;
          controls.minDistance = radius * 1.3; controls.maxDistance = inspectionDistance * 2.5;
          inspectionView('reset');
        }
      }
    },
    setProjection(p: ProjectionParams): void {
      projection = p;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      configureCamera(camera, p);
      inspectionCamera.aspect = p.viewportWidth / p.viewportHeight; inspectionCamera.updateProjectionMatrix();
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
      wheel.visible = visible && !inspecting;
      effects.update(snapshot, nowMs, reduced.matches, inspecting);
      if (snapshot.clay && visible) pot.update(snapshot.clay, inspecting ? null : snapshot.hint?.band ?? snapshot.gesture?.contact.activeBand ?? null, nowMs, effects.angle, reduced.matches || inspecting);
      wheel.rotation.y = effects.angle;
      let activeParticles = 0;
      for (let i = 0; i < effects.capacity; i++) {
        if (effects.life[i] > 0) activeParticles++;
        const j = i * 3;
        particle.position.set(effects.positions[j], effects.positions[j + 1], effects.positions[j + 2]);
        particle.scale.setScalar(Math.max(0, Math.min(1, effects.life[i] * 5)));
        particle.updateMatrix(); drops.setMatrixAt(i, particle.matrix);
      }
      drops.instanceMatrix.needsUpdate = true; drops.visible = visible && !inspecting;
      canvas.dataset.spinning = String(!reduced.matches && !inspecting && snapshot.phase !== 'firing' && !['wallTorn', 'bottomHole', 'pancake'].includes(snapshot.clay?.collapseCause ?? ''));
      canvas.dataset.particles = String(activeParticles);
      inspectionFill.visible = inspecting;
      if (inspecting) {
        const p = inspectionCamera.position;
        const view = `${p.x.toFixed(2)},${p.y.toFixed(2)},${p.z.toFixed(2)}`;
        if (canvas.dataset.view !== view) canvas.dataset.view = view;
        inspectionFill.position.copy(p); inspectionFill.target.position.copy(controls!.target);
      }
      if (!canvas.hidden && renderer) {
        try { renderer.render(scene, activeCamera()); } catch { useFallback(); }
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
        if (!canvas.hidden && renderer) renderer.render(scene, activeCamera());
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
      controls?.dispose(); renderer?.dispose(); pot.dispose(); wheelGeometry.dispose(); wheelMaterial.dispose();
      grooveGeometry.dispose(); grooveMaterial.dispose(); markGeometry.dispose(); dropGeometry.dispose(); dropMaterial.dispose();
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
  const tearBottom = rimTearBottom(clay);
  if (tearBottom !== null) {
    ctx.fillStyle = '#191e1c'; ctx.beginPath();
    const top = bottom - clay.height * scale, end = bottom - tearBottom * scale;
    ctx.moveTo(x + 8, top - 2);
    for (let y = top; y <= end; y += 4) ctx.lineTo(x + 8 + Math.sin((y - top) * .1) * 3, y);
    for (let y = end; y >= top; y -= 4) ctx.lineTo(x + 20 + Math.sin((y - top) * .1) * 3, y);
    ctx.closePath(); ctx.fill();
  }
  for (let i = 0; i < clay.damage.length && tearBottom === null; i++) {
    if (clay.damage[i] < .05) continue;
    const y = bottom - clay.height * i / (clay.damage.length - 1) * scale;
    ctx.globalAlpha = clay.damage[i] * .4; ctx.strokeStyle = '#e29672';
    ctx.beginPath(); ctx.ellipse(x, y, clay.radii[i] * scale, clay.radii[i] * scale * .1, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  if (band !== null) {
    const b = Math.max(0, Math.min(clay.radii.length - 1, band));
    ctx.strokeStyle = '#ffe0a2';
    ctx.beginPath(); ctx.ellipse(x, bottom - clay.height * b / (clay.radii.length - 1) * scale, clay.radii[b] * scale, clay.radii[b] * scale * .1, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}
