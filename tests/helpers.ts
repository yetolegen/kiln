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
    motionStrength: 0, activeTrackId: null, supportTrackId: null, activationProgress: 0,
    targetRadiusWorld, centerOffsetPalm: 0, speedPalmPerS: 0,
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

/** A deforming one-hand action, for driving stepClay directly with an ActionDelta. */
export function actionGesture(gesture: 'pullUp' | 'indent' | 'open' | 'compressRim', motionStrength = 1): GestureState {
  return {
    ...shapeGesture(0.5, 1), gesture, motionStrength, targetRadiusWorld: null,
    activeTrackId: 2, supportTrackId: 1, activationProgress: 1,
    contact: { valid: false, activeBand: null, bandY: null, leftErrorWorld: null, rightErrorWorld: null, reason: null },
  };
}

const px = (x: number, y: number) => ({ x: PROJ.axisXPx + x * 180, y: PROJ.bottomYPx - y * 180 });
const toWorld = (p: { x: number; y: number }) => ({ x: (p.x - PROJ.axisXPx) / 180, y: (PROJ.bottomYPx - p.y) / 180 });

/**
 * A hand with real landmark geometry (screen px, 100 px palm), for the v4 one-hand actions.
 *  wall:  open palm, fingers up (a support hand or a shaping hand); (x, y) = palm
 *  flat:  open palm, fingers sideways (lift at the base, rim compression); (x, y) = palm
 *  thumbDown: fist with the thumb pointing down; (x, y) = THUMB TIP
 *  pinch: thumb and index tips together (ratio 0.2); (x, y) = pinch point
 *  spread: thumb and index apart by `ratio` palm sizes; (x, y) = midpoint of the tips
 */
export function poseHand(
  pose: 'wall' | 'flat' | 'thumbDown' | 'pinch' | 'spread', x: number, y: number,
  over: Partial<HandFeatures> & { ratio?: number } = {},
): HandFeatures {
  const p = px(x, y);
  const lm = Array.from({ length: 21 }, () => ({ ...p }));
  let palm = p;
  let extension = { index: 1, middle: 1, ring: 1, pinky: 1 };
  let pinchRatio = 1;
  if (pose === 'wall') {
    lm[0] = { x: p.x, y: p.y + 50 };
    lm[9] = { x: p.x, y: p.y - 50 };
  } else if (pose === 'flat') {
    lm[0] = { x: p.x - 50, y: p.y };
    lm[9] = { x: p.x + 50, y: p.y };
  } else if (pose === 'thumbDown') {
    palm = { x: p.x, y: p.y - 70 };
    extension = { index: 0, middle: 0, ring: 0, pinky: 0 };
    pinchRatio = 0.7;
    lm[0] = { x: palm.x, y: palm.y - 40 };
    lm[9] = { x: palm.x, y: palm.y + 10 };
    lm[2] = { x: p.x, y: p.y - 45 }; // thumb knuckle straight above its tip
    lm[4] = { ...p };
    lm[8] = { x: palm.x + 30, y: palm.y };
  } else {
    pinchRatio = pose === 'pinch' ? 0.2 : over.ratio ?? 1;
    palm = { x: p.x, y: p.y - 70 };
    extension = { index: 0.8, middle: 0.3, ring: 0.3, pinky: 0.3 };
    lm[0] = { x: palm.x, y: palm.y - 40 };
    lm[9] = { x: palm.x, y: palm.y + 10 };
    lm[2] = { x: p.x - 30, y: p.y - 40 };
    lm[4] = { x: p.x - pinchRatio * 50, y: p.y };
    lm[8] = { x: p.x + pinchRatio * 50, y: p.y };
  }
  const { ratio: _ratio, ...rest } = over;
  const palmWorld = toWorld(palm);
  return hand(palmWorld.x, palmWorld.y, {
    palmPx: palm, landmarksPx: lm, extension, pinchRatio, indexTipPx: lm[8],
    openness: (extension.index + extension.middle + extension.ring + extension.pinky) / 4,
    ...rest,
  });
}

/** Palm speed in palms/s and the matching world velocity (100 px palm, 180 px per world unit). */
export function moving(vxPalm: number, vyPalm: number): Pick<HandFeatures, 'velocityPalmPerS' | 'velocityWorldPerS'> {
  return { velocityPalmPerS: { x: vxPalm, y: vyPalm }, velocityWorldPerS: { x: (vxPalm * 100) / 180, y: (vyPalm * 100) / 180 } };
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
