import { describe, expect, it } from 'vitest';
import { createClay, stepClay, type ClayModel } from '../src/engine/clay';
import { GestureRecognizer } from '../src/tracking/gestures';
import type { GestureContext, GestureState, HandFeatures } from '../src/types';
import { frame, hand, PROJ } from './helpers';

const FIST = { extension: { index: 0, middle: 0, ring: 0, pinky: 0 } };
const PINCH = { pinchRatio: 0.2 };
const moving = (vy: number) => ({ velocityPalmPerS: { x: 0, y: vy } });

const CTX: GestureContext = { phase: 'studio', potHeightWorld: 1.2, uiEnabled: false };
const TOP = 47;

/** Feed the same pair of hands for `ms`, stepping the clay like the controller does. */
function run(
  l: HandFeatures | null, r: HandFeatures | null, ms = 600,
  start?: { rec: GestureRecognizer; clay: ClayModel; t: number }, ctx: GestureContext = CTX,
) {
  const rec = start?.rec ?? new GestureRecognizer();
  let clay = start?.clay ?? createClay();
  let g!: GestureState;
  let t = start?.t ?? 0;
  for (const end = t + ms; t <= end; t += 33) {
    g = rec.update(frame(t, l, r), ctx, clay, PROJ);
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
    expect(run(hand(-1, 0.6, { pinchRatio: 0.2 }), hand(1, 0.6, { pinchRatio: 0.2 })).g.gesture).toBe('pullUp');
    const fist = { extension: { index: 0, middle: 0, ring: 0, pinky: 0 } };
    expect(run(hand(-1, 0.6, fist), hand(1, 0.6, fist)).g.gesture).toBe('pressDown');
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

describe('pull / press / raise / point', () => {
  it('pinch moving up = pullUp with motion; stationary pinch does nothing', () => {
    const still = run(hand(-1, 0.6, PINCH), hand(1, 0.6, PINCH));
    expect(still.g.gesture).toBe('pullUp');
    expect(still.g.motionStrength).toBe(0);
    expect(still.g.deforming).toBe(false);
    expect(still.clay.height).toBe(1.2);

    const up = run(hand(-1, 0.6, { ...PINCH, ...moving(1.5) }), hand(1, 0.6, { ...PINCH, ...moving(1.5) }));
    expect(up.g.motionStrength).toBeCloseTo(1);
    expect(up.g.deforming).toBe(true);
    expect(up.clay.height).toBeGreaterThan(1.2);
  });

  it('motionStrength follows the SLOWER hand; one hand not moving → zero', () => {
    const g1 = run(hand(-1, 0.6, { ...PINCH, ...moving(1.5) }), hand(1, 0.6, { ...PINCH, ...moving(0.75) })).g;
    expect(g1.motionStrength).toBeCloseTo(0.5);
    const g2 = run(hand(-1, 0.6, { ...PINCH, ...moving(1.5) }), hand(1, 0.6, PINCH)).g;
    expect(g2.motionStrength).toBe(0);
  });

  it('fists moving down = pressDown lowers the pot', () => {
    const s = run(hand(-1, 0.6, { ...FIST, ...moving(-1.5) }), hand(1, 0.6, { ...FIST, ...moving(-1.5) }));
    expect(s.g.gesture).toBe('pressDown');
    expect(s.clay.height).toBeLessThan(1.2);
  });

  it('pointing hand is point, not fist, and gives a cursor only when UI is enabled', () => {
    const pt = { extension: { index: 1, middle: 0, ring: 0, pinky: 0 }, pointing: true, indexTipPx: { x: 10, y: 20 } };
    const off = run(hand(-1, 0.6, pt), hand(1, 0.6, FIST)).g;
    expect(off.gesture).not.toBe('point');
    const on = run(hand(-1, 0.6, pt), null, 600, undefined, { ...CTX, uiEnabled: true }).g;
    expect(on.gesture).toBe('point');
    expect(on.cursorPx).toEqual({ x: 10, y: 20 });
  });

  it('in studio, a pointing hand next to a second hand is not a cursor (no accidental "start over")', () => {
    const pt = { extension: { index: 1, middle: 0, ring: 0, pinky: 0 }, pointing: true };
    const ui = { ...CTX, uiEnabled: true };
    expect(run(hand(-1, 0.6, pt), hand(1, 0.6, FIST), 600, undefined, ui).g.gesture).not.toBe('point');
    expect(run(hand(-1, 0.6, pt), hand(1, 0.6, FIST), 600, undefined, { ...ui, phase: 'menu' }).g.gesture).toBe('point');
  });

  it('two visible hands in a reacquiring frame are never called oneHand', () => {
    const rec = new GestureRecognizer();
    const clay = createClay();
    let g!: GestureState;
    for (let t = 0; t <= 300; t += 33) g = rec.update(frame(t, hand(-1, 0.6), hand(1, 0.6)), CTX, clay, PROJ);
    g = rec.update({ ...frame(333, hand(-1, 0.6), hand(1, 0.6)), status: 'reacquiring' }, CTX, clay, PROJ);
    expect(g.gesture).not.toBe('oneHand');
    expect(g.deforming).toBe(false); // but no deformation on an unreliable frame
  });

  it('raise: open hands above the pot top + margin, held', () => {
    const s = run(hand(-1, 1.6), hand(1, 1.6), 1600);
    expect(s.g.gesture).toBe('raise');
    expect(s.g.holdMs).toBeGreaterThanOrEqual(1400);
    expect(s.g.deforming).toBe(false);
  });

  it('raise is not available in menu', () => {
    expect(run(hand(-1, 1.6), hand(1, 1.6), 600, undefined, { ...CTX, phase: 'menu' }).g.gesture).not.toBe('raise');
  });

  it('collapsed pot: only press deforms', () => {
    const clay = { ...createClay(), collapsed: true, collapseCause: 'tooTall' as const };
    const rec = new GestureRecognizer();
    const shape = run(hand(-0.8, 0.6), hand(0.8, 0.6), 600, { rec, clay, t: 0 });
    expect(shape.g.deforming).toBe(false);
    const press = run(hand(-1, 0.6, { ...FIST, ...moving(-1.5) }), hand(1, 0.6, { ...FIST, ...moving(-1.5) }), 600,
      { rec: new GestureRecognizer(), clay, t: 0 });
    expect(press.g.deforming).toBe(true);
  });
});

describe('near-miss', () => {
  it('never from a neutral pose', () => {
    const relaxed = { extension: { index: 0.4, middle: 0.4, ring: 0.4, pinky: 0.4 }, pinchRatio: 0.5 };
    expect(run(hand(-1, 0.6, relaxed), hand(1, 0.6, relaxed)).g.nearMiss).toBeNull();
  });

  it('pinchLoose: one hand pinched, other almost, both moving up → names the loose hand', () => {
    const nm = run(
      hand(-1, 0.6, { ...PINCH, ...moving(1) }),
      hand(1, 0.6, { pinchRatio: 0.5, trackId: 7, ...moving(1) }),
    ).g.nearMiss;
    expect(nm?.reason).toBe('pinchLoose');
    expect(nm?.handTrackId).toBe(7);
    expect(nm?.params.side).toBe('right');
  });

  it('fistLoose when the tutorial expects press', () => {
    const loose = { extension: { index: 0.5, middle: 0.3, ring: 0.3, pinky: 0.3 } };
    const nm = run(hand(-1, 0.6, FIST), hand(1, 0.6, loose), 600, undefined,
      { ...CTX, phase: 'tutorial', expectedGesture: 'pressDown' }).g.nearMiss;
    expect(nm?.reason).toBe('fistLoose');
    expect(nm?.params.side).toBe('right');
  });

  it('handsTooFar names the hand that is off its wall', () => {
    const nm = run(hand(-1.0, 0.6), hand(2.0, 0.6)).g.nearMiss;
    expect(nm?.reason).toBe('handsTooFar');
    expect(nm?.params).toMatchObject({ side: 'right', dir: 'in' });
  });

  it('notMoving only during an explicit attempt', () => {
    const tut: GestureContext = { ...CTX, phase: 'tutorial', expectedGesture: 'pullUp' };
    expect(run(hand(-1, 0.6, PINCH), hand(1, 0.6, PINCH), 1200, undefined, tut).g.nearMiss?.reason).toBe('notMoving');
    expect(run(hand(-1, 0.6, PINCH), hand(1, 0.6, PINCH), 1200).g.nearMiss).toBeNull();
  });
});
