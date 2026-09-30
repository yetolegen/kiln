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

// Fixture palms have a 0.25-world inner edge (tests/helpers poseHand 'wall'): palm half-gap 1.25 = hand edge at a
// radius-1 wall. v7.2: the wall follows the hands' inner edges inward only, easing toward them.
describe('external shaping: the clay moves only where the hands visibly are (v7.2)', () => {
  it('hands near the pot but not touching it never change it: approach, hold, small inward moves', () => {
    const f = fixture();
    for (let i = 0; i < 60; i++) {
      const s = f.sample(1.4 - i * .002); // palm 1.4 -> 1.28: edge still outside the wall
      expect(s.gesture!.contact.valid).toBe(true);
      expect(s.gesture!.deforming).toBe(false);
      expect(Array.from(s.clay!.radii)).toEqual(Array(48).fill(1));
    }
  });

  it('pressing in eases the wall toward the hand edge and stops there; holding does not keep squeezing', () => {
    const f = fixture();
    f.sample(1.25);
    let s = f.sample(1.1); // edge 0.85
    const first = 1 - s.clay!.radii[24];
    expect(first).toBeGreaterThan(0);
    expect(first).toBeLessThan(.15 * .5); // eased and rate-capped, not a jump to the hand
    for (let i = 0; i < 90; i++) s = f.sample(1.1);
    expect(s.clay!.radii[24]).toBeGreaterThan(.85 - 1e-3); // never past the hand
    expect(s.clay!.radii[24]).toBeLessThan(.87);
    const settled = Array.from(s.clay!.radii);
    expect(Array.from(f.sample(1.1).clay!.radii)).toEqual(settled.map((r) => expect.closeTo(r, 5)));
    expect(s.clay!.radii[0]).toBeGreaterThan(.99); // only near the hands
  });

  it('withdrawal never widens and stops pressing at once, even while the wall is still behind the hand', () => {
    const f = fixture();
    f.sample(1.25);
    for (let i = 0; i < 6; i++) f.sample(1.1); // wall still lagging well outside the hand edge
    const pressed = Array.from(f.sample(1.1).clay!.radii);
    let s = f.sample(1.11);
    for (let i = 2; i < 30; i++) s = f.sample(1.1 + .01 * i);
    expect(Array.from(s.clay!.radii)).toEqual(pressed);
  });

  it.each(['lost', 'invalid', 'stale', 'gap', 'pose', 'velocity'] as const)(
    'after %s input the first fresh frame never deforms; pressing resumes after it', (kind) => {
      const f = fixture();
      f.sample(1.25);
      const before = f.sample(1.25).clay!.radii.slice();
      if (kind === 'lost') f.sample(1.1, undefined, { screenRight: null, status: 'oneHand' });
      if (kind === 'invalid') f.sample(1.1, undefined, { status: 'invalidLandmarks' });
      if (kind === 'stale') f.sample(1.1, undefined, { receivedAtMs: f.now() + 400 });
      if (kind === 'pose') f.sample(1.1, undefined, {}, { extension: { index: 0, middle: 0, ring: 0, pinky: 0 } });
      if (kind === 'velocity') f.sample(1.1, undefined, {}, { velocityValid: false });
      const s = f.sample(1.1, undefined, {}, {}, {}, kind === 'gap' ? 300 : 33);
      expect(Array.from(s.clay!.radii)).toEqual(Array.from(before));
      let later = s;
      for (let i = 0; i < 8; i++) later = f.sample(1.1); // shape re-stabilizes (GESTURE_STABLE_MS), then presses
      expect(later.clay!.radii[24]).toBeLessThan(before[24]);
    },
  );

  it.each(['band', 'tracks', 'epoch', 'projection', 'pause', 'restart'] as const)(
    'a %s change rebases: its first frame never deforms', (kind) => {
      const f = fixture();
      const before = f.sample(1.25).clay!.radii.slice();
      if (kind === 'projection') f.core.updateProjection({ ...PROJ, revision: 2 });
      if (kind === 'pause') { f.core.setPaused(true, f.now()); f.core.setPaused(false, f.now()); }
      if (kind === 'restart') f.core.dispatch({ type: 'restart', newSessionId: 'new' }, f.now());
      const input = kind === 'epoch' ? { epoch: 1 } : {};
      const left = kind === 'tracks' ? { trackId: 2 } : {};
      const right = kind === 'tracks' ? { trackId: 1 } : {};
      const y = kind === 'band' ? 1.2 * 32 / 47 : 1.2 * 24 / 47;
      const s = f.sample(1.1, y, input, left, right);
      expect(Array.from(s.clay!.radii)).toEqual(Array.from(before));
      const band = kind === 'band' ? 32 : 24;
      let later = s;
      for (let i = 0; i < 8; i++) later = f.sample(1.1, y, input, left, right);
      expect(later.clay!.radii[band]).toBeLessThan(before[band]);
    },
  );

  it('duplicate observations and render ticks cannot replay pressing', () => {
    const f = fixture();
    f.sample(1.25);
    const s = f.sample(1.1);
    for (let i = 0; i < 10; i++) { f.core.observe(s.input!); f.core.tick(f.now() + i); }
    expect(Array.from(f.core.tick(f.now()).clay!.radii)).toEqual(Array.from(s.clay!.radii));
  });

  it('new tutorial step cannot inherit the previous contact', () => {
    const core = inSession('tutorial');
    const sample = (i: number, gap: number) => {
      core.observe(frame(T_START + i * 33, poseHand('wall', -gap, .6), poseHand('wall', gap, .6)));
      return core.tick(T_START + i * 33);
    };
    core.dispatch({ type: 'tutorialStep', step: 0, expectedGesture: 'shape' }, T_START);
    for (let i = 1; i < 8; i++) sample(i, 1.25);
    const before = sample(8, 1.25).clay!.radii.slice();
    core.dispatch({ type: 'tutorialStep', step: 0 }, T_START + 8 * 33);
    core.dispatch({ type: 'tutorialStep', step: 0, expectedGesture: 'shape' }, T_START + 8 * 33);
    expect(Array.from(sample(9, 1.1).clay!.radii)).toEqual(Array.from(before));
    expect(sample(10, 1.1).clay!.radii[24]).toBeLessThan(before[24]);
  });

  it('pressing narrows every affected band of a nonuniform profile without opening a cavity', () => {
    const clay = createClay();
    for (let j = 0; j < 48; j++) clay.radii[j] = .9 + .002 * j;
    const next = stepClay(clay, shapeGesture(.5, 10), .033, undefined, { ...NO_DELTA, shapeWorld: -.02 });
    for (let j = 0; j < 48; j++) expect(next.radii[j]).toBeLessThanOrEqual(clay.radii[j]);
    expect(next.radii[24]).toBeLessThan(clay.radii[24] - .01);
    expect(next.cavityRadiusWorld).toBe(0);
    expect(next.cavityDepthWorld).toBe(0);
  });
});
