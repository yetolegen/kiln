import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/config';
import { createClay, findOverhang, maxStableHeight } from '../src/engine/clay';
import { RuleEngine } from '../src/engine/rules';
import { getTarget, resample, similarity, TARGETS } from '../src/engine/target';
import type { ClayEvent } from '../src/types';
import { frame, hand, shapeGesture } from './helpers';

const vase = getTarget('vase');

describe('target + similarity', () => {
  it('«Ваза» matches the plan and is reachable with the controls', () => {
    expect(vase.name).toBe('Ваза');
    expect(vase.radii.length).toBe(CONFIG.N_BANDS);
    expect(vase.radii[0]).toBeCloseTo(0.95);
    expect(vase.radii[CONFIG.N_BANDS - 1]).toBeCloseTo(0.65);
    expect(Math.max(...vase.radii)).toBeCloseTo(1.1, 1);
    for (const r of vase.radii) {
      expect(r).toBeGreaterThanOrEqual(CONFIG.MIN_R);
      expect(r).toBeLessThanOrEqual(CONFIG.MAX_R);
    }
    expect(vase.height).toBeLessThan(maxStableHeight(vase.radii)); // wouldn't collapse
    expect(findOverhang({ ...createClay(), radii: Float32Array.from(vase.radii), height: vase.height })).toBeNull();
  });

  it('unknown target id falls back to the default; id@version resolves', () => {
    expect(getTarget('nope')).toBe(TARGETS[0]);
    expect(getTarget('vase@1')).toBe(vase);
  });

  it('T16 identical profile = 100; a height change lowers the score', () => {
    expect(similarity(vase.radii, vase.height, vase).score).toBeCloseTo(100);
    expect(similarity(vase.radii, vase.height * 1.3, vase).score).toBeLessThan(95);
    // score doesn't depend on how many bands the profile has
    expect(similarity(resample(vase.radii, 20), vase.height, vase).score).toBeGreaterThan(99);
  });

  it('T15 too wide and too narrow get opposite advice', () => {
    const wide = similarity(vase.radii.map((r) => r + 0.3), vase.height, vase);
    const narrow = similarity(vase.radii.map((r) => r - 0.3), vase.height, vase);
    expect(wide.signedRadiusDeltaWorld).toBeGreaterThan(0);
    expect(narrow.signedRadiusDeltaWorld).toBeLessThan(0);
    expect(wide.score).toBeLessThan(100);

    const cause = (delta: number) => {
      const rules = new RuleEngine();
      const clay = { ...createClay(), radii: Float32Array.from(vase.radii.map((r) => r + delta)), height: vase.height };
      const ev: ClayEvent[] = [];
      for (let t = 0; t < CONFIG.TARGET_HINT_INTERVAL_MS + 200; t += 50) {
        ev.push(...rules.update({
          tMs: t, phase: 'studio', input: frame(t, hand(-1, 0.6), hand(1, 0.6)),
          gesture: shapeGesture(0.5, 1, false), clay, target: vase,
        }).events);
      }
      return ev.find((e) => e.type === 'targetMismatch')?.cause;
    };
    expect(cause(0.3)).toBe('tooWide');
    expect(cause(-0.3)).toBe('tooNarrow');
  });

  it('pot lower than the target → tooLow', () => {
    const rules = new RuleEngine();
    const clay = { ...createClay(), radii: Float32Array.from(vase.radii), height: 1.0 };
    const ev: ClayEvent[] = [];
    for (let t = 0; t < CONFIG.TARGET_HINT_INTERVAL_MS + 200; t += 50) {
      ev.push(...rules.update({
        tMs: t, phase: 'studio', input: frame(t, hand(-1, 0.6), hand(1, 0.6)),
        gesture: shapeGesture(0.5, 1, false), clay, target: vase,
      }).events);
    }
    expect(ev.find((e) => e.type === 'targetMismatch')?.cause).toBe('tooLow');
  });
});
