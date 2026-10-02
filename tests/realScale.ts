// Real-app scale fixtures (palm ≈ 215 px, 145 px per world unit).
import { createController } from '../src/engine/controller';
import type { CoreController, FrameInput, HandFeatures, ProjectionParams, SessionMode } from '../src/types';

export const PPU = 145, PALM_PX = 215, PALM_W = PALM_PX / PPU;
export const RPROJ: ProjectionParams = {
  revision: 1, videoWidth: 1280, videoHeight: 720, viewportWidth: 1280, viewportHeight: 720,
  fit: 'cover', mirrored: true, axisXPx: 717, bottomYPx: 576, pixelsPerWorldUnit: PPU,
};

/** Open hand at a world position, real scale. vx/vy in palm/s. */
export function rhand(x: number, y: number, over: Partial<HandFeatures> & { vx?: number; vy?: number } = {}): HandFeatures {
  const { vx = 0, vy = 0, ...rest } = over;
  return {
    trackId: x < 0 ? 1 : 2,
    palmPx: { x: RPROJ.axisXPx + x * PPU, y: RPROJ.bottomYPx - y * PPU },
    palmWorld: { x, y },
    indexTipPx: { x: 0, y: 0 }, landmarksPx: [], palmSizePx: PALM_PX, referencePalmSizePx: PALM_PX,
    extension: { index: 1, middle: 1, ring: 1, pinky: 1 }, openness: 1, pinchRatio: 1, pointing: false,
    velocityPalmPerS: { x: vx, y: vy }, velocityWorldPerS: { x: vx * PALM_W, y: vy * PALM_W }, velocityValid: true,
    ...rest,
  };
}

export function rframe(tMs: number, l: HandFeatures | null, r: HandFeatures | null, id = tMs): FrameInput {
  return {
    frameId: id, epoch: 0, tMs, receivedAtMs: tMs, dtSampleS: 1 / 30,
    status: l && r ? 'ready' : l || r ? 'oneHand' : 'noHands', screenLeft: l, screenRight: r,
  };
}

const K = PALM_PX / 100; // landmark offsets of tests/helpers poseHand, scaled to the real palm
const px = (x: number, y: number) => ({ x: RPROJ.axisXPx + x * PPU, y: RPROJ.bottomYPx - y * PPU });
const toW = (p: { x: number; y: number }) => ({ x: (p.x - RPROJ.axisXPx) / PPU, y: (RPROJ.bottomYPx - p.y) / PPU });
/** tests/helpers poseHand at real scale. thumbDown: (x, y) = thumb tip; pinch/spread: pinch point; poke: index tip pointing down. */
export function rpose(pose: 'wall' | 'flat' | 'thumbDown' | 'pinch' | 'spread' | 'poke', x: number, y: number,
  over: Partial<HandFeatures> & { ratio?: number; vx?: number; vy?: number } = {}): HandFeatures {
  const p = px(x, y);
  const lm = Array.from({ length: 21 }, () => ({ ...p }));
  let palm = p, extension = { index: 1, middle: 1, ring: 1, pinky: 1 }, pinchRatio = 1;
  if (pose === 'wall') {
    lm[0] = { x: p.x, y: p.y + 50 * K }; lm[9] = { x: p.x, y: p.y - 50 * K };
    lm[4] = { x: p.x - Math.sign(x) * 45 * K, y: p.y };
  } else if (pose === 'flat') {
    lm[0] = { x: p.x - 50 * K, y: p.y }; lm[9] = { x: p.x + 50 * K, y: p.y };
  } else if (pose === 'thumbDown') {
    palm = { x: p.x, y: p.y - 70 * K };
    extension = { index: 0, middle: 0, ring: 0, pinky: 0 }; pinchRatio = .7;
    lm[0] = { x: palm.x, y: palm.y - 40 * K }; lm[9] = { x: palm.x, y: palm.y + 10 * K };
    lm[2] = { x: p.x, y: p.y - 45 * K }; lm[4] = { ...p }; lm[8] = { x: palm.x + 30 * K, y: palm.y };
  } else if (pose === 'poke') {
    palm = { x: p.x, y: p.y - 90 * K };
    extension = { index: 1, middle: .3, ring: .3, pinky: .3 }; pinchRatio = .8;
    lm[0] = { x: palm.x, y: palm.y - 40 * K }; lm[9] = { x: palm.x, y: palm.y + 10 * K };
    lm[5] = { x: p.x, y: p.y - 60 * K }; lm[8] = { ...p }; lm[2] = { x: p.x - 30 * K, y: p.y - 60 * K }; lm[4] = { x: p.x - 30 * K, y: p.y - 40 * K };
  } else {
    pinchRatio = pose === 'pinch' ? .2 : over.ratio ?? 1;
    palm = { x: p.x, y: p.y - 70 * K };
    extension = { index: .8, middle: .3, ring: .3, pinky: .3 };
    lm[0] = { x: palm.x, y: palm.y - 40 * K }; lm[9] = { x: palm.x, y: palm.y + 10 * K };
    lm[2] = { x: p.x - 30 * K, y: p.y - 40 * K };
    lm[4] = { x: p.x - pinchRatio * 50 * K, y: p.y }; lm[8] = { x: p.x + pinchRatio * 50 * K, y: p.y };
  }
  const { ratio: _r, ...rest } = over;
  const w = toW(palm);
  return rhand(w.x, w.y, {
    palmPx: palm, landmarksPx: lm, extension, pinchRatio, indexTipPx: lm[8],
    openness: (extension.index + extension.middle + extension.ring + extension.pinky) / 4, ...rest,
  });
}

/** Controller at real scale, through calibration → menu → session. */
export function rsession(mode: SessionMode = 'free', proj: ProjectionParams = RPROJ): { core: CoreController; t: number } {
  const core = createController({ nowIso: () => 'iso' });
  core.dispatch({ type: 'modelReady' }, 0);
  core.updateProjection(proj);
  let t = 0;
  for (; core.tick(t).phase !== 'menu' && t < 5000; t += 33) core.observe(rframe(t, rhand(-1.5, .6), rhand(1.5, .6)));
  core.dispatch({ type: 'start', mode, sessionId: 's1' }, t);
  return { core, t };
}
