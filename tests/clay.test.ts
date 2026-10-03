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
  // cavity: both zero, or both positive with a wall; the floor only reaches 0 as an explicit hole
  expect(c.cavityDepthWorld === 0).toBe(c.cavityRadiusWorld === 0);
  expect(c.cavityDepthWorld).toBeLessThanOrEqual(c.height + EPS);
  expect(c.floorThicknessWorld).toBeCloseTo(c.height - c.cavityDepthWorld, 5);
  if (c.bottomHole) expect(c.floorThicknessWorld).toBe(0);
  else if (c.cavityDepthWorld > 0) expect(c.floorThicknessWorld).toBeGreaterThan(CONFIG.HOLE_FLOOR_WORLD - EPS);
  expect(c.thickness).toBeGreaterThanOrEqual(CONFIG.THICKNESS_FLOOR - EPS);
  if (c.cavityDepthWorld > 0) {
    const wall = Math.min(...Array.from(c.radii).slice(cavityStartBand(c)));
    expect(c.thickness).toBeCloseTo(wall - c.cavityRadiusWorld, 5);
  }
}

const lift = (world: number) => ({ ...NO_DELTA, liftWorld: world });
const spread = (ratio: number) => ({ ...NO_DELTA, spreadRatio: ratio });
const press = (world: number) => ({ ...NO_DELTA, compressWorld: world });
const INDENT = { ...NO_DELTA, indentWorld: 0.01 }; // first push: a 0.01 dent (v6: no fixed first depth)
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
      if (pick < 0.4) c = stepClay(c, shapeGesture(rand() * 1.4 - 0.2, 1, rand() < 0.8), dt, undefined,
        { ...NO_DELTA, shapeWorld: rand() < 0.05 ? w : rand() * .2 - .1 });
      else {
        const kind = kinds[Math.floor(rand() * 4)];
        const d = { ...NO_DELTA, liftWorld: w, indentWorld: rand() < 0.5 ? Math.abs(w) : 0, spreadRatio: w, compressWorld: Math.abs(w), stretchMs: rand() * 12000 };
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
    stepClay(c, shapeGesture(0.5, 0.5), 0.05, undefined, { ...NO_DELTA, shapeWorld: -.1 });
    expect(c.radii[24]).toBe(1);
    expect(c.revision).toBe(0);
  });

  it('shape is rate-limited per second, not per frame', () => {
    const one = stepClay(createClay(), shapeGesture(0.5, 0.25), 0.04, undefined, { ...NO_DELTA, shapeWorld: -.1 });
    let two = stepClay(createClay(), shapeGesture(0.5, 0.25), 0.02, undefined, { ...NO_DELTA, shapeWorld: -.05 });
    two = stepClay(two, shapeGesture(0.5, 0.25), 0.02, undefined, { ...NO_DELTA, shapeWorld: -.05 });
    expect(1 - one.radii[24]).toBeLessThanOrEqual(CONFIG.MAX_DR_PER_S * 0.04 + EPS);
    expect(one.radii[24]).toBeLessThan(.99);
    expect(two.radii[24]).toBeCloseTo(one.radii[24], 3);
  });

  it('a deforming gesture without its delta changes nothing (no fake actions)', () => {
    const shape = stepClay(createClay(), shapeGesture(.5, .25), .03);
    expect(Array.from(shape.radii)).toEqual(Array(48).fill(1));
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

  it('v6: the dent follows thumb travel from the first contact (no fixed first dent), then goes through the floor', () => {
    let c = indented();
    const first = c.cavityDepthWorld;
    expect(first).toBeCloseTo(INDENT.indentWorld * CONFIG.INDENT_GAIN);
    c = stepClay(c, actionGesture('indent'), 0.05, undefined, { ...NO_DELTA, indentWorld: 0.02 });
    expect(c.cavityDepthWorld).toBeCloseTo(first + 0.02 * CONFIG.INDENT_GAIN);
    expect(c.floorThicknessWorld).toBeCloseTo(c.height - c.cavityDepthWorld);
    // one big frame deepens by at most INDENT_MAX_DEPTH_PER_S·dt (it used to skip the lesson's depth window)
    const d = c.cavityDepthWorld;
    c = stepClay(c, actionGesture('indent'), 0.05, undefined, { ...NO_DELTA, indentWorld: 0.2 });
    expect(c.cavityDepthWorld).toBeCloseTo(d + CONFIG.INDENT_MAX_DEPTH_PER_S * 0.05);
    for (let k = 0; k < 80 && !c.bottomHole; k++) c = stepClay(c, actionGesture('indent'), 0.05, undefined, { ...NO_DELTA, indentWorld: 0.1 });
    expect(c.bottomHole).toBe(true);
    expect(c.collapsed).toBe(true);
    expect(c.collapseCause).toBe('bottomHole');
    expect(c.floorThicknessWorld).toBe(0);
    expectInvariants(c);
    // rim compression neither repairs NOR changes it: the failure is frozen with its cause (B's damageFlow regression)
    const frozen = { h: c.height, d: c.cavityDepthWorld, r: c.cavityRadiusWorld, radii: Array.from(c.radii), rev: c.revision };
    for (let k = 0; k < 100; k++) c = stepClay(c, actionGesture('compressRim', 0.5), 0.05, undefined, press(0.05));
    c = stepClay(c, shapeGesture(0.5, 0.3), 0.05, { tearBand: 20, wobbling: true }, { ...NO_DELTA, shapeWorld: -.1 });
    expect(c.collapseCause).toBe('bottomHole');
    expect(c.bottomHole).toBe(true);
    expect({ h: c.height, d: c.cavityDepthWorld, r: c.cavityRadiusWorld, radii: Array.from(c.radii), rev: c.revision }).toEqual(frozen);
    expectInvariants(c);
  });

  it('v5: stretching the opening past STRETCH_DANGER_MS thins the wall, past STRETCH_TEAR_MS tears it (permanent)', () => {
    let c = stepClay(indented(), actionGesture('open'), 0.05, undefined, spread(0.3));
    const r0 = c.cavityRadiusWorld;
    c = stepClay(c, actionGesture('open'), 0.05, undefined, { ...NO_DELTA, stretchMs: CONFIG.STRETCH_DANGER_MS - 100 });
    expect(c.cavityRadiusWorld).toBeCloseTo(r0); // before the danger: holding still changes nothing
    // held still (not deforming) in the danger window still thins
    const held = { ...actionGesture('open'), deforming: false, motionStrength: 0 };
    c = stepClay(c, held, 0.05, undefined, { ...NO_DELTA, stretchMs: CONFIG.STRETCH_DANGER_MS + 500 });
    expect(c.cavityRadiusWorld).toBeGreaterThan(r0);
    expect(c.collapsed).toBe(false);
    c = stepClay(c, held, 0.05, undefined, { ...NO_DELTA, stretchMs: CONFIG.STRETCH_TEAR_MS });
    expect(c.collapseCause).toBe('wallTorn');
    expect(c.damage[47]).toBeGreaterThanOrEqual(0.8);
    for (let k = 0; k < 100; k++) c = stepClay(c, actionGesture('compressRim', 0.5), 0.05, undefined, press(0.001));
    expect(c.collapseCause).toBe('wallTorn');
  });

  it('v5: sustained rim compression is not capped and ends as a permanent pancake', () => {
    let c = createClay();
    for (let k = 0; k < 40 && !c.collapsed; k++) c = stepClay(c, actionGesture('compressRim', 0.5), 0.05, undefined, press(0.05));
    expect(c.collapseCause).toBe('pancake');
    expect(c.height).toBeLessThanOrEqual(CONFIG.PANCAKE_HEIGHT_WORLD + 1e-6);
    const flat = c.height;
    // pressing on can't "recover" it (compression is the recovery for the recoverable collapses only)
    for (let k = 0; k < 100; k++) c = stepClay(c, actionGesture('compressRim', 0.5), 0.05, undefined, press(0.001));
    expect(c.collapseCause).toBe('pancake');
    expect(c.height).toBeLessThanOrEqual(flat);
  });

  it('v5: past the screen ceiling the pot collapses (tooTall) instead of resisting', () => {
    const limits = { maxHeightWorld: 1.5, safeIndentDepthWorld: 0.2 };
    let c: ClayModel = createClay();
    c.radii.fill(1.6); // wide base: only the ceiling can stop it
    c = enforceInvariants(c);
    for (let k = 0; k < 40 && !c.collapsed; k++) c = stepClay(c, actionGesture('pullUp'), 0.05, undefined, lift(0.05), limits);
    expect(c.collapseCause).toBe('tooTall');
    expect(c.maxHeightWorld).toBe(1.5);
  });

  it('opening needs an indentation, keeps the floor, and tears the wall at MIN_THICKNESS without sagging (v7)', () => {
    expect(stepClay(createClay(), actionGesture('open'), 0.05, undefined, spread(1)).cavityDepthWorld).toBe(0);
    let c = indented();
    const height = c.height;
    for (let k = 0; k < 100; k++) c = stepClay(c, actionGesture('open'), 0.05, undefined, spread(0.2));
    expect(c.thickness).toBeGreaterThanOrEqual(CONFIG.MIN_THICKNESS - EPS);
    expect(c.thickness).toBeLessThanOrEqual(CONFIG.MIN_THICKNESS + EPS);
    expect(c.cavityDepthWorld).toBeLessThanOrEqual(c.height - CONFIG.FLOOR_WORLD + EPS);
    expect(c.collapseCause).toBe('wallTorn');
    expect(c.height).toBe(height);
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

  it('lifting an opened pot thins the wall until it tears (wallTorn), once, without sagging (v7)', () => {
    let c = indented();
    c.radii.fill(1.6);
    c = enforceInvariants(c); // wide base so tooTall can't come first
    for (let k = 0; k < 13; k++) c = stepClay(c, actionGesture('open'), 0.05, undefined, spread(0.2));
    expect(c.collapsed).toBe(false);
    let collapses = 0;
    let tornAt = 0;
    for (let k = 0; k < 200; k++) {
      const was = c.collapsed;
      c = stepClay(c, actionGesture('pullUp'), 0.05, undefined, lift(0.05));
      if (!was && c.collapsed) { collapses++; tornAt = c.height; }
    }
    expect(collapses).toBe(1);
    expect(c.collapseCause).toBe('wallTorn');
    expect(c.height).toBe(tornAt); // frozen where it tore, no sag
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
    c = stepClay(c, shapeGesture(0.5, 0.4), 0.05, undefined, { ...NO_DELTA, shapeWorld: -.1 });
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

describe('shape() under the speed cap', () => {
  it('a stroke faster than MAX_DR_PER_S deforms slower but keeps its Gaussian shape (no flattened, widened bump)', () => {
    const fast = stepClay(createClay(), shapeGesture(.5, 1), .033, undefined, { ...NO_DELTA, shapeWorld: -.2 });
    const d = Array.from(fast.radii, (r) => CONFIG.INIT_RADIUS - r), peak = Math.max(...d), centre = d.indexOf(peak);
    expect(peak).toBeCloseTo(CONFIG.MAX_DR_PER_S * .033, 6);
    // 4 bands out (one sigma) a Gaussian keeps exp(-1/2) of its peak; the old per-band clamp kept ~100 % there
    expect(d[centre + CONFIG.SIGMA_BANDS] / peak).toBeCloseTo(Math.exp(-.5), 2);
  });
});

describe('outside widening delta (v9.2)', () => {
  it('widens around widenBandY, not the base, and the inside push keeps its own centre', () => {
    const g = { ...actionGesture('open'), gesture: 'widen' as const };
    const out = stepClay(createClay(), g, .033, undefined, { ...NO_DELTA, externalWidenWorld: .01, widenBandY: .8 });
    const d = Array.from(out.radii, (r) => r - CONFIG.INIT_RADIUS);
    expect(d.indexOf(Math.max(...d))).toBe(Math.round(.8 * (d.length - 1)));
    expect(d[0]).toBeLessThan(1e-4);
  });
});
