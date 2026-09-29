import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/config';
import { createClay, enforceInvariants, stepClay } from '../src/engine/clay';
import type { ClayState } from '../src/types';
import { rng, shapeGesture } from './helpers';

const EPS = 1e-6; // radii are Float32, so 1.6 is stored as 1.6000000238

function expectInvariants(c: ClayState) {
  let minR = Infinity;
  for (let i = 0; i < c.radii.length; i++) {
    expect(Number.isFinite(c.radii[i])).toBe(true);
    expect(c.radii[i]).toBeGreaterThanOrEqual(CONFIG.MIN_R - EPS);
    expect(c.radii[i]).toBeLessThanOrEqual(CONFIG.MAX_R + EPS);
    expect(c.damage[i]).toBeGreaterThanOrEqual(0);
    expect(c.damage[i]).toBeLessThanOrEqual(1);
    minR = Math.min(minR, c.radii[i]);
  }
  expect(c.height).toBeGreaterThanOrEqual(CONFIG.MIN_HEIGHT);
  expect(c.height).toBeLessThanOrEqual(CONFIG.MAX_HEIGHT);
  expect(c.thickness).toBeGreaterThanOrEqual(CONFIG.THICKNESS_FLOOR);
  expect(c.thickness).toBeLessThanOrEqual(Math.min(CONFIG.MAX_THICKNESS, minR - CONFIG.MIN_INNER_RADIUS) + EPS);
  expect(c.wobble).toBeGreaterThanOrEqual(0);
  expect(c.wobble).toBeLessThanOrEqual(1);
}

describe('clay', () => {
  it('T11 1000 random actions keep invariants, no NaN', () => {
    const rand = rng(7);
    const weird = [NaN, Infinity, -Infinity, -5, 50];
    let c = createClay();
    for (let k = 0; k < 1000; k++) {
      const target = rand() < 0.05 ? weird[k % weird.length] : rand() * 4 - 1;
      const g = shapeGesture(rand() * 1.4 - 0.2, target, rand() < 0.8);
      c = stepClay(c, g, rand() * CONFIG.MAX_STEP_S);
      expectInvariants(c);
    }
  });

  it('enforceInvariants repairs corrupted state', () => {
    const c = createClay();
    c.radii[3] = NaN;
    c.height = Infinity;
    c.thickness = -1;
    c.wobble = NaN;
    c.damage[5] = 7;
    expectInvariants(enforceInvariants(c));
  });

  it('step does not mutate its input', () => {
    const c = createClay();
    stepClay(c, shapeGesture(0.5, 0.5), 0.05);
    expect(c.radii[24]).toBe(1);
    expect(c.revision).toBe(0);
  });

  it('shape is rate-limited per second, not per frame', () => {
    const one = stepClay(createClay(), shapeGesture(0.5, 0.25), 0.04);
    let two = stepClay(createClay(), shapeGesture(0.5, 0.25), 0.02);
    two = stepClay(two, shapeGesture(0.5, 0.25), 0.02);
    expect(1 - one.radii[24]).toBeLessThanOrEqual(CONFIG.MAX_DR_PER_S * 0.04 + EPS);
    expect(two.radii[24]).toBeCloseTo(one.radii[24], 3);
  });
});
