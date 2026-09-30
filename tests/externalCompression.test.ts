import { describe, expect, it } from 'vitest';
import { createClay, NO_DELTA, stepClay } from '../src/engine/clay';
import type { FrameInput, HandFeatures } from '../src/types';
import { frame, inSession, poseHand, PROJ, shapeGesture, T_START } from './helpers';

function fixture() {
  const core = inSession();
  let now = T_START;
  const sample = (halfGap: number, y = 1.2 * 24 / 47,
    input: Partial<FrameInput> = {}, left: Partial<HandFeatures> = {}, right: Partial<HandFeatures> = {}, dt = 33) => {
    now += dt;
    const f = { ...frame(now, poseHand('wall', -halfGap, y, left), poseHand('wall', halfGap, y, right)), ...input };
    core.observe(f);
    return core.tick(now);
  };
  for (let i = 0; i < 8; i++) sample(1.4);
  return { core, sample, now: () => now };
}

describe('external shaping motion boundaries', () => {
  it('acquisition and stationary holds outside the walls never inflate the pot', () => {
    const f = fixture();
    for (let i = 0; i < 60; i++) {
      const s = f.sample(1.4);
      expect(s.gesture!.contact.valid).toBe(true);
      expect(s.gesture!.deforming).toBe(false);
      expect(Array.from(s.clay!.radii)).toEqual(Array(48).fill(1));
    }
  });

  it('inward narrows, outward widens, a reversal immediately narrows again, and a hold stops', () => {
    const f = fixture();
    let last = f.core.tick(f.now()).clay!;
    for (const direction of [-1, 1, -1]) {
      let gap = f.core.tick(f.now()).input!.screenRight!.palmWorld.x;
      for (let i = 0; i < 20; i++) {
        gap += direction * .005;
        const next = f.sample(gap).clay!;
        expect(Math.sign(next.radii[24] - last.radii[24])).toBe(direction);
        for (let j = 0; j < 48; j++) expect((next.radii[j] - last.radii[j]) * direction).toBeGreaterThanOrEqual(-1e-7);
        last = next;
      }
      expect(Array.from(f.sample(gap).clay!.radii)).toEqual(Array.from(last.radii));
    }
  });

  it.each(['lost', 'invalid', 'stale', 'gap', 'contact', 'pose', 'velocity'] as const)(
    'rebases after %s input, then requires fresh movement', (kind) => {
      const f = fixture();
      const before = f.sample(1.395).clay!.radii.slice();
      if (kind === 'lost') f.sample(1.2, undefined, { screenRight: null, status: 'oneHand' });
      if (kind === 'invalid') f.sample(1.2, undefined, { status: 'invalidLandmarks' });
      if (kind === 'stale') f.sample(1.2, undefined, { receivedAtMs: f.now() + 400 });
      if (kind === 'contact') f.sample(3);
      if (kind === 'pose') f.sample(1.2, undefined, {}, { extension: { index: 0, middle: 0, ring: 0, pinky: 0 } });
      if (kind === 'velocity') f.sample(1.2, undefined, {}, { velocityValid: false });
      // The long gap deliberately has no render tick to reset the recognizer for us.
      let s = f.sample(1.2, undefined, {}, {}, {}, kind === 'gap' ? 300 : 33);
      for (let i = 0; i < 8; i++) s = f.sample(1.2);
      expect(Array.from(s.clay!.radii)).toEqual(Array.from(before));
      expect(f.sample(1.195).clay!.radii[24]).toBeLessThan(before[24]);
    },
  );

  it.each(['band', 'tracks', 'epoch', 'projection', 'pause', 'restart'] as const)(
    'rebases on %s changes without carrying old displacement', (kind) => {
      const f = fixture();
      const before = f.sample(1.395).clay!.radii.slice();
      if (kind === 'projection') f.core.updateProjection({ ...PROJ, revision: 2 });
      if (kind === 'pause') { f.core.setPaused(true, f.now()); f.core.setPaused(false, f.now()); }
      if (kind === 'restart') f.core.dispatch({ type: 'restart', newSessionId: 'new' }, f.now());
      const input = kind === 'epoch' ? { epoch: 1 } : {};
      const left = kind === 'tracks' ? { trackId: 2 } : {};
      const right = kind === 'tracks' ? { trackId: 1 } : {};
      const y = kind === 'band' ? 1.2 * 32 / 47 : 1.2 * 24 / 47;
      let s = f.sample(1.2, y, input, left, right);
      for (let i = 0; i < 8; i++) s = f.sample(1.2, y, input, left, right);
      const expected = kind === 'restart' ? Array(48).fill(1) : Array.from(before);
      expect(Array.from(s.clay!.radii)).toEqual(expected);
      const band = kind === 'band' ? 32 : 24;
      expect(f.sample(1.195, y, input, left, right).clay!.radii[band]).toBeLessThan(expected[band]);
    },
  );

  it('duplicate observations and render ticks cannot replay radial movement', () => {
    const f = fixture();
    const s = f.sample(1.395);
    for (let i = 0; i < 10; i++) { f.core.observe(s.input!); f.core.tick(f.now() + i); }
    expect(Array.from(f.core.tick(f.now()).clay!.radii)).toEqual(Array.from(s.clay!.radii));
  });

  it('new tutorial step cannot inherit old displacement even before another observation', () => {
    const core = inSession('tutorial');
    const sample = (i: number, gap: number) => {
      core.observe(frame(T_START + i * 33, poseHand('wall', -gap, .6), poseHand('wall', gap, .6)));
      return core.tick(T_START + i * 33);
    };
    core.dispatch({ type: 'tutorialStep', step: 0, expectedGesture: 'shape' }, T_START);
    for (let i = 1; i < 8; i++) sample(i, 1.4);
    const before = sample(8, 1.395).clay!.radii.slice();
    core.dispatch({ type: 'tutorialStep', step: 0 }, T_START + 8 * 33);
    core.dispatch({ type: 'tutorialStep', step: 0, expectedGesture: 'shape' }, T_START + 8 * 33);
    expect(Array.from(sample(9, 1.2).clay!.radii)).toEqual(Array.from(before));
    expect(sample(10, 1.195).clay!.radii[24]).toBeLessThan(before[24]);
  });

  it('inward travel narrows every affected band of a nonuniform profile without opening a cavity', () => {
    const clay = createClay();
    for (let j = 0; j < 48; j++) clay.radii[j] = .9 + .002 * j;
    const next = stepClay(clay, shapeGesture(.5, 10), .033, undefined, { ...NO_DELTA, shapeWorld: -.02 });
    for (let j = 0; j < 48; j++) expect(next.radii[j]).toBeLessThanOrEqual(clay.radii[j]);
    expect(next.radii[24]).toBeLessThan(clay.radii[24] - .01);
    expect(next.cavityRadiusWorld).toBe(0);
    expect(next.cavityDepthWorld).toBe(0);
  });
});
