import { createController } from '../src/engine/controller';
import type { CoreController, FrameInput, GestureState, HandFeatures, ProjectionParams, SessionMode, Vec3 } from '../src/types';

export const PROJ: ProjectionParams = {
  revision: 1, videoWidth: 1280, videoHeight: 720, viewportWidth: 1280, viewportHeight: 720,
  fit: 'cover', mirrored: true, axisXPx: 640, bottomYPx: 600, pixelsPerWorldUnit: 180,
};

// deterministic pseudo-random so failures reproduce
export function rng(seed: number) {
  return () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
}

/** Open, non-pinching hand at a world position. */
export function hand(xWorld: number, yWorld: number, over: Partial<HandFeatures> = {}): HandFeatures {
  return {
    trackId: xWorld < 0 ? 1 : 2,
    palmPx: { x: PROJ.axisXPx + xWorld * 180, y: PROJ.bottomYPx - yWorld * 180 },
    palmWorld: { x: xWorld, y: yWorld },
    indexTipPx: { x: 0, y: 0 },
    landmarksPx: [],
    palmSizePx: 100,
    referencePalmSizePx: 100,
    extension: { index: 1, middle: 1, ring: 1, pinky: 1 },
    openness: 1,
    pinchRatio: 1,
    pointing: false,
    velocityWorldPerS: { x: 0, y: 0 },
    velocityPalmPerS: { x: 0, y: 0 },
    velocityValid: true,
    ...over,
  };
}

export function frame(tMs: number, left: HandFeatures | null, right: HandFeatures | null): FrameInput {
  return {
    frameId: tMs, epoch: 0, tMs, receivedAtMs: tMs, dtSampleS: 1 / 30,
    status: left && right ? 'ready' : left || right ? 'oneHand' : 'noHands',
    screenLeft: left, screenRight: right,
  };
}

export function shapeGesture(bandY: number, targetRadiusWorld: number, deforming = true): GestureState {
  return {
    gesture: 'shape', sourceFrameId: 0, capturedAtMs: 0, holdMs: 500, inputUsable: true, deforming,
    motionStrength: 0, targetRadiusWorld, centerOffsetPalm: 0, speedPalmPerS: 0,
    contact: {
      valid: deforming, activeBand: Math.round(bandY * 47), bandY,
      leftErrorWorld: 0, rightErrorWorld: 0, reason: null,
    },
    cursorPx: null, nearMiss: null,
  };
}

/** 21 MediaPipe-style landmarks (source coords) of an open hand, fingers up, centred near (u, v). */
export function rawOpenHand(u: number, v: number): Vec3[] {
  const p: Vec3[] = [];
  p[0] = { x: u, y: v + 0.1, z: 0 }; // wrist
  const thumb = [[-0.04, 0.06], [-0.06, 0.03], [-0.08, 0.01], [-0.09, -0.01]];
  thumb.forEach(([dx, dy], k) => (p[1 + k] = { x: u + dx, y: v + dy, z: 0 }));
  [-0.03, -0.01, 0.01, 0.03].forEach((dx, f) => {
    [0, -0.03, -0.05, -0.07].forEach((dy, k) => (p[5 + f * 4 + k] = { x: u + dx, y: v + dy, z: 0 }));
  });
  return p;
}

export function moveGesture(gesture: 'pullUp' | 'pressDown', motionStrength = 1): GestureState {
  return { ...shapeGesture(0.5, 1), gesture, motionStrength, targetRadiusWorld: null };
}

/** Real controller walked through loading → calibrate (hands held still) → menu. Returns the next free time. */
export function toMenu(core: CoreController, t0 = 0): number {
  core.dispatch({ type: 'modelReady' }, t0);
  core.updateProjection(PROJ);
  let t = t0;
  for (; core.tick(t).phase !== 'menu' && t < t0 + 5000; t += 33) core.observe(frame(t, hand(-1, 0.6), hand(1, 0.6)));
  return t;
}

/** Controller in a fresh session of the given mode, started at T_START. */
export const T_START = 2000;
export function inSession(mode: SessionMode = 'free', sessionId = 's1'): CoreController {
  const core = createController();
  toMenu(core);
  core.dispatch({ type: 'start', mode, sessionId }, T_START);
  return core;
}
