import { CONFIG } from '../config';
import { TARGETS } from '../engine/target';
import type {
  AppCommand, AppPhase, ClayEvent, ClayEventType, ClayState, CoreController, EngineSnapshot,
  FrameInput, Gesture, GestureState, HandFeatures, Hint, ProjectionParams, SessionResult, SessionStats, Vec2,
} from '../types';

const PHASES: AppPhase[] = ['loading', 'permission', 'calibrate', 'menu', 'tutorial', 'studio', 'glaze', 'firing', 'result', 'gallery'];
const EMPTY: readonly ClayEvent[] = [];
const HAND_POINTS = [[0, 35], [-20, 15], [-35, 0], [-48, -12], [-58, -25], [-25, -10], [-28, -35], [-29, -55], [-30, -75], [0, -15], [0, -42], [0, -68], [0, -88], [23, -10], [25, -37], [27, -59], [29, -78], [40, 0], [45, -22], [49, -42], [52, -56]];
const makeClay = (): ClayState => ({
  revision: 1, radii: Float32Array.from({ length: CONFIG.N_BANDS }, (_, i) => 1 + .12 * Math.sin(i / 47 * Math.PI)),
  height: 1.6, thickness: 1, cavityRadiusWorld: 0, cavityDepthWorld: 0, wobble: 0, damage: new Float32Array(CONFIG.N_BANDS),
  floorThicknessWorld: 1.6, bottomHole: false, safeIndentDepthWorld: .2, maxHeightWorld: CONFIG.MAX_HEIGHT,
  collapsed: false, collapseCause: null, touching: false, activeBand: null,
});

export class MockCore implements CoreController {
  private clay = makeClay();
  private phase: AppPhase = 'menu';
  private projection: ProjectionParams | null = null;
  private input: FrameInput | null = null;
  private gesture: GestureState | null = null;
  private gestureName: Gesture = 'none';
  private pending: ClayEvent[] = [];
  private active = new Map<ClayEventType, ClayEvent>();
  private episode = 0;
  private epoch = 0;
  private frame = 0;
  private lastObservation = -Infinity;
  private paused = false;
  private lost = false;
  private cursor: Vec2 = { x: 0, y: 0 };
  private palmCursor = false;
  private stats: SessionStats = this.newStats('mock-1', 'commission');
  private result: SessionResult | null = null;
  private glazeId: string | null = null;
  private firingAt = 0;
  private expected: Gesture | undefined;
  private hint: Hint | null = null;
  private hintIssue: ClayEvent | undefined;

  private newStats(sessionId: string, mode: SessionStats['mode']): SessionStats {
    return { sessionId, mode, durationMs: 32_000, activeMs: 24_000, executionEpisodes: {}, trackingEpisodes: {}, gestureMs: { shape: 12_000, pullUp: 8_000, compressRim: 4_000 },
      ...(mode === 'commission' ? { targetId: 'vase@1', similarity: { score: 82, radialError: .12, heightError: .17, worstBand: 25, signedRadiusDeltaWorld: .2, signedHeightDeltaWorld: -.2 } } : {}),
    };
  }
  observe(frame: FrameInput): void { this.input = frame; }
  resetInput(epoch: number): void { this.epoch = epoch; this.input = null; this.gesture = null; this.lastObservation = -Infinity; }
  setPaused(paused: boolean): void { this.paused = paused; }
  updateProjection(projection: ProjectionParams): void { this.projection = projection; this.clay.maxHeightWorld = Math.min(CONFIG.MAX_HEIGHT, .75 * projection.bottomYPx / projection.pixelsPerWorldUnit); }
  setCursor(x: number, y: number): void { this.cursor.x = x; this.cursor.y = y; this.gestureName = this.palmCursor ? 'none' : 'point'; }

  dispatch(command: AppCommand, nowMs: number): void {
    switch (command.type) {
      case 'modelReady': this.phase = 'permission'; break;
      case 'start':
        this.clay = makeClay(); this.result = null; this.glazeId = null; this.active.clear(); this.pending = [];
        this.stats = this.newStats(command.sessionId, command.mode);
        this.phase = command.mode === 'tutorial' ? 'tutorial' : 'studio'; break;
      case 'restart': this.dispatch({ type: 'start', mode: this.stats.mode, sessionId: command.newSessionId }, nowMs); break;
      case 'tutorialStep': this.expected = command.expectedGesture; break;
      case 'finishShaping': if (this.phase === 'studio') { this.phase = 'glaze'; this.clay.touching = false; } break;
      case 'selectGlaze': if (this.phase === 'glaze') this.glazeId = command.glazeId; break;
      case 'confirmGlaze': if (this.phase === 'glaze' && this.glazeId) { this.phase = 'firing'; this.firingAt = nowMs; } break;
      case 'openGallery': this.phase = 'gallery'; break;
      case 'backToMenu': this.phase = 'menu'; break;
    }
  }

  key(key: string, nowMs: number): void {
    if (/^[0-9]$/.test(key)) {
      this.phase = PHASES[Number(key)];
      if (this.phase === 'firing') this.firingAt = nowMs;
      if (this.phase === 'result') this.result = this.finalize();
      return;
    }
    const action = ({ s: 'shape', u: 'pullUp', i: 'indent', o: 'open', d: 'compressRim' } as Record<string, Gesture>)[key.toLowerCase()];
    if (action && (this.lost || (this.phase === 'tutorial' && this.expected !== action) || ['bottomHole', 'wallTorn', 'pancake'].includes(this.clay.collapseCause ?? ''))) { this.gestureName = action; return; }
    switch (key.toLowerCase()) {
      case 's': this.gestureName = 'shape'; for (let i = 0; i < this.clay.radii.length; i++) this.clay.radii[i] = Math.max(CONFIG.MIN_R, this.clay.radii[i] - .20 * Math.exp(-.5 * ((i - 24) / CONFIG.SIGMA_BANDS) ** 2)); break;
      case 'u': this.gestureName = 'pullUp'; this.clay.height = Math.min(CONFIG.MAX_HEIGHT, this.clay.height + .30); for (let i = 0; i < this.clay.radii.length; i++) this.clay.radii[i] *= .977; break;
      case 'i': this.gestureName = 'indent'; this.clay.cavityRadiusWorld ||= CONFIG.INDENT_RADIUS_WORLD; this.clay.cavityDepthWorld ||= CONFIG.INDENT_DEPTH_WORLD; break;
      case 'o': this.gestureName = 'open'; if (this.clay.cavityDepthWorld > 0) { this.clay.cavityRadiusWorld = Math.min(.7, this.clay.cavityRadiusWorld + .26); this.clay.cavityDepthWorld = Math.min(this.clay.height - CONFIG.FLOOR_WORLD, this.clay.cavityDepthWorld + .468); } break;
      case 'd': this.gestureName = 'compressRim'; this.clay.height = Math.max(CONFIG.MIN_HEIGHT, this.clay.height - .22); for (let i = 0; i < this.clay.radii.length; i++) this.clay.radii[i] *= 1.018; this.clay.cavityRadiusWorld = Math.max(0, this.clay.cavityRadiusWorld - .066); this.clay.cavityDepthWorld = Math.max(0, this.clay.cavityDepthWorld - .22); this.clay.damage.fill(0); this.clay.collapsed = false; this.clay.collapseCause = null; this.clay.wobble = 0; break;
      case 'escape': this.gestureName = 'none'; break;
      case 'f':
        this.gestureName = 'raise';
        break;
      case 'p': this.palmCursor = false; this.gestureName = 'point'; break;
      case 'h': this.palmCursor = true; this.gestureName = 'none'; break;
      case 'x': this.lost = !this.lost; break;
      case 't': this.issue('tear', nowMs); this.clay.damage[24] = this.active.has('tear') ? .8 : .25; break;
      case 'w': this.issue('wobble', nowMs); this.clay.wobble = this.active.has('wobble') ? .8 : 0; break;
      case 'c': this.issue('collapse', nowMs); this.clay.collapsed = this.active.has('collapse'); this.clay.collapseCause = this.clay.collapsed ? 'thinWall' : null; break;
      case 'b': this.clay.bottomHole = true; this.clay.cavityRadiusWorld = .4; this.clay.cavityDepthWorld = this.clay.height; this.clay.collapsed = true; this.clay.collapseCause = 'bottomHole'; this.issue('collapse', nowMs); break;
      case 'e': this.issue('overStretch', nowMs); break;
      case 'n': this.clay.height = CONFIG.PANCAKE_HEIGHT_WORLD; this.clay.cavityRadiusWorld = this.clay.cavityDepthWorld = 0; this.clay.collapsed = true; this.clay.collapseCause = 'pancake'; this.issue('collapse', nowMs); break;
      case 'arrowleft': case 'arrowright': {
        const sign = key.toLowerCase() === 'arrowleft' ? -1 : 1;
        for (let i = 0; i < this.clay.radii.length; i++) this.clay.radii[i] = Math.max(CONFIG.MIN_R, Math.min(CONFIG.MAX_R, this.clay.radii[i] + sign * .12 * Math.exp(-(((i - 24) / 8) ** 2))));
        break;
      }
    }
    this.clay.cavityDepthWorld = this.clay.bottomHole ? this.clay.height : Math.min(this.clay.cavityDepthWorld, this.clay.height - CONFIG.FLOOR_WORLD);
    this.clay.floorThicknessWorld = this.clay.height - this.clay.cavityDepthWorld;
    const first = this.clay.cavityDepthWorld > 0 ? Math.floor((1 - this.clay.cavityDepthWorld / this.clay.height) * (CONFIG.N_BANDS - 1)) : 0;
    this.clay.thickness = Math.min(...this.clay.radii.slice(first)) - this.clay.cavityRadiusWorld;
    this.clay.revision++;
  }

  private issue(type: ClayEventType, nowMs: number): void {
    const previous = this.active.get(type);
    const event: ClayEvent = previous ? { ...previous, phase: 'end', tMs: nowMs } : {
      episodeId: `mock-${++this.episode}`, type, phase: 'begin', category: 'execution', tMs: nowMs, severity: .8, band: 24,
      ...(type === 'collapse' ? { cause: this.clay.collapseCause ?? 'thinWall' } : {}), data: type === 'wobble' ? { dir: 'left' } : type === 'overStretch' ? { seconds: 7, tearInS: 3 } : { speedRatio: 2 },
    };
    if (previous) this.active.delete(type);
    else { this.active.set(type, event); this.stats.executionEpisodes[type] = (this.stats.executionEpisodes[type] ?? 0) + 1; }
    this.pending.push(event);
  }

  private hand(side: -1 | 1): HandFeatures {
    const p = this.projection!;
    const palmPx = this.palmCursor && side === -1 ? { ...this.cursor } : { x: p.axisXPx + side * 1.1 * p.pixelsPerWorldUnit, y: p.bottomYPx - .8 * p.pixelsPerWorldUnit };
    const landmarksPx = HAND_POINTS.map(([x, y]) => ({ x: palmPx.x + side * x, y: palmPx.y + y }));
    return { trackId: side + 2, palmPx, palmWorld: { x: side * 1.1, y: .8 }, indexTipPx: this.cursor, landmarksPx,
      palmSizePx: 70, referencePalmSizePx: 70, extension: { index: 1, middle: 1, ring: 1, pinky: 1 }, openness: 1, pinchRatio: .7,
      pointing: this.gestureName === 'point', velocityWorldPerS: { x: 0, y: 0 }, velocityPalmPerS: { x: 0, y: 0 }, velocityValid: true };
  }

  private finalize(): SessionResult {
    return { schemaVersion: 3, id: this.stats.sessionId, completedAtIso: new Date().toISOString(), stats: structuredClone(this.stats),
      finalProfile: Array.from(this.clay.radii), height: this.clay.height, thickness: this.clay.thickness,
      cavityRadiusWorld: this.clay.cavityRadiusWorld, cavityDepthWorld: this.clay.cavityDepthWorld,
      floorThicknessWorld: this.clay.floorThicknessWorld, bottomHole: this.clay.bottomHole,
      damage: Array.from(this.clay.damage), collapsed: this.clay.collapsed, glazeId: this.glazeId ?? 'amber' };
  }

  tick(nowMs: number): EngineSnapshot {
    let observed = false;
    if (!this.paused && this.projection && nowMs - this.lastObservation >= 33) {
      observed = true;
      const dtSampleS = Number.isFinite(this.lastObservation) ? (nowMs - this.lastObservation) / 1000 : 0;
      this.lastObservation = nowMs;
      const pointing = this.gestureName === 'point';
      this.input = { frameId: ++this.frame, epoch: this.epoch, tMs: nowMs, receivedAtMs: nowMs, dtSampleS,
        status: this.lost ? 'noHands' : pointing ? 'oneHand' : 'ready', screenLeft: this.lost ? null : this.hand(-1), screenRight: this.lost || pointing ? null : this.hand(1) };
      this.clay.touching = !this.lost && ['studio', 'tutorial'].includes(this.phase) && ['shape', 'pullUp', 'indent', 'open', 'compressRim'].includes(this.gestureName) && (this.phase !== 'tutorial' || this.expected === this.gestureName);
      this.clay.activeBand = this.clay.touching ? 24 : null;
      this.gesture = {
        gesture: this.lost ? 'none' : this.gestureName, sourceFrameId: this.frame, capturedAtMs: nowMs,
        holdMs: 600, inputUsable: !this.lost && !pointing, deforming: this.clay.touching, motionStrength: .7, targetRadiusWorld: 1.1,
        activeTrackId: this.clay.touching && this.gestureName !== 'shape' ? 1 : null,
        supportTrackId: this.clay.touching && this.gestureName !== 'shape' ? 3 : null,
        activationProgress: !this.lost && ['pullUp', 'indent', 'open', 'compressRim'].includes(this.gestureName) ? 1 : 0, engagedMs: this.active.has('overStretch') ? 7000 : 0,
        centerOffsetPalm: this.clay.wobble * .5, speedPalmPerS: this.active.has('tear') ? 12 : 1,
        contact: { valid: !this.lost && this.gestureName === 'shape', activeBand: this.clay.activeBand, bandY: .5, leftErrorWorld: 0, rightErrorWorld: 0, reason: null },
        cursorPx: !this.lost && this.gestureName === 'point' ? this.cursor : null, nearMiss: null,
      };
    }
    if (this.phase === 'firing' && nowMs - this.firingAt >= CONFIG.FIRING_MS) { this.phase = 'result'; this.result = this.finalize(); }
    const events = this.pending.length && (observed || !this.projection) ? this.pending : EMPTY;
    if (events === this.pending) this.pending = [];
    const issue = [...this.active.values()][0];
    if (issue !== this.hintIssue) {
      this.hintIssue = issue;
      this.hint = issue ? { id: issue.type, episodeId: issue.episodeId, params: { ...issue.data, ...(issue.cause ? { cause: issue.cause } : {}) }, severity: 'warn', priority: 50, expiresAtMs: nowMs + 4000, speak: true, band: issue.band } : null;
    }
    return { phase: this.phase, mode: this.stats.mode, calibrationProgress: this.phase === 'calibrate' ? .6 : 1,
      input: this.input, clay: this.clay, gesture: this.gesture, events, activeIssues: [...this.active.values()],
      hint: this.hint,
      stats: this.stats, result: this.result, target: this.stats.mode === 'commission' ? TARGETS[0] : null, glazeId: this.glazeId };
  }
}

export function installMockCore() {
  const core = new MockCore();
  const badge = document.createElement('aside');
  badge.dataset.testid = 'mock-badge';
  badge.textContent = 'KILN_DEV_MOCK · 0–9 phases · S/U/I/O/D actions · Esc release · F raised palms · T/W/C issues · X hands · ←/→ shape · H palm / P finger cursor';
  badge.style.cssText = 'position:fixed;bottom:8px;left:8px;right:8px;z-index:9999;padding:8px;background:#191919;color:#9f9;font:11px monospace;pointer-events:none';
  document.body.append(badge);
  const key = (event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
    if (event.key.startsWith('Arrow')) event.preventDefault();
    core.key(event.key, performance.now());
  };
  const move = (event: PointerEvent) => core.setCursor(event.clientX, event.clientY);
  window.addEventListener('keydown', key);
  window.addEventListener('pointermove', move);
  return { core, destroy: () => { window.removeEventListener('keydown', key); window.removeEventListener('pointermove', move); badge.remove(); } };
}
