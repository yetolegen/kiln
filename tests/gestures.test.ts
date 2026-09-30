import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/config';
import { createClay, enforceInvariants, stepClay, type ClayModel } from '../src/engine/clay';
import { GestureRecognizer } from '../src/tracking/gestures';
import type { FrameInput, GestureContext, GestureState, HandFeatures } from '../src/types';
import { frame, hand, moving, poseHand, PROJ } from './helpers';

const CTX: GestureContext = { phase: 'studio', potHeightWorld: 1.2, uiEnabled: false };
const TOP = 47;
const DT = 33;

type Hands = (t: number) => [HandFeatures | null, HandFeatures | null];

/** Feed hands for `ms`, stepping the clay exactly like the controller does (incl. the action delta). */
function run(
  hands: Hands | [HandFeatures | null, HandFeatures | null], ms = 600,
  start?: { rec: GestureRecognizer; clay: ClayModel; t: number }, ctx: GestureContext = CTX,
  mapFrame: (f: FrameInput) => FrameInput = (f) => f,
) {
  const get: Hands = typeof hands === 'function' ? hands : () => hands;
  const rec = start?.rec ?? new GestureRecognizer();
  let clay = start?.clay ?? createClay();
  let g!: GestureState;
  let t = start?.t ?? 0;
  const seen: GestureState[] = [];
  for (const end = t + ms; t <= end; t += DT) {
    const [l, r] = get(t);
    g = rec.update(mapFrame(frame(t, l, r)), ctx, clay, PROJ);
    clay = stepClay(clay, g, DT / 1000, undefined, rec.delta);
    seen.push(g);
  }
  return { rec, clay, g, t, seen };
}
const cont = (s: { rec: GestureRecognizer; clay: ClayModel; t: number }) => ({ rec: s.rec, clay: s.clay, t: s.t });

// a support hand at the left wall, mid-height; track ids: support 1, active 2 unless a test swaps them
const SUPPORT = () => poseHand('wall', -1, 0.6, { trackId: 1 });
const SUPPORT_R = () => poseHand('wall', 1, 0.6, { trackId: 2 });

describe('shape gesture', () => {
  it('needs GESTURE_STABLE_MS before it deforms', () => {
    const rec = new GestureRecognizer();
    expect(rec.update(frame(0, hand(-1, 0.6), hand(1, 0.6)), CTX, createClay(), PROJ).deforming).toBe(false);
    expect(run([hand(-1, 0.6), hand(1, 0.6)], 200).g.deforming).toBe(true);
  });

  it('open hands at the walls narrow the pot near the hands only', () => {
    const { clay } = run([hand(-0.8, 0.6), hand(0.8, 0.6)]);
    expect(clay.radii[24]).toBeLessThan(0.95);
    expect(clay.radii[0]).toBeGreaterThan(0.99);
  });

  it('also works with real "wall" landmarks (not mistaken for a one-hand action)', () => {
    const s = run([poseHand('wall', -0.8, 0.6, { trackId: 1 }), poseHand('wall', 0.8, 0.6, { trackId: 2 })]);
    expect(s.g.gesture).toBe('shape');
    expect(s.clay.radii[24]).toBeLessThan(0.95);
  });

  it('T06 hands above or below the pot do not shape the edge bands', () => {
    const above = run([hand(-0.8, 1.2 + 0.3), hand(0.8, 1.2 + 0.3)]).clay;
    const below = run([hand(-0.8, -0.3), hand(0.8, -0.3)]).clay;
    expect(above.radii[TOP]).toBe(1);
    expect(below.radii[0]).toBe(1);
    expect(run([hand(-0.8, 1.15), hand(0.8, 1.15)]).clay.radii[TOP]).toBeLessThan(0.95);
  });

  it('checkpoint: same gap with both hands on one side does nothing', () => {
    const { clay, g } = run([hand(0.2, 0.6), hand(1.8, 0.6)]);
    expect(g.deforming).toBe(false);
    expect(Array.from(clay.radii).every((r) => r === 1)).toBe(true);
  });

  it('checkpoint: a hand leaving stops shaping on that very frame', () => {
    const s = run([hand(-0.8, 0.6), hand(0.8, 0.6)]);
    expect(s.g.deforming).toBe(true);
    const g = s.rec.update(frame(s.t, hand(-0.8, 0.6), null), CTX, s.clay, PROJ);
    expect(g.deforming).toBe(false);
    expect(g.gesture).toBe('oneHand');
  });

  it('old two-pinch / two-fist poses do nothing any more', () => {
    const pinch = run([hand(-1, 0.6, { pinchRatio: 0.2, ...moving(0, 1) }), hand(1, 0.6, { pinchRatio: 0.2, ...moving(0, 1) })]);
    const fist = { extension: { index: 0, middle: 0, ring: 0, pinky: 0 } };
    const fists = run([hand(-1, 0.6, { ...fist, ...moving(0, -1) }), hand(1, 0.6, { ...fist, ...moving(0, -1) })]);
    for (const s of [pinch, fists]) {
      expect(s.seen.some((g) => g.deforming)).toBe(false);
      expect(s.clay.height).toBe(CONFIG.INIT_HEIGHT);
    }
  });

  it('shaping is off outside studio/tutorial-shape phases', () => {
    expect(run([hand(-1, 0.6), hand(1, 0.6)], 600, undefined, { ...CTX, phase: 'menu' }).g.deforming).toBe(false);
  });
});

describe('lift (pullUp): 3 s armed hold, then a slow rise', () => {
  const base = (over: Partial<HandFeatures> = {}) => poseHand('flat', 0, 0, { trackId: 2, ...over });
  const rising = (t0: number, vy = 0.5) => (t: number): [HandFeatures, HandFeatures] =>
    [SUPPORT(), poseHand('flat', 0, ((t - t0) / 1000) * (vy * 100 / 180), { trackId: 2, ...moving(0, vy) })];

  it('a short hold is not enough: progress shows, the pot does not rise', () => {
    const s = run([SUPPORT(), base()], 1000);
    expect(s.g.gesture).toBe('pullUp');
    expect(s.g.activationProgress).toBeGreaterThan(0.25);
    expect(s.g.activationProgress).toBeLessThan(0.5);
    expect(s.g.activeTrackId).toBe(2);
    expect(s.g.supportTrackId).toBe(1);
    expect(s.g.nearMiss?.reason).toBe('holdStill');
    // rising right after a short hold does nothing
    const early = run(rising(s.t), 600, cont(s));
    expect(early.clay.height).toBe(CONFIG.INIT_HEIGHT);
  });

  it('after 3 s still, a slow rise lifts the pot (either hand may be active)', () => {
    for (const [support, activeId] of [[SUPPORT(), 2], [SUPPORT_R(), 1]] as const) {
      const active = (over: Partial<HandFeatures> = {}) => poseHand('flat', 0, 0, { trackId: activeId, ...over });
      const hold = run(() => (activeId === 2 ? [support, active()] : [active(), support]), CONFIG.LIFT_HOLD_MS + 100);
      expect(hold.g.activationProgress).toBe(1);
      const lift = run((t) => {
        const a = poseHand('flat', 0, ((t - hold.t) / 1000) * (50 / 180), { trackId: activeId, ...moving(0, 0.5) });
        return activeId === 2 ? [support, a] : [a, support];
      }, 800, cont(hold));
      expect(lift.seen.some((g) => g.deforming && g.gesture === 'pullUp')).toBe(true);
      expect(lift.clay.height).toBeGreaterThan(CONFIG.INIT_HEIGHT + 0.1);
      expect(lift.g.activeTrackId).toBe(activeId);
    }
  });

  it('moving during the hold resets it', () => {
    const s = run([SUPPORT(), base()], 2000);
    const jiggle = run([SUPPORT(), base(moving(0.5, 0))], 100, cont(s));
    expect(jiggle.g.activationProgress).toBe(0);
  });

  it('rising too fast cancels the lift, says so, and needs a new 3 s hold', () => {
    const hold = run([SUPPORT(), base()], CONFIG.LIFT_HOLD_MS + 100);
    const fast = run(rising(hold.t, 3), 300, cont(hold));
    expect(fast.clay.height).toBe(CONFIG.INIT_HEIGHT);
    expect(fast.seen.some((g) => g.nearMiss?.reason === 'liftTooFast')).toBe(true);
    const slowAgain = run(rising(fast.t, 0.5), 600, cont(fast));
    expect(slowAgain.clay.height).toBe(CONFIG.INIT_HEIGHT); // not re-armed
  });

  it('no support hand at a wall: no progress, and a noSupport hint names the other hand', () => {
    const s = run([poseHand('wall', -2.2, 0.6, { trackId: 1 }), base()], 1500);
    expect(s.g.activationProgress).toBe(0);
    expect(s.g.nearMiss?.reason).toBe('noSupport');
    expect(s.g.nearMiss?.handTrackId).toBe(1);
  });

  it('support lost mid-hold, a switched active hand, or stale input all restart the hold', () => {
    const s = run([SUPPORT(), base()], 2000);
    const lost = run([poseHand('wall', -2.2, 0.6, { trackId: 1 }), base()], 100, cont(s));
    expect(lost.g.activationProgress).toBe(0);

    const s2 = run([SUPPORT(), base()], 2000);
    const switched = run([SUPPORT(), base({ trackId: 7 })], 100, cont(s2));
    expect(switched.g.activationProgress).toBeLessThan(0.1);

    const s3 = run([SUPPORT(), base()], 2000);
    const stale = run([SUPPORT(), base()], 50, cont(s3), CTX, (f) => ({ ...f, status: 'stale' }));
    expect(stale.g.activationProgress).toBe(0);
    const back = run([SUPPORT(), base()], 100, cont(stale));
    expect(back.g.activationProgress).toBeLessThan(0.1);
  });

  it('a vertical (not flat) hand at the base is not a lift, and is coached', () => {
    const s = run([SUPPORT(), poseHand('wall', 0, 0, { trackId: 2 })], 1000);
    expect(s.g.gesture).not.toBe('pullUp');
    expect(s.g.nearMiss?.reason).toBe('notHorizontal');
  });

  it('duplicate observations do not advance the hold', () => {
    const rec = new GestureRecognizer();
    const clay = createClay();
    let g!: GestureState;
    for (let k = 0; k < 20; k++) g = rec.update(frame(100, SUPPORT(), base()), CTX, clay, PROJ);
    expect(g.activationProgress).toBe(0);
  });
});

describe('indent: thumb down at the top centre, one shallow push', () => {
  const thumb = (y: number, over: Partial<HandFeatures> = {}) => poseHand('thumbDown', 0, y, { trackId: 2, ...over });
  const pushing = (t0: number) => (t: number): [HandFeatures, HandFeatures] =>
    [SUPPORT(), thumb(1.2 - ((t - t0) / 1000) * 0.3, moving(0, -0.54))];

  it('a short push makes ONE shallow indentation; holding or repeating never deepens it', () => {
    const s = run(pushing(0), 600);
    expect(s.seen.some((g) => g.gesture === 'indent' && g.deforming)).toBe(true);
    expect(s.clay.cavityDepthWorld).toBeCloseTo(CONFIG.INDENT_DEPTH_WORLD);
    expect(s.clay.cavityRadiusWorld).toBeCloseTo(CONFIG.INDENT_RADIUS_WORLD);
    // hold, release, and push again
    const again = run(pushing(s.t + 400), 600, cont(run([SUPPORT(), hand(1.8, 0.6, { trackId: 2 })], 300, cont(s))));
    expect(again.clay.cavityDepthWorld).toBeCloseTo(CONFIG.INDENT_DEPTH_WORLD);
  });

  it('without the push (just resting) nothing happens; progress shows the travel', () => {
    const s = run([SUPPORT(), thumb(1.2)], 800);
    expect(s.g.gesture).toBe('indent');
    expect(s.clay.cavityDepthWorld).toBe(0);
    expect(s.g.activationProgress).toBe(0);
  });

  it('thumb off the top centre is coached with a direction', () => {
    const s = run([SUPPORT(), thumb(1.2, { palmWorld: { x: 0, y: 0 } })].map((h, i) => (i ? poseHand('thumbDown', 0.8, 1.25, { trackId: 2 }) : h)) as [HandFeatures, HandFeatures], 800);
    expect(s.g.nearMiss?.reason).toBe('thumbNotOnTop');
    expect(s.g.nearMiss?.params.dx).toBe('left');
    expect(s.clay.cavityDepthWorld).toBe(0);
  });
});

describe('open: pinch inside the indentation, then spread slowly', () => {
  const indented = (): ClayModel => enforceInvariants({ ...createClay(), cavityDepthWorld: CONFIG.INDENT_DEPTH_WORLD, cavityRadiusWorld: CONFIG.INDENT_RADIUS_WORLD });
  const at = (ratio: number, over: Partial<HandFeatures> = {}) => poseHand('spread', 0, 1.15, { trackId: 2, ratio, ...over });

  it('pinch → hold → slow spread widens and deepens the opening, within the wall and floor limits', () => {
    const acquired = run([SUPPORT(), at(0.2)], CONFIG.OPEN_ACQUIRE_MS + 100, { rec: new GestureRecognizer(), clay: indented(), t: 0 });
    expect(acquired.g.gesture).toBe('open');
    expect(acquired.g.activationProgress).toBe(1);
    const spread = run((t) => [SUPPORT(), at(0.2 + ((t - acquired.t) / 1000) * 1.0)], 1500, cont(acquired));
    expect(spread.clay.cavityRadiusWorld).toBeGreaterThan(CONFIG.INDENT_RADIUS_WORLD + 0.2);
    expect(spread.clay.cavityDepthWorld).toBeGreaterThan(CONFIG.INDENT_DEPTH_WORLD + 0.3);
    expect(spread.clay.thickness).toBeGreaterThanOrEqual(CONFIG.OPEN_MIN_WALL_WORLD - 1e-6);
    expect(spread.clay.cavityDepthWorld).toBeLessThanOrEqual(spread.clay.height - CONFIG.FLOOR_WORLD + 1e-6);
  });

  it('without an indentation the pinch does nothing and is coached', () => {
    const s = run([SUPPORT(), at(0.2)], 800);
    expect(s.clay.cavityDepthWorld).toBe(0);
    expect(s.g.nearMiss?.reason).toBe('noIndentation');
  });

  it('starting with spread fingers never opens; it asks for a pinch first', () => {
    const s = run((t) => [SUPPORT(), at(0.8 + (t / 1000) * 0.5)], 800, { rec: new GestureRecognizer(), clay: indented(), t: 0 });
    expect(s.clay.cavityRadiusWorld).toBeCloseTo(CONFIG.INDENT_RADIUS_WORLD);
    expect(s.g.nearMiss?.reason).toBe('pinchFirst');
  });

  it('spreading abruptly cancels and needs a fresh pinch', () => {
    const acquired = run([SUPPORT(), at(0.2)], CONFIG.OPEN_ACQUIRE_MS + 100, { rec: new GestureRecognizer(), clay: indented(), t: 0 });
    const jump = run((t) => [SUPPORT(), at(t - acquired.t < 40 ? 1.2 : 1.3)], 400, cont(acquired));
    expect(jump.clay.cavityRadiusWorld).toBeCloseTo(CONFIG.INDENT_RADIUS_WORLD);
    expect(jump.seen.some((g) => g.nearMiss?.reason === 'spreadTooFast')).toBe(true);
  });

  it('thumb-down poking in the opening is indent, not open', () => {
    const s = run([SUPPORT(), poseHand('thumbDown', 0, 1.2, { trackId: 2 })], 600, { rec: new GestureRecognizer(), clay: indented(), t: 0 });
    expect(s.g.gesture).toBe('indent');
  });
});

describe('compressRim: flat hand just above the rim, brief hold, slowly down', () => {
  const rimHand = (y: number, over: Partial<HandFeatures> = {}) => poseHand('flat', 0, y, { trackId: 2, ...over });

  it('hold then slow descent lowers the top a bounded amount and heals upper damage', () => {
    const damaged = createClay();
    damaged.damage.fill(0.8);
    const hold = run([SUPPORT(), rimHand(1.35)], CONFIG.COMPRESS_HOLD_MS + 100, { rec: new GestureRecognizer(), clay: damaged, t: 0 });
    expect(hold.g.gesture).toBe('compressRim');
    expect(hold.g.activationProgress).toBe(1);
    const down = run((t) => [SUPPORT(), rimHand(1.35 - ((t - hold.t) / 1000) * 0.28, moving(0, -0.5))], 2500, cont(hold));
    expect(down.seen.some((g) => g.deforming && g.gesture === 'compressRim')).toBe(true);
    expect(down.clay.height).toBeLessThan(CONFIG.INIT_HEIGHT);
    expect(CONFIG.INIT_HEIGHT - down.clay.height).toBeLessThanOrEqual(CONFIG.COMPRESS_MAX_TOTAL_WORLD + 1e-6);
    expect(down.clay.damage[40]).toBeLessThan(0.8);
    expect(down.clay.damage[5]).toBeCloseTo(0.8); // lower half untouched
  });

  it('moving up stops it; a hand too high is coached lower', () => {
    const hold = run([SUPPORT(), rimHand(1.35)], CONFIG.COMPRESS_HOLD_MS + 100);
    const up = run([SUPPORT(), rimHand(1.35, moving(0, 0.6))], 200, cont(hold));
    expect(up.seen.some((g) => g.deforming)).toBe(false);
    expect(up.g.activationProgress).toBe(0); // stopped; a new hold would be needed
    const high = run([SUPPORT(), rimHand(1.9)], 800);
    expect(high.g.nearMiss?.reason).toBe('rimPlacement');
    expect(high.g.nearMiss?.params.dir).toBe('lower');
  });

  it('works while collapsed, and is the way back', () => {
    const collapsed = { ...createClay(), collapsed: true, collapseCause: 'tooTall' as const };
    const hold = run([SUPPORT(), rimHand(1.35)], CONFIG.COMPRESS_HOLD_MS + 100, { rec: new GestureRecognizer(), clay: collapsed, t: 0 });
    const down = run((t) => [SUPPORT(), rimHand(1.35 - ((t - hold.t) / 1000) * 0.28, moving(0, -0.5))], 1500, cont(hold));
    expect(down.clay.collapsed).toBe(false);
  });
});

describe('raise / point / near-miss', () => {
  it('pointing hand gives a cursor only when UI is enabled', () => {
    const pt = { extension: { index: 1, middle: 0, ring: 0, pinky: 0 }, pointing: true, indexTipPx: { x: 10, y: 20 } };
    expect(run([hand(-1, 0.6, pt), null], 600).g.gesture).not.toBe('point');
    const on = run([hand(-1, 0.6, pt), null], 600, undefined, { ...CTX, uiEnabled: true }).g;
    expect(on.gesture).toBe('point');
    expect(on.cursorPx).toEqual({ x: 10, y: 20 });
  });

  it('a pointing hand that wobbles near the thresholds keeps ONE steady cursor (dwell must not restart)', () => {
    const ui = { ...CTX, phase: 'menu' as const, uiEnabled: true };
    const clear = { extension: { index: 1, middle: 0, ring: 0, pinky: 0 }, pointing: true, indexTipPx: { x: 10, y: 20 } };
    // natural point: index a bit bent, other fingers loosely curled — below the strict entry thresholds
    const loose = { extension: { index: 0.55, middle: 0.42, ring: 0.4, pinky: 0.3 }, pointing: false, indexTipPx: { x: 11, y: 21 } };
    const s = run([hand(-1, 0.6, clear), null], 300, undefined, ui);
    expect(s.g.cursorPx).not.toBeNull();
    const wobble = run((t) => [hand(-1, 0.6, Math.floor(t / DT) % 2 ? loose : clear), null], 1000, cont(s), ui);
    expect(wobble.seen.every((g) => g.gesture === 'point' && g.cursorPx !== null)).toBe(true);
    // a single frame where the pose is lost entirely keeps the cursor too
    const dropped = run((t) => [hand(-1, 0.6, t === wobble.t + DT ? { extension: { index: 0.3, middle: 0.3, ring: 0.3, pinky: 0.3 }, indexTipPx: { x: 12, y: 22 } } : clear), null], 200, cont(wobble), ui);
    expect(dropped.seen.every((g) => g.cursorPx !== null)).toBe(true);
  });

  it('a loose, half-curled hand does not START pointing', () => {
    const loose = { extension: { index: 0.55, middle: 0.42, ring: 0.4, pinky: 0.3 }, pointing: false };
    expect(run([hand(-1, 0.6, loose), null], 600, undefined, { ...CTX, phase: 'menu', uiEnabled: true }).g.gesture).not.toBe('point');
  });

  it('in studio, a pointing hand next to a second hand is not a cursor (no accidental "start over")', () => {
    const pt = { extension: { index: 1, middle: 0, ring: 0, pinky: 0 }, pointing: true };
    const ui = { ...CTX, uiEnabled: true };
    expect(run([hand(-1, 0.6, pt), hand(1, 0.6)], 600, undefined, ui).g.gesture).not.toBe('point');
    expect(run([hand(-1, 0.6, pt), hand(1, 0.6)], 600, undefined, { ...ui, phase: 'menu' }).g.gesture).toBe('point');
  });

  it('two visible hands in a reacquiring frame are never called oneHand', () => {
    const s = run([hand(-1, 0.6), hand(1, 0.6)], 300);
    const g = s.rec.update({ ...frame(s.t, hand(-1, 0.6), hand(1, 0.6)), status: 'reacquiring' }, CTX, s.clay, PROJ);
    expect(g.gesture).not.toBe('oneHand');
    expect(g.deforming).toBe(false);
  });

  it('raise: open hands above the pot top + margin, held; not in menu', () => {
    const s = run([hand(-1, 1.6), hand(1, 1.6)], 1600);
    expect(s.g.gesture).toBe('raise');
    expect(s.g.holdMs).toBeGreaterThanOrEqual(1400);
    expect(run([hand(-1, 1.6), hand(1, 1.6)], 600, undefined, { ...CTX, phase: 'menu' }).g.gesture).not.toBe('raise');
  });

  it('never from a neutral pose', () => {
    const relaxed = { extension: { index: 0.4, middle: 0.4, ring: 0.4, pinky: 0.4 }, pinchRatio: 0.5 };
    expect(run([hand(-1, 0.6, relaxed), hand(1, 0.6, relaxed)], 1000).g.nearMiss).toBeNull();
  });

  it('handsTooFar names the hand that is off its wall', () => {
    const nm = run([hand(-1.0, 0.6), hand(2.0, 0.6)]).g.nearMiss;
    expect(nm?.reason).toBe('handsTooFar');
    expect(nm?.params).toMatchObject({ side: 'right', dir: 'in' });
  });

  it('tutorial: only the expected action deforms', () => {
    const tut: GestureContext = { ...CTX, phase: 'tutorial', expectedGesture: 'shape' };
    const hold = run([SUPPORT(), poseHand('flat', 0, 0, { trackId: 2 })], CONFIG.LIFT_HOLD_MS + 100, undefined, tut);
    const lift = run((t) => [SUPPORT(), poseHand('flat', 0, ((t - hold.t) / 1000) * (50 / 180), { trackId: 2, ...moving(0, 0.5) })], 800, cont(hold), tut);
    expect(lift.clay.height).toBe(CONFIG.INIT_HEIGHT);
  });
});
