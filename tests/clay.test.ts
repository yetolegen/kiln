import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/config';
import { createClay, enforceInvariants, maxStableHeight, stepClay, type ClayModel } from '../src/engine/clay';
import type { ClayState } from '../src/types';
import { moveGesture, rng, shapeGesture } from './helpers';

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

describe('pull / press / collapse', () => {
  const pull = moveGesture('pullUp');
  const press = moveGesture('pressDown');

  it('pull raises and thins; press lowers, thickens and repairs', () => {
    let c = createClay();
    for (let k = 0; k < 10; k++) c = stepClay(c, pull, 0.05);
    expect(c.height).toBeGreaterThan(1.2);
    expect(c.thickness).toBeLessThan(CONFIG.INIT_THICKNESS);
    const thin = c.thickness;
    c.damage.fill(0.5);
    c.wobble = 0.5;
    for (let k = 0; k < 10; k++) c = stepClay(c, press, 0.05);
    expect(c.thickness).toBeGreaterThan(thin);
    expect(c.damage[10]).toBeLessThan(0.5);
    expect(c.wobble).toBeLessThan(0.5);
  });

  it('T10 pulling at MAX_HEIGHT does not thin the walls', () => {
    let c: ClayModel = { ...createClay(), height: CONFIG.MAX_HEIGHT };
    c.radii.fill(1.6); // wide base so it doesn't collapse
    c = enforceInvariants(c);
    const before = { t: c.thickness, r: c.radii[20] };
    for (let k = 0; k < 40; k++) c = stepClay(c, pull, 0.05);
    expect(c.thickness).toBe(before.t);
    expect(c.radii[20]).toBe(before.r);
    expect(c.height).toBe(CONFIG.MAX_HEIGHT);
  });

  it('press still repairs at MIN_HEIGHT', () => {
    let c: ClayModel = { ...createClay(), height: CONFIG.MIN_HEIGHT };
    c.damage.fill(1);
    c = stepClay(c, press, 0.05);
    expect(c.damage[0]).toBeLessThan(1);
  });

  it('T12 collapse happens once; pressing recovers it without restart', () => {
    let c = createClay();
    let collapses = 0;
    for (let k = 0; k < 200; k++) { // keep pulling well past the collapse
      const was = c.collapsed;
      c = stepClay(c, pull, 0.05);
      if (!was && c.collapsed) collapses++;
    }
    expect(collapses).toBe(1);
    expect(c.collapseCause).toBe('tooTall');
    expect(c.height).toBeLessThan(maxStableHeight(c.radii));

    let recoveredAt = -1;
    for (let k = 0; k < 200 && recoveredAt < 0; k++) {
      c = stepClay(c, press, 0.05);
      if (!c.collapsed) recoveredAt = k;
    }
    expect(recoveredAt).toBeGreaterThanOrEqual(Math.ceil(CONFIG.RECOVERY_ACTIVE_MS / 50) - 1);
    expect(c.collapseCause).toBeNull();
  });

  it('shape and pull do nothing while collapsed', () => {
    let c: ClayModel = { ...createClay(), collapsed: true, collapseCause: 'thinWall' };
    const h = c.height;
    c = stepClay(c, pull, 0.05);
    c = stepClay(c, shapeGesture(0.5, 0.4), 0.05);
    expect(c.height).toBe(h);
    expect(c.radii[24]).toBe(1);
  });

  it('tear effect damages the band and thins; overhang is pulled in, never out', () => {
    const torn = stepClay(createClay(), shapeGesture(0.5, 1, false), 0.5, { tearBand: 24, wobbling: false });
    expect(torn.damage[24]).toBeGreaterThan(0);
    expect(torn.damage[0]).toBe(0);
    const c = createClay();
    c.radii[30] = 1.5; // sharp outward step at band 30
    const next = stepClay(c, shapeGesture(0.5, 1, false), 0.05);
    expect(next.radii[30]).toBeLessThan(1.5);
    expect(next.radii[29]).toBe(1);
  });
});
