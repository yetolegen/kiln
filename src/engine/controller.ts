// CoreController (types.ts): phase FSM (PLAN §11), freshness gate, wiring of the whole core.
//   loading → permission → calibrate → menu
//   menu → tutorial → menu
//   menu → studio(free|commission) → glaze → firing → result → gallery / menu
// observe() is the only place clay changes; tick() only advances timers (firing, hint expiry).
import { CONFIG } from '../config';
import { GestureRecognizer } from '../tracking/gestures';
import type {
  AppCommand, AppPhase, ClayEvent, CoreController, EngineSnapshot, FrameInput, GestureContext, GestureState, Hint,
  ProjectionParams, SessionMode, SessionResult, TargetProfile,
} from '../types';
import { createClay, NO_EFFECTS, stepClay, type ClayEffects, type ClayLimits, type ClayModel } from './clay';
import { palmWorldSize } from './contact';
import { HintManager } from './hints';
import { RuleEngine } from './rules';
import { SessionTracker } from './session';
import { getTarget, similarity, targetKey } from './target';
import { readCheckpoint, terminalClay, type Checkpoint } from './checkpoint';
import { customizationFits, emptyCustomization, readCustomization } from './customization';
import { isMaterial } from './materials';

export interface ControllerOptions {
  /** Wall-clock timestamp for SessionResult.completedAtIso. The core never reads the clock itself. */
  nowIso?: () => string;
}

/** Snapshots hand out the controller's own customization: a frozen copy so no consumer can change it in place. */
function sealed<T>(value: T): T {
  const freeze = (v: unknown): void => {
    if (v === null || typeof v !== 'object' || Object.isFrozen(v)) return;
    for (const k of Object.keys(v)) freeze((v as Record<string, unknown>)[k]);
    Object.freeze(v);
  };
  const copy = structuredClone(value); freeze(copy); return copy;
}

export function createController(options: ControllerOptions = {}): CoreController {
  return new Controller(options.nowIso ?? (() => ''));
}

const UI_PHASES: readonly AppPhase[] = ['menu', 'tutorial', 'studio', 'glaze', 'result', 'gallery'];
const isShaping = (p: AppPhase) => p === 'studio' || p === 'tutorial';

class Controller implements CoreController {
  private phase: AppPhase = 'loading';
  private mode: SessionMode | null = null;
  private projection: ProjectionParams | null = null;
  private epoch = 0;
  private paused = false;
  private input: FrameInput | null = null;
  private gesture: GestureState | null = null;
  private clay: ClayModel = createClay();
  private effects: ClayEffects = NO_EFFECTS;
  private pendingEvents: ClayEvent[] = [];
  private activeIssues: readonly ClayEvent[] = [];
  private hint: Hint | null = null;
  private session: SessionTracker | null = null;
  private target: TargetProfile | null = null;
  private expectedGesture: GestureContext['expectedGesture'];
  private tutorialStepIndex: number | null = null;
  private calibrationStillMs = 0;
  private raiseArmed = true;
  private glazeId: string | null = null;
  private firingStartMs = 0;
  private result: SessionResult | null = null;
  private epochWarned = false;
  private safeIndentDepthWorld: number = CONFIG.SAFE_INDENT_MIN_WORLD;
  private restoredAtMs = -Infinity;
  private needsRelease = false;
  private customization = sealed(emptyCustomization());

  /**
   * v5 limits from outside the clay: the screen ceiling (75 % of the space above the pot base) and the
   * safe indentation (~one thumb phalanx of THIS user's measured palm; kept while hands are out of view).
   */
  private limits(frame: FrameInput): ClayLimits {
    const p = this.projection!;
    const hands = [frame.screenLeft, frame.screenRight].filter((h): h is NonNullable<typeof h> => h !== null);
    if (hands.length) {
      this.safeIndentDepthWorld = Math.max(CONFIG.SAFE_INDENT_MIN_WORLD, CONFIG.SAFE_INDENT_PALM * palmWorldSize(p.pixelsPerWorldUnit, ...hands));
    }
    const ceiling = (CONFIG.SCREEN_HEIGHT_FRACTION * p.bottomYPx) / p.pixelsPerWorldUnit;
    return { maxHeightWorld: Math.min(CONFIG.MAX_HEIGHT, ceiling), safeIndentDepthWorld: this.safeIndentDepthWorld };
  }
  private readonly gestures = new GestureRecognizer();
  private readonly rules = new RuleEngine();
  private readonly hints = new HintManager();

  constructor(private readonly nowIso: () => string) {}

  observe(frame: FrameInput): void {
    if (frame.tMs <= this.restoredAtMs) return;
    if (frame.epoch < this.epoch) { // frame from before a camera/viewport reset
      if (!this.epochWarned) console.warn(`KILN: dropping frames from epoch ${frame.epoch} < ${this.epoch}. Set tracker.epoch too.`);
      this.epochWarned = true;
      return;
    }
    if (frame.epoch > this.epoch) this.resetInput(frame.epoch);
    // the same observation twice must not deform twice (holds and shaping would double)
    if (this.input && this.input.frameId === frame.frameId && this.input.epoch === frame.epoch) return;
    // freshness gate: an observation that arrived too late never moves clay or confirms anything
    const stale = frame.receivedAtMs - frame.tMs > CONFIG.MAX_INPUT_AGE_MS;
    this.input = stale ? { ...frame, status: 'stale' } : frame;
    if (this.paused || !this.projection) return;

    const ctx: GestureContext = {
      phase: this.phase,
      expectedGesture: this.phase === 'tutorial' ? this.expectedGesture : undefined,
      potHeightWorld: this.clay.height,
      uiEnabled: UI_PHASES.includes(this.phase),
    };
    this.gesture = this.gestures.update(this.input, ctx, this.clay, this.projection);

    if (this.needsRelease) {
      const g = this.gesture;
      if (!stale && (frame.status === 'ready' || frame.status === 'oneHand') &&
          !g.contact.valid && g.activeTrackId === null && !g.deforming &&
          ['none', 'point', 'oneHand'].includes(g.gesture)) this.needsRelease = false;
      this.gestures.reset(); this.gesture = null;
      return;
    }

    if (this.phase === 'calibrate') return this.calibrate(this.input);
    if (!isShaping(this.phase)) return;

    // consequences of episodes active since the last observation (one-frame lag is invisible)
    this.clay = stepClay(
      this.clay, this.gesture, Math.min(frame.dtSampleS, CONFIG.MAX_STEP_S), this.effects, this.gestures.delta,
      this.limits(frame),
    );
    const out = this.rules.update({
      tMs: frame.tMs, phase: this.phase, input: this.input, gesture: this.gesture, clay: this.clay,
      target: this.mode === 'commission' ? this.target : null,
    });
    this.effects = out.effects;
    this.activeIssues = out.active;
    this.pendingEvents.push(...out.events);
    // gaps longer than the stale limit (tracker stalled) don't count as time spent in a gesture
    this.session?.record(out.events, this.gesture, Math.min(frame.dtSampleS, CONFIG.MAX_INPUT_AGE_MS / 1000));
    this.hint = this.hints.update({
      tMs: frame.tMs, events: out.events, active: out.active, gesture: this.gesture, clay: this.clay,
    });
    this.checkRaise(frame.tMs);
  }

  tick(nowMs: number): EngineSnapshot {
    if (this.phase === 'firing' && nowMs - this.firingStartMs >= CONFIG.FIRING_MS && this.session) {
      this.result = this.session.finalize(this.clay, this.glazeId ?? '', this.nowIso(), nowMs, this.customization);
      this.phase = 'result';
    }
    // tracker stalled: show "not touching" right away and drop holds; clay itself is untouched
    const stale = this.input !== null && nowMs - this.input.tMs > CONFIG.MAX_INPUT_AGE_MS;
    if (stale) this.gestures.reset();
    const gesture = stale && this.gesture
      ? { ...this.gesture, inputUsable: false, deforming: false, cursorPx: null }
      : this.gesture;
    const clay = stale && this.clay.touching ? { ...this.clay, touching: false, activeBand: null } : this.clay;
    this.hint = this.hints.expire(nowMs);
    const events = this.pendingEvents;
    this.pendingEvents = [];
    return {
      customization: this.customization,
      phase: this.phase,
      mode: this.mode,
      calibrationProgress: this.phase === 'calibrate'
        ? Math.min(1, this.calibrationStillMs / CONFIG.CALIBRATION_STILL_MS)
        : this.phase === 'loading' || this.phase === 'permission' ? 0 : 1,
      input: this.input,
      clay,
      gesture,
      events,
      activeIssues: this.activeIssues,
      hint: this.hint,
      stats: this.session?.stats(nowMs) ?? null,
      result: this.result,
      // only while a session is on screen: mode is null in the menu
      target: this.mode === 'commission' ? this.target : null,
      glazeId: this.mode ? this.glazeId : null,
    };
  }

  dispatch(command: AppCommand, nowMs: number): void {
    // commands that don't fit the current phase are ignored, so a late dwell can't skip a screen
    switch (command.type) {
      case 'customize': {
        const value = readCustomization(command.value);
        if (this.phase === 'glaze' && value && customizationFits(value, this.clay)) this.customization = sealed({ ...value, revision: this.customization.revision + 1 });
        break;
      }
      case 'modelReady':
        if (this.phase === 'loading') this.phase = 'permission';
        break;
      case 'start':
        if (this.phase !== 'menu') break;
        this.startSession(command.mode, command.sessionId, command.targetId, nowMs);
        this.phase = command.mode === 'tutorial' ? 'tutorial' : 'studio';
        break;
      case 'restart': {
        if (!isShaping(this.phase) || !this.session) break;
        const step = this.expectedGesture; // "start over" in the tutorial stays on the same step
        this.startSession(this.session.mode, command.newSessionId, this.session.targetId, nowMs);
        this.expectedGesture = step;
        break;
      }
      case 'finishShaping':
        if (this.phase === 'studio' && !terminalClay(this.clay)) this.finishShaping(nowMs);
        break;
      case 'selectGlaze':
        if (this.phase === 'glaze' && isMaterial(command.glazeId)) this.glazeId = command.glazeId;
        break;
      case 'confirmGlaze':
        if (this.phase === 'glaze' && this.glazeId !== null) {
          this.phase = 'firing';
          this.firingStartMs = nowMs;
        }
        break;
      case 'openGallery':
        if (this.phase === 'result' || this.phase === 'menu') this.phase = 'gallery';
        break;
      case 'backToMenu':
        if (isShaping(this.phase)) this.leaveShaping(nowMs);
        if (['tutorial', 'studio', 'glaze', 'result', 'gallery'].includes(this.phase)) this.toMenu();
        break;
      case 'tutorialStep':
        if (this.phase === 'tutorial') {
          this.gestures.resetShapeContact();
          // a NEW step drops the previous step's action and coaching; re-sending the same step (the lesson's
          // freeze/unfreeze) keeps the held action so its real release can still be seen
          if (command.step !== this.tutorialStepIndex) this.gestures.resetAction();
          this.tutorialStepIndex = command.step;
          this.expectedGesture = command.expectedGesture;
          this.raiseArmed = true; // a new step is a new screen for one-shot purposes
        }
        break;
    }
  }

  resetInput(epoch: number): void {
    this.restoredAtMs = -Infinity; // a new input epoch may restart its clock
    this.epoch = epoch;
    this.input = null;
    this.gesture = null;
    this.calibrationStillMs = 0;
    this.gestures.reset();
  }

  captureCheckpoint(nowMs: number): Checkpoint | null {
    if (!['studio', 'glaze'].includes(this.phase) || !this.session || !this.mode || this.mode === 'tutorial' ||
        terminalClay(this.clay) || this.clay.touching || this.gesture?.deforming || (this.gesture?.activationProgress ?? 0) > 0) return null;
    return readCheckpoint({ version: 1, mode: this.mode, stage: this.phase, targetId: this.session.targetId,
      glazeId: this.glazeId, clay: { ...this.clay, radii: Array.from(this.clay.radii), damage: Array.from(this.clay.damage) },
      stats: this.session.stats(nowMs), customization: this.customization });
  }

  restoreCheckpoint(value: unknown, nowMs: number, sessionId?: string): boolean {
    if (!['menu', 'studio', 'glaze'].includes(this.phase)) return false;
    const saved = readCheckpoint(value);
    if (!saved) return false;
    const previous = this.phase === 'menu' ? saved.stats : this.session?.stats(nowMs) ?? saved.stats;
    const editMistakes = this.phase === 'menu' ? saved.customization.editMistakes : this.customization.editMistakes;
    const session = new SessionTracker(sessionId ?? this.session?.sessionId ?? saved.stats.sessionId,
      saved.mode, nowMs, saved.targetId, previous);
    if (saved.stage === 'glaze') session.freeze(nowMs, saved.mode === 'commission' ? similarity(saved.clay.radii, saved.clay.height, getTarget(saved.targetId)) : undefined);
    // end (not just forget) whatever was running: consumers must never see a begin without an end
    const ended = this.rules.closeAll(nowMs);
    this.clay = { ...saved.clay, revision: Math.max(this.clay.revision, saved.clay.revision) + 1,
      radii: Float32Array.from(saved.clay.radii), damage: Float32Array.from(saved.clay.damage), touching: false, activeBand: null };
    this.session = session; this.mode = saved.mode; this.phase = saved.stage;
    this.customization = sealed({ ...saved.customization, editMistakes, revision: this.customization.revision + 1 });
    this.target = saved.mode === 'commission' ? getTarget(saved.targetId) : null;
    this.glazeId = saved.glazeId; this.result = null; this.pendingEvents = ended; this.activeIssues = [];
    this.effects = NO_EFFECTS; this.hint = null; this.hints.reset(); this.gestures.reset();
    this.input = null; this.gesture = null; this.expectedGesture = undefined; this.tutorialStepIndex = null;
    this.raiseArmed = true; this.firingStartMs = 0; this.needsRelease = true; this.restoredAtMs = nowMs;
    return true;
  }

  setPaused(paused: boolean, _nowMs: number): void {
    this.paused = paused;
    this.gesture = null;
    this.gestures.reset();
  }

  updateProjection(projection: ProjectionParams): void {
    this.gestures.resetShapeContact();
    this.projection = projection;
    // a projection needs real video dimensions, so the camera is running
    if (this.phase === 'loading' || this.phase === 'permission') this.phase = 'calibrate';
  }

  // both hands visible and held still for CALIBRATION_STILL_MS (same rule features.ts uses to lock palm size)
  private calibrate(frame: FrameInput): void {
    const hands = [frame.screenLeft, frame.screenRight];
    const still = frame.status === 'ready' && hands.every((h) =>
      h && h.velocityValid && Math.hypot(h.velocityPalmPerS.x, h.velocityPalmPerS.y) < CONFIG.CALIBRATION_STILL_PALM_PER_S);
    this.calibrationStillMs = still
      ? this.calibrationStillMs + Math.min(frame.dtSampleS, CONFIG.MAX_INPUT_AGE_MS / 1000) * 1000
      : 0;
    if (this.calibrationStillMs >= CONFIG.CALIBRATION_STILL_MS) this.phase = 'menu';
  }

  // raise fires ONCE, then needs a release (or a new screen) before it can fire again
  private checkRaise(tMs: number): void {
    const g = this.gesture;
    if (!g || g.gesture !== 'raise') {
      this.raiseArmed = true;
      return;
    }
    if (!this.raiseArmed || !g.inputUsable || g.holdMs < CONFIG.HOLD_FIRE_MS) return;
    this.raiseArmed = false;
    // studio → glaze only via the explicit finishShaping command («Готово»); raised hands never finish a pot
    if (this.phase === 'tutorial' && this.expectedGesture === 'raise') {
      this.leaveShaping(tMs);
      this.toMenu();
    }
  }

  /** No session on screen in the menu; the last result/stats stay readable until the next start. */
  private toMenu(): void {
    this.phase = 'menu';
    this.mode = null;
    this.expectedGesture = undefined;
  }

  private startSession(mode: SessionMode, sessionId: string, targetId: string | undefined, nowMs: number): void {
    this.customization = sealed(emptyCustomization());
    this.restoredAtMs = -Infinity; // a new session never inherits the previous restore's frame cut-off
    this.needsRelease = false;
    // a new session never inherits the previous one's mistakes (tutorial tears don't count later)
    this.target = mode === 'commission' ? getTarget(targetId) : null;
    this.session = new SessionTracker(sessionId, mode, nowMs, this.target ? targetKey(this.target) : undefined);
    this.mode = mode;
    this.clay = createClay();
    this.effects = NO_EFFECTS;
    this.activeIssues = [];
    this.hint = null;
    this.expectedGesture = undefined;
    this.tutorialStepIndex = null;
    this.raiseArmed = true;
    this.glazeId = null;
    this.result = null;
    this.gesture = null;
    this.gestures.reset();
    // end (not just forget) whatever was running, e.g. "start over" mid-wobble; B must never see a begin without an end
    this.pendingEvents.push(...this.rules.closeAll(nowMs));
    this.hints.reset();
  }

  /** Freeze the pot: from here on only glaze and firing, nothing changes the shape or the stats. */
  private finishShaping(tMs: number): void {
    const sim = this.target ? similarity(this.clay.radii, this.clay.height, this.target) : undefined;
    this.session?.freeze(tMs, sim); // before leaveShaping, whose own freeze() would drop the score
    this.leaveShaping(tMs);
    this.phase = 'glaze';
  }

  private leaveShaping(tMs: number): void {
    this.pendingEvents.push(...this.rules.closeAll(tMs));
    this.session?.freeze(tMs);
    this.activeIssues = [];
    this.effects = NO_EFFECTS;
    this.hint = null;
    this.hints.reset();
    this.clay = { ...this.clay, touching: false, activeBand: null };
  }
}
