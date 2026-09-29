/**
 * KILN: core/frontend data contract, revision 3 (final).
 * This file contains types, NOT an implemented pottery engine.
 * No DOM, Three.js, MediaPipe, storage or audio imports are allowed here.
 * Units: Px = CSS pixels; World = arbitrary game units, never centimetres;
 * Palm = calibrated palm lengths; all timestamps share the main page's clock.
 */
export interface Vec2 { x: number; y: number }
export interface Vec3 { x: number; y: number; z: number }
export type SessionMode = 'tutorial' | 'free' | 'commission';
export type AppPhase =
  | 'loading' | 'permission' | 'calibrate' | 'menu' | 'tutorial'
  | 'studio' | 'glaze' | 'firing' | 'result' | 'gallery';

export interface ProjectionParams {
  revision: number;
  videoWidth: number;
  videoHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  fit: 'cover' | 'contain';
  mirrored: boolean;
  axisXPx: number;
  bottomYPx: number;
  pixelsPerWorldUnit: number;
}

/** Raw MediaPipe output. Array position is NOT a persistent hand identity. */
export interface RawHand {
  landmarks: readonly Vec3[];       // 21, source image coordinates, NOT mirrored
  worldLandmarks?: readonly Vec3[]; // hand-local coordinates; not a shared 3-D frame
  handedness?: 'Left' | 'Right';     // optional metadata, not screen side
  handednessScore?: number;         // classification score, NOT tracking quality
}
export interface TrackingPacket {
  frameId: number;
  epoch: number;                    // increased after camera/projection reset
  capturedAtMs: number;             // main-page timestamp assigned on frame submission
  receivedAtMs: number;             // assigned on the main page when inference returns
  mediaTimeMs: number;              // video time; deduplication, not simulation clock
  hands: readonly RawHand[];
}
export type TrackingStatus =
  | 'ready' | 'noHands' | 'oneHand' | 'invalidLandmarks' | 'outOfFrame'
  | 'ambiguousTracks' | 'reacquiring' | 'stale';
export interface FingerExtension {
  index: number;
  middle: number;
  ring: number;
  pinky: number;                    // each 0 = curled, 1 = extended
}
export interface HandFeatures {
  trackId: number;
  palmPx: Vec2;                     // mirrored viewport; x right, y DOWN
  palmWorld: Vec2;                  // interaction plane; x right, y UP
  indexTipPx: Vec2;
  landmarksPx: readonly Vec2[];     // 21 points, mirrored viewport px, for the overlay to draw
  palmSizePx: number;
  referencePalmSizePx: number;      // robust calibration baseline
  extension: FingerExtension;
  openness: number;                 // diagnostic average; not sufficient to detect fist
  pinchRatio: number;               // distance(thumb tip, index tip) / palmSizePx
  pointing: boolean;
  velocityWorldPerS: Vec2;          // x right, y UP
  velocityPalmPerS: Vec2;           // x right, y UP
  velocityValid: boolean;
}
export interface FrameInput {
  frameId: number;
  epoch: number;
  tMs: number;                      // source capture timestamp
  receivedAtMs: number;             // when input became available on the main page
  dtSampleS: number;                // time between distinct observations, not render frames
  status: TrackingStatus;
  screenLeft: HandFeatures | null;  // assigned AFTER persistent track filtering
  screenRight: HandFeatures | null;
}

export type Gesture =
  | 'none' | 'oneHand' | 'shape' | 'pullUp' | 'pressDown' | 'raise' | 'point';
export type NearMissReason =
  | 'pinchLoose' | 'fistLoose' | 'handsTooLow' | 'handsTooFar'
  | 'handsUneven' | 'notMoving' | 'handsNotOpposite';
export interface NearMiss {
  intended: 'shape' | 'pullUp' | 'pressDown' | 'raise';
  reason: NearMissReason;
  handTrackId?: number;
  params: Readonly<Record<string, number | string>>;
}
export interface ContactState {
  valid: boolean;
  activeBand: number | null;
  bandY: number | null;             // relative height 0..1; null before valid contact
  leftErrorWorld: number | null;    // signed displacement from left wall
  rightErrorWorld: number | null;   // signed displacement from right wall
  reason: NearMissReason | null;
}
export interface GestureContext {
  phase: AppPhase;
  expectedGesture?: 'shape' | 'pullUp' | 'pressDown' | 'raise';
  potHeightWorld: number;
  uiEnabled: boolean;
}
export interface GestureState {
  gesture: Gesture;
  sourceFrameId: number;
  capturedAtMs: number;
  holdMs: number;
  inputUsable: boolean;
  deforming: boolean;
  motionStrength: number;           // 0..1; zero for stationary pull/press
  targetRadiusWorld: number | null;
  centerOffsetPalm: number | null;
  speedPalmPerS: number;
  contact: ContactState;
  cursorPx: Vec2 | null;
  nearMiss: NearMiss | null;
}

export type CollapseCause = 'thinWall' | 'tooTall';
export interface ClayState {
  revision: number;
  radii: Float32Array;              // 48 outer radii, bottom -> top, game units
  height: number;
  thickness: number;                // single game-model thickness, not real material physics
  wobble: number;                   // 0..1
  damage: Float32Array;             // 48 values in 0..1
  collapsed: boolean;
  collapseCause: CollapseCause | null;
  touching: boolean;
  activeBand: number | null;
}
export type ClayEventType =
  | 'tear' | 'wobble' | 'collapse' | 'overhang' | 'tooThin'
  | 'offWheel' | 'handsTooFar' | 'oneHand' | 'noHands'
  | 'trackingUncertain' | 'targetMismatch';
export type IssueCategory = 'execution' | 'tracking' | 'coaching';
export interface ClayEvent {
  episodeId: string;
  type: ClayEventType;
  phase: 'begin' | 'update' | 'end';
  category: IssueCategory;
  tMs: number;
  severity: number;
  band?: number;
  cause?: CollapseCause | 'tooWide' | 'tooNarrow' | 'tooHigh' | 'tooLow';
  data: Readonly<Record<string, number | string>>;
}
export interface Hint {
  id: ClayEventType | NearMissReason | 'atLimit' | 'recovered';
  episodeId?: string;
  params: Readonly<Record<string, number | string>>;
  severity: 'info' | 'warn' | 'error';
  priority: number;
  expiresAtMs: number;
  band?: number;
  handTrackId?: number;
  speak: boolean;                   // request to audio adapter, never a success condition
}

export interface TargetProfile {
  id: string;
  version: number;
  name: string;
  height: number;
  radii: readonly number[];
}
export interface SimilarityResult {
  score: number;
  radialError: number;
  heightError: number;
  worstBand: number;
  signedRadiusDeltaWorld: number;   // positive = too wide; negative = too narrow
  signedHeightDeltaWorld: number;
}
export interface SessionStats {
  sessionId: string;
  mode: SessionMode;
  durationMs: number;
  activeMs: number;
  executionEpisodes: Partial<Record<ClayEventType, number>>;
  trackingEpisodes: Partial<Record<ClayEventType, number>>;
  gestureMs: Partial<Record<Gesture, number>>;
  targetId?: string;
  similarity?: SimilarityResult;
}
export interface SessionResult {
  schemaVersion: 1;
  id: string;
  completedAtIso: string;           // supplied by browser adapter on finalization
  stats: SessionStats;
  finalProfile: number[];           // copies, not live Float32Array references
  height: number;
  thickness: number;
  damage: number[];
  collapsed: boolean;
  glazeId: string;
}
export type AppCommand =
  | { type: 'start'; mode: SessionMode; sessionId: string; targetId?: string }
  | { type: 'restart'; newSessionId: string }
  | { type: 'finishShaping' }
  | { type: 'selectGlaze'; glazeId: string }
  | { type: 'confirmGlaze' }
  | { type: 'openGallery' }
  | { type: 'backToMenu' }
  // B's tutorial script tells the core which gesture the current step expects
  | { type: 'tutorialStep'; step: number; expectedGesture?: 'shape' | 'pullUp' | 'pressDown' | 'raise' };
export interface DwellTarget {
  id: string;
  x: number; y: number; width: number; height: number; // CSS-pixel rectangle
  command: AppCommand;
}
export interface EngineSnapshot {
  phase: AppPhase;
  mode: SessionMode | null;
  calibrationProgress: number;       // 0..1 during 'calibrate'
  input: FrameInput | null;          // latest processed input (overlay draws landmarks from it)
  clay: ClayState | null;
  gesture: GestureState | null;
  events: readonly ClayEvent[];      // new transitions for THIS tick; consumers don't replay them
  activeIssues: readonly ClayEvent[];
  hint: Hint | null;
  stats: SessionStats | null;
  result: SessionResult | null;
}

/**
 * Core functions use injected clocks and numerical inputs; no implicit Date.now().
 * Implemented by engine/controller.ts (A). B uses dev/mockCore.ts with the same interface until A's is ready.
 */
export interface CoreController {
  observe(frame: FrameInput): void;
  dispatch(command: AppCommand, nowMs: number): void;
  tick(nowMs: number): EngineSnapshot;
  resetInput(epoch: number): void;
  setPaused(paused: boolean, nowMs: number): void;
  updateProjection(projection: ProjectionParams): void;
}
