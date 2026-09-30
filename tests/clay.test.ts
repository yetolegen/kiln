import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/config';
import {
  cavityStartBand, createClay, enforceInvariants, maxStableHeight, NO_DELTA, stepClay, type ClayModel,
} from '../src/engine/clay';
import type { ClayState } from '../src/types';
import { actionGesture, rng, shapeGesture } from './helpers';

const EPS = 1e-6; // radii are Float32, so 1.6 is stored as 1.6000000238

export function expectInvariants(c: ClayState) {
  for (let i = 0; i < c.radii.length; i++) {
    expect(Number.isFinite(c.radii[i])).toBe(true);
    expect(c.radii[i]).toBeGreaterThanOrEqual(CONFIG.MIN_R - EPS);
    expect(c.radii[i]).toBeLessThanOrEqual(CONFIG.MAX_R + EPS);
    expect(c.damage[i]).toBeGreaterThanOrEqual(0);
    expect(c.damage[i]).toBeLessThanOrEqual(1);
  }
  expect(c.height).toBeGreaterThanOrEqual(CONFIG.MIN_HEIGHT);
  expect(c.height).toBeLessThanOrEqual(CONFIG.MAX_HEIGHT);
  expect(c.wobble).toBeGreaterThanOrEqual(0);
  expect(c.wobble).toBeLessThanOrEqual(1);
  // cavity: both zero, or both positive with a floor and a wall
  expect(c.cavityDepthWorld === 0).toBe(c.cavityRadiusWorld === 0);
  expect(c.cavityDepthWorld).toBeLessThanOrEqual(c.height - CONFIG.FLOOR_WORLD + EPS);
  expect(c.thickness).toBeGreaterThanOrEqual(CONFIG.THICKNESS_FLOOR - EPS);
  if (c.cavityDepthWorld > 0) {
    const wall = Math.min(...Array.from(c.radii).slice(cavityStartBand(c)));
    expect(c.thickness).toBeCloseTo(wall - c.cavityRadiusWorld, 5);
  }
}

const lift = (world: number) => ({ ...NO_DELTA, liftWorld: world });
const spread = (ratio: number) => ({ ...NO_DELTA, spreadRatio: ratio });
const press = (world: number) => ({ ...NO_DELTA, compressWorld: world });
const INDENT = { ...NO_DELTA, indent: true };
const indented = (): ClayModel => stepClay(createClay(), actionGesture('indent'), 0.03, undefined, INDENT);

describe('clay', () => {
  it('starts solid: no cavity, thickness = narrowest radius', () => {
    const c = createClay();
    expect(c.cavityDepthWorld).toBe(0);
    expect(c.cavityRadiusWorld).toBe(0);
    expect(c.thickness).toBe(CONFIG.INIT_RADIUS);
  });

  it('T11 1000 random actions keep invariants, no NaN', () => {
    const rand = rng(7);
    const weird = [NaN, Infinity, -Infinity, -5, 50];
    const kinds = ['pullUp', 'indent', 'open', 'compressRim'] as const;
    let c = createClay();
    for (let k = 0; k < 1000; k++) {
      const pick = rand();
      const w = rand() < 0.05 ? weird[k % weird.length] : rand() * 0.2;
      const dt = rand() * CONFIG.MAX_STEP_S;
      if (pick < 0.4) c = stepClay(c, shapeGesture(rand() * 1.4 - 0.2, rand() < 0.05 ? w : rand() * 4 - 1, rand() < 0.8), dt);
      else {
        const kind = kinds[Math.floor(rand() * 4)];
        const d = { liftWorld: w, indent: rand() < 0.5, spreadRatio: w, compressWorld: Math.abs(w) };
        c = stepClay(c, actionGesture(kind, rand()), dt, { tearBand: rand() < 0.1 ? Math.floor(rand() * 48) : null, wobbling: rand() < 0.1 }, d);
      }
      expectInvariants(c);
    }
  });

  it('enforceInvariants repairs corrupted state', () => {
    const c = createClay();
    c.radii[3] = NaN;
    c.height = Infinity;
    c.cavityDepthWorld = 99;
    c.cavityRadiusWorld = NaN;
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

  it('a deforming gesture without its delta changes nothing (no fake actions)', () => {
    for (const kind of ['pullUp', 'indent', 'open', 'compressRim'] as const) {
      const c = stepClay(createClay(), actionGesture(kind), 0.05);
      expect(c.height).toBe(CONFIG.INIT_HEIGHT);
      expect(c.cavityDepthWorld).toBe(0);
    }
  });
});

describe('v4 actions on the clay', () => {
  it('lift raises and narrows; an opened pot gets deeper (the floor stays)', () => {
    const open = stepClay(indented(), actionGesture('open'), 0.05, undefined, spread(0.3));
    const before = { h: open.height, d: open.cavityDepthWorld, r: open.radii[10] };
    const c = stepClay(open, actionGesture('pullUp'), 0.05, undefined, lift(0.2));
    expect(c.height).toBeCloseTo(before.h + 0.2);
    expect(c.cavityDepthWorld).toBeCloseTo(before.d + 0.2);
    expect(c.radii[10]).toBeLessThan(before.r);
  });

  it('T10 lifting at MAX_HEIGHT changes nothing', () => {
    let c: ClayModel = enforceInvariants({ ...createClay(), height: CONFIG.MAX_HEIGHT });
    c.radii.fill(1.6); // wide base so it doesn't collapse
    c = enforceInvariants(c);
    const r = c.radii[20];
    for (let k = 0; k < 20; k++) c = stepClay(c, actionGesture('pullUp'), 0.05, undefined, lift(0.1));
    expect(c.height).toBe(CONFIG.MAX_HEIGHT);
    expect(c.radii[20]).toBe(r);
  });

  it('indentation is exactly INDENT deep however often it repeats', () => {
    let c = indented();
    for (let k = 0; k < 10; k++) c = stepClay(c, actionGesture('indent'), 0.05, undefined, INDENT);
    expect(c.cavityDepthWorld).toBeCloseTo(CONFIG.INDENT_DEPTH_WORLD);
    expect(c.cavityRadiusWorld).toBeCloseTo(CONFIG.INDENT_RADIUS_WORLD);
  });

  it('opening needs an indentation, and never passes the wall/floor limits', () => {
    expect(stepClay(createClay(), actionGesture('open'), 0.05, undefined, spread(1)).cavityDepthWorld).toBe(0);
    let c = indented();
    for (let k = 0; k < 100; k++) c = stepClay(c, actionGesture('open'), 0.05, undefined, spread(0.2));
    expect(c.thickness).toBeGreaterThanOrEqual(CONFIG.OPEN_MIN_WALL_WORLD - EPS);
    expect(c.cavityDepthWorld).toBeCloseTo(c.height - CONFIG.FLOOR_WORLD, 5);
    expect(c.collapsed).toBe(false); // opening alone never collapses the pot
  });

  it('rim compression lowers, widens, heals the upper half, shrinks the opening', () => {
    let c = stepClay(indented(), actionGesture('open'), 0.05, undefined, spread(0.3));
    c.damage.fill(0.6);
    const before = { h: c.height, r: c.radii[40], cr: c.cavityRadiusWorld };
    c = stepClay(c, actionGesture('compressRim'), 0.05, undefined, press(0.1));
    expect(c.height).toBeCloseTo(before.h - 0.1);
    expect(c.radii[40]).toBeGreaterThan(before.r);
    expect(c.damage[40]).toBeLessThan(0.6);
    expect(c.damage[5]).toBeCloseTo(0.6);
    expect(c.cavityRadiusWorld).toBeLessThan(before.cr);
  });

  it('lifting an opened pot thins the wall until it collapses (thinWall), once', () => {
    let c = indented();
    for (let k = 0; k < 40; k++) c = stepClay(c, actionGesture('open'), 0.05, undefined, spread(0.2));
    c.radii.fill(1.6);
    c = enforceInvariants(c); // wide base so tooTall can't come first
    for (let k = 0; k < 40; k++) c = stepClay(c, actionGesture('open'), 0.05, undefined, spread(0.2));
    let collapses = 0;
    for (let k = 0; k < 200; k++) {
      const was = c.collapsed;
      c = stepClay(c, actionGesture('pullUp'), 0.05, undefined, lift(0.05));
      if (!was && c.collapsed) collapses++;
    }
    expect(collapses).toBe(1);
    expect(c.collapseCause).toBe('thinWall');
    expectInvariants(c);
  });

  it('T12 collapse happens once; rim compression recovers it without restart', () => {
    let c = createClay();
    let collapses = 0;
    for (let k = 0; k < 200; k++) {
      const was = c.collapsed;
      c = stepClay(c, actionGesture('pullUp'), 0.05, undefined, lift(0.05));
      if (!was && c.collapsed) collapses++;
    }
    expect(collapses).toBe(1);
    expect(c.collapseCause).toBe('tooTall');
    expect(c.height).toBeLessThan(maxStableHeight(c.radii));

    let recoveredAt = -1;
    for (let k = 0; k < 200 && recoveredAt < 0; k++) {
      c = stepClay(c, actionGesture('compressRim', 0.5), 0.05, undefined, press(0.005));
      if (!c.collapsed) recoveredAt = k;
    }
    expect(recoveredAt).toBeGreaterThanOrEqual(Math.ceil(CONFIG.RECOVERY_ACTIVE_MS / 50) - 1);
    expect(c.collapseCause).toBeNull();
  });

  it('while collapsed, shape / lift / indent / open do nothing', () => {
    const base: ClayModel = { ...createClay(), collapsed: true, collapseCause: 'thinWall' };
    let c = stepClay(base, actionGesture('pullUp'), 0.05, undefined, lift(0.2));
    c = stepClay(c, shapeGesture(0.5, 0.4), 0.05);
    c = stepClay(c, actionGesture('indent'), 0.05, undefined, INDENT);
    expect(c.height).toBe(base.height);
    expect(c.radii[24]).toBe(1);
    expect(c.cavityDepthWorld).toBe(0);
  });

  it('tear damages the band; overhang is pulled in, never out', () => {
    const torn = stepClay(createClay(), shapeGesture(0.5, 1, false), 0.5, { tearBand: 24, wobbling: false });
    expect(torn.damage[24]).toBeGreaterThan(0);
    expect(torn.damage[0]).toBe(0);
    const c = createClay();
    c.radii[30] = 1.5;
    const next = stepClay(c, shapeGesture(0.5, 1, false), 0.05);
    expect(next.radii[30]).toBeLessThan(1.5);
    expect(next.radii[29]).toBe(1);
  });
});
