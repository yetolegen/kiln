import {
  ACESFilmicToneMapping, BoxGeometry, CylinderGeometry, DirectionalLight, HemisphereLight, Mesh, MeshStandardMaterial,
  OrthographicCamera, PerspectiveCamera, Scene, SRGBColorSpace, WebGLRenderer, TorusGeometry,
  IcosahedronGeometry, InstancedMesh, Object3D, Spherical, Vector3, Group,
  PMREMGenerator, PCFShadowMap, WebGLRenderTarget, Box3, Sphere, PlaneGeometry, ShadowMaterial,
} from 'three';
import { createBackdrop } from './backdrop';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { ClayState, EngineSnapshot, ProjectionParams } from '../types';
import { createPotView, rimTearBottom } from './pot';
import { WheelEffects } from './wheelEffects';
import type { DisplayArtifact } from '../engine/artifact';
import { glazeColor } from './kiln';
import { createDecorationView } from './decoration';
import { emptyCustomization, type Attachment, type Stamp } from '../engine/customization';
import { pickOuterSurface } from './surfacePicking';
import type { Vec2 } from '../types';
import { createMaterialFamily } from './materialFamily';
import { createHandleView } from './handles';
import type { PotteryHandle } from '../engine/handles';

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

function softwareRenderer(renderer: WebGLRenderer | null): boolean {
  if (!renderer) return true;
  try {
    const gl = renderer.getContext(), info = gl.getExtension('WEBGL_debug_renderer_info');
    const name = String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(name);
  } catch { return false; }
}

export function createScene(parent: HTMLElement) {
  const backdrop = createBackdrop(parent);
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
    renderer.toneMappingExposure = .94;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = PCFShadowMap;
  } catch { useFallback(); }
  canvas.addEventListener('webglcontextlost', useFallback);
  const scene = new Scene();
  scene.environmentIntensity = .45;
  let studioLight: WebGLRenderTarget | null = null;
  if (renderer) {
    const room = new RoomEnvironment(), pmrem = new PMREMGenerator(renderer);
    try { studioLight = pmrem.fromScene(room, .08, .1, 100, { size: 128 }); scene.environment = studioLight.texture; }
    catch { /* Direct lighting remains available if the environment allocation fails. */ }
    finally { room.dispose(); pmrem.dispose(); }
  }
  const camera = new OrthographicCamera(-1, 1, 1, -1, .1, 100);
  const inspectionCamera = new PerspectiveCamera(38, 1, .01, 100);
  let controls: OrbitControls | null = null, inspecting = false;
  let inspectionDistance = 8;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const family = createMaterialFamily(), pot = createPotView(family);
  const handles = createHandleView(pot.group, family);
  const decoration = createDecorationView(pot.group, family), emptyDecor = emptyCustomization();
  // Window light from the upper left over a warm plaster room (the backdrop paints the same light).
  scene.add(pot.group, new HemisphereLight('#f6efe4', '#cbbba8', 1.05));
  const key = new DirectionalLight('#fff0dc', 2.9);
  key.position.set(-4.5, 6, 5);
  key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -3, near: .1, far: 20 });
  key.shadow.bias = -.0004; key.shadow.normalBias = .018; key.shadow.radius = 4;
  scene.add(key);
  const rim = new DirectionalLight('#e8d6b8', .9);
  rim.position.set(4, 2, -3);
  scene.add(rim);
  const inspectionFill = new DirectionalLight('#f3e6d4', 1.2);
  inspectionFill.visible = false; scene.add(inspectionFill, inspectionFill.target);
  const wheelGeometry = new CylinderGeometry(1.75, 1.8, .13, 64);
  // Pale stone bat with thin turned rings and clay smears, on a graphite base.
  const wheelMaterial = new MeshStandardMaterial({ color: '#bfb4a4', roughness: .82, metalness: 0 });
  const wheel = new Mesh(wheelGeometry, wheelMaterial);
  wheel.position.y = -.065;
  wheel.receiveShadow = true;
  scene.add(wheel);
  const stand = new Group();
  const spindleGeometry = new CylinderGeometry(.13, .21, .65, 24);
  const baseGeometry = new CylinderGeometry(.88, 1.14, .16, 48);
  const standMaterial = new MeshStandardMaterial({ color: '#57524d', roughness: .55, metalness: .35 });
  const spindle = new Mesh(spindleGeometry, standMaterial), base = new Mesh(baseGeometry, standMaterial);
  spindle.position.y = -.43; base.position.y = -.77;
  spindle.castShadow = true; base.receiveShadow = true;
  stand.add(spindle, base); scene.add(stand);
  // Invisible floor that only receives the wheel's soft shadow, grounding it on the painted studio floor.
  const floorGeometry = new PlaneGeometry(14, 14), floorMaterial = new ShadowMaterial({ color: '#5c4a38', opacity: .22 });
  const floor = new Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2; floor.position.y = -.851; floor.receiveShadow = true; scene.add(floor);
  wheel.castShadow = true; base.castShadow = true;
  const grooveGeometry = new TorusGeometry(1, .009, 4, 96);
  const grooveMaterial = new MeshStandardMaterial({ color: '#b3a796', roughness: .85, metalness: 0 });
  for (const radius of [1.12, 1.3, 1.48, 1.68]) {
    const groove = new Mesh(grooveGeometry, grooveMaterial);
    groove.rotation.x = Math.PI / 2; groove.position.y = .068; groove.scale.setScalar(radius); wheel.add(groove);
  }
  const markGeometry = new BoxGeometry(.16, .004, .018);
  for (let i = 0; i < 8; i++) {
    const mark = new Mesh(markGeometry, grooveMaterial), angle = i * Math.PI / 4;
    mark.position.set(Math.sin(angle) * 1.57, .068, Math.cos(angle) * 1.57); mark.rotation.y = angle + Math.PI / 2; wheel.add(mark);
  }
  const slipGeometry = new TorusGeometry(1, .018, 5, 32, Math.PI * .7);
  const slipMaterial = new MeshStandardMaterial({ color: '#bd7a55', roughness: .9, transparent: true, opacity: .55 });
  for (let i = 0; i < 3; i++) {
    const slip = new Mesh(slipGeometry, slipMaterial);
    slip.rotation.set(Math.PI / 2, 0, i * 2.1); slip.position.y = .074;
    slip.scale.set(1.22 + i * .19, 1.22 + i * .19, .35); wheel.add(slip);
  }
  const effects = new WheelEffects();
  const dropGeometry = new IcosahedronGeometry(.023, 0);
  const dropMaterial = new MeshStandardMaterial({ color: '#c88963', roughness: .5 });
  const drops = new InstancedMesh(dropGeometry, dropMaterial, effects.capacity);
  drops.frustumCulled = false; scene.add(drops);
  const particle = new Object3D();
  let projection: ProjectionParams | null = null;
  let lastSnapshot: EngineSnapshot | null = null;
  let artifact: DisplayArtifact | null = null;
  let color = '#b9825e';
  let surfaceGloss = 0, surfaceGlow = 0;
  let dpr = 1;
  // A real GPU never needs to drop below half resolution, where the clay turns visibly soft and stair-stepped.
  // Software renderers (no GPU) still may fall to a quarter: there, each extra pixel steals time from hand tracking.
  // Without a GPU, start lower and step down quickly: a slow first minute starves hand tracking right when the
  // player reaches for the menu. With a GPU, start sharp and only step down on sustained slowness.
  const software = softwareRenderer(renderer);
  const MIN_QUALITY = software ? .25 : .5, SLOW_FRAMES_TO_DROP = software ? 4 : 20;
  let quality = software ? .5 : 1, previousRender = 0, slowFrames = 0, fastFrames = 0, frameEma = 16;
  let appearanceRevision = 0, lastView = '', shadowRevision = '';
  const activeCamera = () => inspecting ? inspectionCamera : camera;
  function applySurface() {
    const gloss = artifact ? 1 : surfaceGloss;
    const finishColor = artifact ? glazeColor(artifact.glazeId) : color, glow = artifact ? 0 : surfaceGlow;
    family.apply(pot.material, finishColor, gloss, glow);
    handles.setFinish(finishColor, gloss, glow); decoration.setFinish(finishColor, gloss, glow);
  }

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
    previewHandle(value: PotteryHandle | null) { handles.preview(value); appearanceRevision++; },
    get supportsInspection(): boolean { return !canvas.hidden && renderer !== null; },
    inspectionView,
    pickSurface(pointer: Vec2) {
      const clay = artifact?.clay ?? lastSnapshot?.clay;
      return clay && pot.mesh ? pickOuterSurface(pointer, canvas.getBoundingClientRect(), activeCamera(), pot.mesh, pot.group, clay) : null;
    },
    previewDecoration(value: Attachment | Stamp | null): void { const clay = artifact?.clay ?? lastSnapshot?.clay; if (clay) { decoration.preview(value, clay); appearanceRevision++; } },
    setArtifact(value: DisplayArtifact | null): void {
      artifact = value;
      appearanceRevision++;
      applySurface();
    },
    rotateInspection(dx: number, dy: number): void {
      if (!controls || !inspecting) return;
      const s = new Spherical().setFromVector3(inspectionCamera.position.clone().sub(controls.target));
      s.theta -= dx * Math.PI * 2;
      s.phi = Math.max(.01, Math.min(Math.PI - .01, s.phi - dy * Math.PI * 2));
      inspectionCamera.position.copy(new Vector3().setFromSpherical(s).add(controls.target)); controls.update();
    },
    setPointerOrbit(enabled: boolean): void { if (controls) controls.enabled = inspecting && enabled; },
    setInspection(active: boolean, surface?: HTMLElement): void {
      inspecting = active && !canvas.hidden && renderer !== null;
      // Camera-free viewing can regain full detail. Live hand editing keeps the
      // adaptive budget: forcing a large redraw here can interrupt track continuity.
      if (inspecting && !lastSnapshot?.input && renderer && projection) { quality = 1; slowFrames = 0; renderer.setPixelRatio(dpr); renderer.setSize(projection.viewportWidth, projection.viewportHeight, false); canvas.dataset.renderScale = '1.00'; }
      appearanceRevision++;
      if (surface && (!controls || controls.domElement !== surface)) {
        controls?.dispose();
        controls = new OrbitControls(inspectionCamera, surface);
        controls.enablePan = false; controls.enableDamping = false;
      }
      if (controls) {
        controls.enabled = inspecting;
        if (inspecting && (artifact?.clay ?? lastSnapshot?.clay) && projection) {
          const clay = (artifact?.clay ?? lastSnapshot!.clay)!;
          const decor = artifact?.customization ?? lastSnapshot?.customization;
          const margin = Math.max(0, ...(decor?.attachments ?? []).map(a => a.length));
          const side = Math.max(0, ...(decor?.handles ?? []).filter(h => h.preset !== 'arch').map(h => h.scale * .61));
          const arch = Math.max(0, ...(decor?.handles ?? []).filter(h => h.preset === 'arch').map(h => h.anchor.point.y + h.scale * 1.065 - clay.height));
          controls.target.set(0, (clay.height + arch) / 2, 0);
          const radius = Math.hypot(Math.max(...clay.radii) + Math.max(margin, side), clay.height / 2 + Math.max(margin, arch / 2));
          inspectionDistance = radius / Math.sin(19 * Math.PI / 180) / Math.min(1, projection.viewportWidth / projection.viewportHeight) * 1.25;
          controls.minDistance = radius * 1.3; controls.maxDistance = inspectionDistance * 2.5;
          inspectionView('reset');
        }
      }
    },
    setProjection(p: ProjectionParams): void {
      backdrop.setProjection(p);
      const aspect = p.viewportWidth / p.viewportHeight;
      if (inspecting && controls) {
        // Retain the chosen angle and relative zoom when the viewport narrows.
        // Updating only the perspective aspect crops the vessel after rotation.
        const scale = Math.min(1, inspectionCamera.aspect) / Math.min(1, aspect);
        inspectionDistance *= scale;
        controls.maxDistance *= scale;
        inspectionCamera.position.sub(controls.target).multiplyScalar(scale).add(controls.target);
        controls.update();
      }
      projection = p;
      appearanceRevision++;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      configureCamera(camera, p);
      inspectionCamera.aspect = aspect; inspectionCamera.updateProjectionMatrix();
      renderer?.setPixelRatio(dpr * quality);
      renderer?.setSize(p.viewportWidth, p.viewportHeight, false);
      fallback.width = Math.round(p.viewportWidth * dpr);
      fallback.height = Math.round(p.viewportHeight * dpr);
    },
    setSurface(nextColor: string, gloss = 0, glow = 0): void {
      color = nextColor; surfaceGloss = gloss; surfaceGlow = glow;
      appearanceRevision++;
      applySurface();
    },
    render(snapshot: EngineSnapshot, nowMs: number): void {
      if (!projection) return;
      // Keep hand input responsive on software/low-power graphics. Never relax freshness.
      const elapsed = nowMs - previousRender; previousRender = nowMs;
      // Video callbacks can arrive every second animation frame. Leave headroom for
      // the unchanged 150 ms track-retention limit, not just the 200 ms stale gate.
      // Judge a smoothed frame time, not single hitches: three stray slow frames used to ratchet the
      // canvas down to a quarter resolution for the rest of the session (the blurry, pixelated clay).
      if (elapsed > 0 && elapsed < 1500) frameEma += (elapsed - frameEma) * .1;
      slowFrames = frameEma > 45 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
      fastFrames = frameEma < 30 ? fastFrames + 1 : 0;
      const nextQuality = slowFrames >= SLOW_FRAMES_TO_DROP && quality > MIN_QUALITY ? Math.max(MIN_QUALITY, quality * .85)
        : fastFrames >= 120 && quality < 1 ? Math.min(1, quality / .85) : quality;
      if (nextQuality !== quality && renderer) {
        quality = nextQuality; slowFrames = 0; fastFrames = 0;
        renderer.setPixelRatio(dpr * quality);
        renderer.setSize(projection.viewportWidth, projection.viewportHeight, false);
        const shadowSize = quality <= .41 ? 256 : quality <= .65 ? 512 : 1024;
        if (key.shadow.mapSize.x !== shadowSize) {
          key.shadow.map?.dispose(); key.shadow.map = null;
          key.shadow.mapSize.set(shadowSize, shadowSize); renderer.shadowMap.needsUpdate = true;
        }
        canvas.dataset.renderScale = quality.toFixed(2);
        appearanceRevision++;
      }
      lastSnapshot = snapshot;
      const clay = artifact?.clay ?? snapshot.clay;
      const visible = !!artifact || !['loading', 'permission', 'calibrate', 'gallery'].includes(snapshot.phase);
      pot.group.visible = visible && !!clay;
      wheel.visible = visible && !inspecting;
      stand.visible = wheel.visible; floor.visible = wheel.visible;
      effects.update(snapshot, nowMs, reduced.matches, inspecting);
      if (clay && visible) pot.update(clay, inspecting ? null : snapshot.hint?.band ?? snapshot.gesture?.contact.activeBand ?? null, nowMs, effects.angle, reduced.matches || inspecting);
      if (clay) { const decor = artifact?.customization ?? snapshot.customization ?? emptyDecor; decoration.update(decor, clay); handles.update(decor.handles ?? []); canvas.dataset.handles = String(decor.handles?.length ?? 0); }
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
        // A paused vessel does not need a full WebGL redraw for every camera observation.
        // Input and UI still run at their original cadence and freshness thresholds.
        const model = `${appearanceRevision}:${clay?.revision}:${(artifact?.customization ?? snapshot.customization)?.revision}`;
        const p = inspectionCamera.position, q = inspectionCamera.quaternion;
        const view = `${model}:${p.x},${p.y},${p.z}:${q.x},${q.y},${q.z},${q.w}`;
        renderer.shadowMap.autoUpdate = !inspecting;
        if (model !== shadowRevision) { renderer.shadowMap.needsUpdate = true; shadowRevision = model; }
        if (!inspecting || view !== lastView) {
          try { renderer.render(scene, activeCamera()); lastView = view; } catch { useFallback(); }
        }
      }
      if (!fallback.hidden && context) {
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        context.clearRect(0, 0, projection.viewportWidth, projection.viewportHeight);
        if (clay && visible) drawFallback(context, clay, projection, artifact ? glazeColor(artifact.glazeId) : color, inspecting ? null : snapshot.hint?.band ?? clay.activeBand, nowMs);
      }
    },
    async exportPng(): Promise<Blob | null> {
      try {
        if (!lastSnapshot || !projection) return null;
        const customization = artifact?.customization ?? lastSnapshot.customization;
        if (canvas.hidden && ((customization?.attachments.length ?? 0) + (customization?.stamps.length ?? 0) + (customization?.handles?.length ?? 0) > 0)) return null;
        const source = canvas.hidden ? fallback : canvas;
        const picture = document.createElement('canvas'); picture.width = 1200; picture.height = 1200;
        const ctx = picture.getContext('2d'); if (!ctx || !(artifact?.clay ?? lastSnapshot.clay)) return null;
        const p = projection, clay = (artifact?.clay ?? lastSnapshot.clay)!;
        ctx.fillStyle = '#211d19'; ctx.fillRect(0, 0, 1200, 1200);
        const x = Math.max(0, p.axisXPx - p.pixelsPerWorldUnit * 1.95);
        const y = Math.max(0, p.bottomYPx - (clay.height + .45) * p.pixelsPerWorldUnit);
        const width = Math.min(p.viewportWidth - x, p.pixelsPerWorldUnit * 3.9);
        const height = Math.min(p.viewportHeight - y, p.bottomYPx + p.pixelsPerWorldUnit * .35 - y);
        const scale = Math.min(960 / width, 870 / height), dw = width * scale, dh = height * scale;
        if (!canvas.hidden && renderer) {
          // Frame the selected artifact, including protruding decorations, independently
          // of the user's zoom. Rendering to a target leaves their live camera untouched.
          const bounds = new Box3().setFromObject(pot.group).getBoundingSphere(new Sphere());
          const photoCamera = new PerspectiveCamera(38, 1, .01, 100);
          const direction = inspecting && controls ? inspectionCamera.position.clone().sub(controls.target).normalize() : new Vector3(0, .3, 1).normalize();
          photoCamera.position.copy(bounds.center).addScaledVector(direction, bounds.radius / Math.sin(19 * Math.PI / 180) * 1.12);
          photoCamera.lookAt(bounds.center); photoCamera.updateMatrixWorld();
          const target = new WebGLRenderTarget(1024, 1024); target.texture.colorSpace = SRGBColorSpace;
          const previous = renderer.getRenderTarget(), visibility = [wheel.visible, stand.visible, drops.visible, floor.visible];
          const lightPosition = inspectionFill.position.clone(), lightTarget = inspectionFill.target.position.clone(), lightVisible = inspectionFill.visible;
          const pixels = new Uint8Array(1024 * 1024 * 4);
          try {
            wheel.visible = stand.visible = drops.visible = floor.visible = false;
            inspectionFill.visible = true; inspectionFill.position.copy(photoCamera.position); inspectionFill.target.position.copy(bounds.center);
            renderer.setRenderTarget(target); renderer.render(scene, photoCamera); renderer.readRenderTargetPixels(target, 0, 0, 1024, 1024, pixels);
          } finally {
            renderer.setRenderTarget(previous); target.dispose();
            [wheel.visible, stand.visible, drops.visible, floor.visible] = visibility;
            inspectionFill.visible = lightVisible; inspectionFill.position.copy(lightPosition); inspectionFill.target.position.copy(lightTarget);
          }
          const photo = document.createElement('canvas'); photo.width = photo.height = 1024;
          const photoContext = photo.getContext('2d')!; const data = photoContext.createImageData(1024, 1024);
          for (let row = 0; row < 1024; row++) data.data.set(pixels.subarray((1023 - row) * 4096, (1024 - row) * 4096), row * 4096);
          photoContext.putImageData(data, 0, 0); ctx.drawImage(photo, 120, 135, 960, 960);
        } else {
          const pixelScale = source.width / projection.viewportWidth;
          ctx.drawImage(source, x * pixelScale, y * pixelScale, width * pixelScale, height * pixelScale, (1200 - dw) / 2, 170 + (870 - dh) / 2, dw, dh);
        }
        ctx.fillStyle = '#eedac4'; ctx.textAlign = 'center'; ctx.font = '54px Georgia'; ctx.fillText('K I L N', 600, 100);
        ctx.fillStyle = '#bba58d'; ctx.font = '22px system-ui'; ctx.fillText('Форма, созданная движением', 600, 1120);
        return await new Promise<Blob | null>((resolve) => picture.toBlob(resolve, 'image/png'));
      } catch { return null; }
    },
    dispose(): void {
      canvas.removeEventListener('webglcontextlost', useFallback);
      controls?.dispose(); studioLight?.dispose(); key.shadow.dispose(); renderer?.dispose(); pot.dispose(); wheelGeometry.dispose(); wheelMaterial.dispose();
      decoration.dispose(); handles.dispose(); family.dispose();
      grooveGeometry.dispose(); grooveMaterial.dispose(); markGeometry.dispose(); dropGeometry.dispose(); dropMaterial.dispose();
      slipGeometry.dispose(); slipMaterial.dispose();
      spindleGeometry.dispose(); baseGeometry.dispose(); standMaterial.dispose(); floorGeometry.dispose(); floorMaterial.dispose(); backdrop.dispose();
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
