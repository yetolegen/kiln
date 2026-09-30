import { describe, expect, it } from 'vitest';
import { frame, inSession, moving, poseHand, T_START } from '../../tests/helpers';
import type { SessionMode } from '../types';

// User's V5.1 report: external palms approach from outside the walls.
// Exercise the real recognizer/controller/geometry, without a renderer or UI mock.
describe('external two-palm compression direction', () => {
  for (const mode of ['free', 'tutorial'] as SessionMode[]) {
    it.each([1, 2])(`narrows during inward travel in ${mode}, left track %i`, (leftId) => {
      const core = inSession(mode);
      if (mode === 'tutorial') core.dispatch({ type: 'tutorialStep', step: 0, expectedGesture: 'shape' }, T_START);
      const initial = core.tick(T_START).clay!;
      const initialRadius = initial.radii[24];
      const bandHeight = initial.height * 24 / 47;
      let previousRadius = initialRadius;
      let maxGrowth = 0;
      let contactFrames = 0;
      const samples: { halfGap: number; radius: number; target: number | null }[] = [];
      // Both palms start 0.4 outside the walls and move inward at 0.15 world/s.
      // Their centres remain outside the initial walls throughout this stroke.
      for (let i = 1; i <= 60; i++) {
        const now = T_START + i * 33;
        const halfGap = initialRadius + .4 - .15 * i * .033;
        core.observe(frame(now,
          poseHand('wall', -halfGap, bandHeight, { ...moving(.27, 0), trackId: leftId }),
          poseHand('wall', halfGap, bandHeight, { ...moving(-.27, 0), trackId: leftId === 1 ? 2 : 1 }),
        ));
        const snapshot = core.tick(now);
        const clay = snapshot.clay!;
        if (snapshot.gesture?.contact.valid && snapshot.gesture.gesture === 'shape') contactFrames++;
        maxGrowth = Math.max(maxGrowth, clay.radii[24] - previousRadius);
        previousRadius = clay.radii[24];
        if (i === 5 || i === 15 || i === 30 || i === 60) {
          samples.push({ halfGap, radius: previousRadius, target: snapshot.gesture?.targetRadiusWorld ?? null });
        }
        expect(clay.cavityRadiusWorld).toBe(0);
        expect(clay.cavityDepthWorld).toBe(0);
      }
      expect(contactFrames).toBeGreaterThan(40);
      const evidence = JSON.stringify({ initialRadius, finalRadius: previousRadius, maxGrowth, samples });
      expect.soft(maxGrowth, evidence).toBeLessThanOrEqual(1e-6);
      expect(previousRadius, evidence).toBeLessThan(initialRadius - .05);
    });
  }

  it.each([1, 2])('internal pinch-spread widens only the cavity, active track %i', (activeId) => {
    const core = inSession();
    let now = T_START;
    const run = (count: number, pose: 'thumbDown' | 'pinch' | 'spread') => {
      for (let i = 1; i <= count; i++) {
        now += 33;
        const clay = core.tick(now).clay!;
        const support = poseHand('wall', (activeId === 1 ? 1 : -1) * clay.radii[24], clay.height / 2,
          { trackId: activeId === 1 ? 2 : 1 });
        const active = poseHand(pose, 0, pose === 'thumbDown' ? 1.2 - i * .033 * .3 : 1.15,
          { trackId: activeId, ...(pose === 'thumbDown' ? moving(0, -.54) : { ratio: .2 + i * .033 }) });
        core.observe(frame(now, activeId === 1 ? active : support, activeId === 1 ? support : active));
      }
      return core.tick(now).clay!;
    };
    run(11, 'thumbDown');
    const before = run(13, 'pinch');
    const after = run(15, 'spread');
    expect(before.cavityRadiusWorld).toBeGreaterThan(0);
    expect(after.cavityRadiusWorld).toBeGreaterThan(before.cavityRadiusWorld + .1);
    expect(after.cavityDepthWorld).toBeGreaterThan(before.cavityDepthWorld);
    expect(Array.from(after.radii)).toEqual(Array.from(before.radii));
  });
});
