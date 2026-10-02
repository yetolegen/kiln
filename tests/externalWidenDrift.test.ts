// Two-hand outside widening (V9.1) under realistic vertical drift.
import { describe, expect, it } from 'vitest';
import { frame, hand, inSession, moving, T_START } from './helpers';

const PALM = 100 / 180;

/** Grip, hold 0.5 s, then spread both hands 0.008/frame while their height changes dy/frame. */
function stroke(dyHold: number, dySpread: number, frames: number) {
  const core = inSession('free'); let now = T_START, y = .6, x = 1.05;
  const before = core.tick(now).clay!.radii[20];
  const feed = (vx: number, dy: number) => {
    now += 33; y += dy;
    const vy = (dy * 30) / PALM;
    core.observe(frame(now,
      hand(-x, y, { pinchRatio: .2, trackId: 1, ...moving(-vx, vy) }),
      hand(x, y, { pinchRatio: .2, trackId: 2, ...moving(vx, vy) })));
    return core.tick(now);
  };
  for (let i = 0; i < 20; i++) feed(0, dyHold);
  let s = feed(0, 0);
  for (let i = 0; i < frames; i++) { x += .008; s = feed(.44, dySpread); }
  return { widened: s.clay!.radii[20] - before, progress: s.gesture!.activationProgress, full: .7 * (.008 * frames - .019) };
}

describe('external widening with vertical drift', () => {
  it('a spread whose hands arc downward keeps widening to the end', () => {
    const r = stroke(0, -.003, 60); // ~0.16 palm/s drop: used to stop silently after ~37 frames
    expect(r.progress).toBe(1);
    expect(r.widened).toBeGreaterThan(r.full - .02);
  });

  it('slow drift while holding still does not block the following spread', () => {
    const r = stroke(.0024, .0015, 80);
    expect(r.progress).toBe(1);
    expect(r.widened).toBeGreaterThan(r.full - .02);
  });

  it('a deliberate vertical withdrawal still ends the stroke', () => {
    const r = stroke(0, .012, 60); // ~0.65 palm/s rise
    expect(r.progress).toBe(0);
    expect(r.widened).toBeLessThan(r.full / 2);
  });
});
