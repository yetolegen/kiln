// CoreController (types.ts). A2 skeleton: studio phase only, shape only.
// observe() is the only place clay changes; tick() is read-only apart from timers.
import { CONFIG } from '../config';
import { GestureRecognizer } from '../tracking/gestures';
import type {
  AppCommand, AppPhase, ClayState, CoreController, EngineSnapshot, FrameInput, GestureContext, GestureState,
  ProjectionParams, SessionMode,
} from '../types';
import { createClay, stepClay } from './clay';

export function createController(): CoreController {
  return new Controller();
}

class Controller implements CoreController {
  private phase: AppPhase = 'studio'; // phase FSM arrives in A4
  private mode: SessionMode | null = 'free';
  private projection: ProjectionParams | null = null;
  private epoch = 0;
  private paused = false;
  private input: FrameInput | null = null;
  private gesture: GestureState | null = null;
  private clay: ClayState = createClay();
  private readonly gestures = new GestureRecognizer();

  observe(frame: FrameInput): void {
    if (frame.epoch < this.epoch) return; // frame from before a camera/viewport reset
    if (frame.epoch > this.epoch) this.resetInput(frame.epoch);
    // freshness gate: an observation that arrived too late never moves clay
    const stale = frame.receivedAtMs - frame.tMs > CONFIG.MAX_INPUT_AGE_MS;
    this.input = stale ? { ...frame, status: 'stale' } : frame;
    if (this.paused || !this.projection) return;

    const ctx: GestureContext = { phase: this.phase, potHeightWorld: this.clay.height, uiEnabled: false };
    this.gesture = this.gestures.update(this.input, ctx, this.clay, this.projection);
    if (this.phase === 'studio' || this.phase === 'tutorial') {
      this.clay = stepClay(this.clay, this.gesture, Math.min(frame.dtSampleS, CONFIG.MAX_STEP_S));
    }
  }

  tick(nowMs: number): EngineSnapshot {
    // tracker stalled: show "not touching" right away and drop holds; clay itself is untouched
    const stale = this.input !== null && nowMs - this.input.tMs > CONFIG.MAX_INPUT_AGE_MS;
    if (stale) this.gestures.reset();
    const gesture = stale && this.gesture ? { ...this.gesture, inputUsable: false, deforming: false } : this.gesture;
    const clay = stale && this.clay.touching ? { ...this.clay, touching: false, activeBand: null } : this.clay;
    return {
      phase: this.phase,
      mode: this.mode,
      calibrationProgress: 0,
      input: this.input,
      clay,
      gesture,
      events: [],
      activeIssues: [],
      hint: null,
      stats: null,
      result: null,
    };
  }

  dispatch(command: AppCommand, _nowMs: number): void {
    switch (command.type) {
      case 'start':
        this.phase = command.mode === 'tutorial' ? 'tutorial' : 'studio';
        this.mode = command.mode;
        this.freshClay();
        break;
      case 'restart':
        this.freshClay();
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

  private freshClay(): void {
    this.clay = createClay();
    this.gesture = null;
    this.gestures.reset();
  }
}
