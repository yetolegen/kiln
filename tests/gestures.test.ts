import { describe, expect, it } from 'vitest';
import { createClay, stepClay } from '../src/engine/clay';
import { GestureRecognizer } from '../src/tracking/gestures';
import type { ClayState, GestureContext, GestureState, HandFeatures } from '../src/types';
import { frame, hand, PROJ } from './helpers';

const CTX: GestureContext = { phase: 'studio', potHeightWorld: 1.2, uiEnabled: false };
const TOP = 47;

/** Feed the same pair of hands for `ms`, stepping the clay like the controller does. */
function run(l: HandFeatures | null, r: HandFeatures | null, ms = 600, start?: { rec: GestureRecognizer; clay: ClayState; t: number }) {
  const rec = start?.rec ?? new GestureRecognizer();
  let clay = start?.clay ?? createClay();
  let g!: GestureState;
  let t = start?.t ?? 0;
  for (const end = t + ms; t <= end; t += 33) {
    g = rec.update(frame(t, l, r), CTX, clay, PROJ);
    clay = stepClay(clay, g, 0.033);
  }
  return { rec, clay, g, t };
}

describe('shape gesture', () => {
  it('needs GESTURE_STABLE_MS before it deforms', () => {
    const rec = new GestureRecognizer();
    expect(rec.update(frame(0, hand(-1, 0.6), hand(1, 0.6)), CTX, createClay(), PROJ).deforming).toBe(false);
    expect(run(hand(-1, 0.6), hand(1, 0.6), 200).g.deforming).toBe(true);
  });

  it('open hands at the walls narrow the pot near the hands only', () => {
    const { clay } = run(hand(-0.8, 0.6), hand(0.8, 0.6));
    expect(clay.radii[24]).toBeLessThan(0.95);
    expect(clay.radii[0]).toBeGreaterThan(0.99);
  });

  it('T06 hands above or below the pot do not shape the edge bands', () => {
    const above = run(hand(-0.8, 1.2 + 0.3), hand(0.8, 1.2 + 0.3)).clay;
    const below = run(hand(-0.8, -0.3), hand(0.8, -0.3)).clay;
    expect(above.radii[TOP]).toBe(1);
    expect(below.radii[0]).toBe(1);
    // control: just inside the top edge does shape it
    expect(run(hand(-0.8, 1.15), hand(0.8, 1.15)).clay.radii[TOP]).toBeLessThan(0.95);
  });

  it('checkpoint: same gap with both hands on one side does nothing', () => {
    const { clay, g } = run(hand(0.2, 0.6), hand(1.8, 0.6));
    expect(g.deforming).toBe(false);
    expect(Array.from(clay.radii).every((r) => r === 1)).toBe(true);
  });

  it('checkpoint: a hand leaving stops shaping on that very frame', () => {
    const s = run(hand(-0.8, 0.6), hand(0.8, 0.6));
    expect(s.g.deforming).toBe(true);
    const g = s.rec.update(frame(s.t, hand(-0.8, 0.6), null), CTX, s.clay, PROJ);
    expect(g.deforming).toBe(false);
    expect(g.gesture).toBe('oneHand');
  });

  it('pinching or curled hands are not shape', () => {
    expect(run(hand(-1, 0.6, { pinchRatio: 0.2 }), hand(1, 0.6, { pinchRatio: 0.2 })).g.gesture).toBe('none');
    const fist = { extension: { index: 0, middle: 0, ring: 0, pinky: 0 } };
    expect(run(hand(-1, 0.6, fist), hand(1, 0.6, fist)).g.gesture).toBe('none');
  });

  it('shaping is off outside studio/tutorial-shape phases', () => {
    const rec = new GestureRecognizer();
    let g!: GestureState;
    for (let t = 0; t <= 600; t += 33) {
      g = rec.update(frame(t, hand(-1, 0.6), hand(1, 0.6)), { ...CTX, phase: 'menu' }, createClay(), PROJ);
    }
    expect(g.deforming).toBe(false);
  });
});
