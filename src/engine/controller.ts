// CoreController (types.ts). Studio phase only for now; the phase FSM arrives in A4.
// observe() is the only place clay changes; tick() only advances timers (hint expiry).
import { CONFIG } from '../config';
import { GestureRecognizer } from '../tracking/gestures';
import type {
  AppCommand, AppPhase, ClayEvent, CoreController, EngineSnapshot, FrameInput, GestureContext, GestureState, Hint,
  ProjectionParams, SessionMode,
} from '../types';
import { createClay, NO_EFFECTS, stepClay, type ClayEffects, type ClayModel } from './clay';
import { HintManager } from './hints';
import { RuleEngine } from './rules';

export function createController(): CoreController {
  return new Controller();
}

const UI_PHASES: readonly AppPhase[] = ['menu', 'tutorial', 'studio', 'glaze', 'result', 'gallery'];

class Controller implements CoreController {
  private phase: AppPhase = 'studio';
  private mode: SessionMode | null = 'free';
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
  private readonly gestures = new GestureRecognizer();
  private readonly rules = new RuleEngine();
  private readonly hints = new HintManager();

  observe(frame: FrameInput): void {
    if (frame.epoch < this.epoch) return; // frame from before a camera/viewport reset
    if (frame.epoch > this.epoch) this.resetInput(frame.epoch);
    // freshness gate: an observation that arrived too late never moves clay
    const stale = frame.receivedAtMs - frame.tMs > CONFIG.MAX_INPUT_AGE_MS;
    this.input = stale ? { ...frame, status: 'stale' } : frame;
    if (this.paused || !this.projection) return;

    const ctx: GestureContext = {
      phase: this.phase, potHeightWorld: this.clay.height, uiEnabled: UI_PHASES.includes(this.phase),
    };
    this.gesture = this.gestures.update(this.input, ctx, this.clay, this.projection);
    if (this.phase !== 'studio' && this.phase !== 'tutorial') return;

    // consequences of episodes active since the last observation (one-frame lag is invisible)
    this.clay = stepClay(this.clay, this.gesture, Math.min(frame.dtSampleS, CONFIG.MAX_STEP_S), this.effects);
    const out = this.rules.update({
      tMs: frame.tMs, phase: this.phase, input: this.input, gesture: this.gesture, clay: this.clay,
    });
    this.effects = out.effects;
    this.activeIssues = out.active;
    this.pendingEvents.push(...out.events);
    this.hint = this.hints.update({
      tMs: frame.tMs, events: out.events, active: out.active, gesture: this.gesture, clay: this.clay,
    });
  }

  tick(nowMs: number): EngineSnapshot {
    // tracker stalled: show "not touching" right away and drop holds; clay itself is untouched
    const stale = this.input !== null && nowMs - this.input.tMs > CONFIG.MAX_INPUT_AGE_MS;
    if (stale) this.gestures.reset();
    const gesture = stale && this.gesture ? { ...this.gesture, inputUsable: false, deforming: false } : this.gesture;
    const clay = stale && this.clay.touching ? { ...this.clay, touching: false, activeBand: null } : this.clay;
    this.hint = this.hints.expire(nowMs);
    const events = this.pendingEvents;
    this.pendingEvents = [];
    return {
      phase: this.phase,
      mode: this.mode,
      calibrationProgress: 0,
      input: this.input,
      clay,
      gesture,
      events,
      activeIssues: this.activeIssues,
      hint: this.hint,
      stats: null,
      result: null,
    };
  }

  dispatch(command: AppCommand, _nowMs: number): void {
    switch (command.type) {
      case 'start':
        this.phase = command.mode === 'tutorial' ? 'tutorial' : 'studio';
        this.mode = command.mode;
        this.freshSession();
        break;
      case 'restart':
        this.freshSession();
        break;
      default:
        break; // remaining commands: A4
    }
  }

  resetInput(epoch: number): void {
    this.epoch = epoch;
    this.input = null;
    this.gesture = null;
    this.gestures.reset();
  }

  setPaused(paused: boolean, _nowMs: number): void {
    this.paused = paused;
    this.gesture = null;
    this.gestures.reset();
  }

  updateProjection(projection: ProjectionParams): void {
    this.projection = projection;
  }

  private freshSession(): void {
    this.clay = createClay();
    this.gesture = null;
    this.effects = NO_EFFECTS;
    this.activeIssues = [];
    this.pendingEvents = [];
    this.hint = null;
    this.gestures.reset();
    this.rules.reset();
    this.hints.reset();
  }
}
