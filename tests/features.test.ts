import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/config';
import { FeatureExtractor } from '../src/tracking/features';
import type { RawHand, TrackingPacket } from '../src/types';
import pkgRaw from '../package.json?raw';
import { PROJ, rawOpenHand } from './helpers';

const packet = (frameId: number, tMs: number, hands: RawHand[]): TrackingPacket =>
  ({ frameId, epoch: 0, capturedAtMs: tMs, receivedAtMs: tMs, mediaTimeMs: tMs, hands });
const at = (u: number, v = 0.5): RawHand => ({ landmarks: rawOpenHand(u, v) });

describe('features', () => {
  it('open hand reads as open, not pinching or pointing', () => {
    const f = new FeatureExtractor().compute(packet(1, 0, [at(0.5)]), PROJ);
    const h = f.screenLeft ?? f.screenRight!;
    expect(h.openness).toBeGreaterThan(0.9);
    expect(h.pinchRatio).toBeGreaterThan(CONFIG.PINCH_OFF);
    expect(h.pointing).toBe(false);
  });

  it('mirrors: a hand on the left of the source image is on the right of the screen', () => {
    const f = new FeatureExtractor().compute(packet(1, 0, [at(0.2)]), PROJ);
    expect(f.screenRight).not.toBeNull();
    expect(f.screenLeft).toBeNull();
  });

  it('keeps track ids when MediaPipe swaps array order', () => {
    const fx = new FeatureExtractor();
    const a = fx.compute(packet(1, 0, [at(0.3), at(0.7)]), PROJ);
    const idRight = a.screenRight!.trackId;
    const b = fx.compute(packet(2, 33, [at(0.705), at(0.305)]), PROJ); // swapped order, tiny move
    expect(b.screenRight!.trackId).toBe(idRight);
    expect(b.status).toBe('ready');
    expect(b.screenRight!.velocityValid).toBe(true);
  });

  it('a hand returning after REACQUIRE_MS gets a new id and no fake velocity', () => {
    const fx = new FeatureExtractor();
    const a = fx.compute(packet(1, 0, [at(0.3), at(0.7)]), PROJ);
    fx.compute(packet(2, 33, [at(0.7)]), PROJ);
    const back = fx.compute(packet(3, 33 + CONFIG.REACQUIRE_MS + 50, [at(0.3), at(0.7)]), PROJ);
    expect(back.status).toBe('reacquiring');
    expect(back.screenRight!.trackId).not.toBe(a.screenRight!.trackId);
    expect(back.screenRight!.velocityValid).toBe(false);
  });

  it('invalid landmarks are reported, not used', () => {
    const bad: RawHand = { landmarks: rawOpenHand(0.5, 0.5).map((p, i) => (i === 3 ? { ...p, x: NaN } : p)) };
    const f = new FeatureExtractor().compute(packet(1, 0, [bad]), PROJ);
    expect(f.status).toBe('invalidLandmarks');
    expect(f.screenLeft ?? f.screenRight).toBeNull();
  });

  it('calibration locks after both hands are still for CALIBRATION_STILL_MS', () => {
    const fx = new FeatureExtractor();
    for (let t = 0; t <= CONFIG.CALIBRATION_STILL_MS + 100; t += 33) fx.compute(packet(t, t, [at(0.3), at(0.7)]), PROJ);
    expect(fx.calibrationProgress).toBe(1);
  });

  it('WASM URL version matches the installed MediaPipe package', () => {
    expect(JSON.parse(pkgRaw).dependencies['@mediapipe/tasks-vision']).toBe(CONFIG.MEDIAPIPE_VERSION);
  });
});
