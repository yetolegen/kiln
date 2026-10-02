// QA pass 2026-10-02: minimal repros of confirmed real-hand bugs. Each failed on 97bf882.
import { expect, it } from 'vitest';
import { frame, hand, inSession, moving, poseHand, PROJ, shapeGesture, T_START } from './helpers';
import { createClay, enforceInvariants, stepClay } from '../src/engine/clay';
import { GestureRecognizer } from '../src/tracking/gestures';
import { RuleEngine } from '../src/engine/rules';
import { getTarget } from '../src/engine/target';
import { hintText } from '../src/i18n';
import { TutorialScript } from '../src/ui/tutorial';
import { SessionTracker } from '../src/engine/session';
import { isSessionResult } from '../src/browser/storage';
import { PALM_W, rframe, rpose, rsession } from './realScale';

it('ext-widen: a grip blocked before it armed (pinched while arriving fast) never arms, even after a long still hold', () => {
  const core = inSession('free'); let now = T_START, x = 1.6;
  const feed = (vx: number) => {
    now += 33;
    core.observe(frame(now, hand(-x, .6, { pinchRatio: .2, trackId: 1, ...moving(-vx, 0) }), hand(x, .6, { pinchRatio: .2, trackId: 2, ...moving(vx, 0) })));
    return core.tick(now);
  };
  for (let i = 0; i < 6; i++) { x -= .09; feed(-1.5); } // already pinched while bringing the hands in (1.5 palm/s)
  x = 1.05;
  let s = feed(0);
  for (let i = 0; i < 45; i++) s = feed(0); // 1.5 s perfectly still at the walls
  expect(s.gesture!.gesture).toBe('widen');
  expect(s.gesture!.nearMiss).toBeNull(); // no hint either
  expect(s.gesture!.activationProgress).toBe(1); // observed: 0 forever, until the pinches are opened
});

it('ext-widen: a grip blocked by a vertical reposition before arming never arms', () => {
  const core = inSession('free'); let now = T_START, y = 0;
  const feed = (vy: number) => {
    now += 33;
    core.observe(frame(now, hand(-1.05, y, { pinchRatio: .2, trackId: 1, ...moving(0, vy) }), hand(1.05, y, { pinchRatio: .2, trackId: 2, ...moving(0, vy) })));
    return core.tick(now);
  };
  for (let i = 0; i < 20; i++) { y += .03; feed(.9); } // pinch low, then raise both hands to mid-height (0.9 palm/s < 1.2 limit)
  let s = feed(0);
  for (let i = 0; i < 45; i++) s = feed(0);
  expect(s.gesture!.activationProgress).toBe(1); // observed: 0
});

it('shape: hands at a band boundary lose most of the narrowing (each band flip rebases the touch)', () => {
  // y = .6 on a 1.2 pot is exactly between bands 23 and 24; ±0.001 world (0.18 px) of palm noise flips the band
  const narrowing = (noise: number) => {
    const core = inSession('free'); let now = T_START;
    const before = core.tick(now).clay!.radii[24];
    for (let i = 0; i < 60; i++) {
      now += 33;
      const half = 1.3 - i * .01, y = .6 + (i % 2 ? noise : -noise);
      core.observe(frame(now, poseHand('wall', -half, y, moving(.54, 0)), poseHand('wall', half, y, moving(-.54, 0))));
    }
    return before - core.tick(now).clay!.radii[24];
  };
  const clean = narrowing(0), noisy = narrowing(.001);
  console.log('narrowing clean', clean.toFixed(3), 'with 0.18 px palm noise', noisy.toFixed(3));
  expect(noisy).toBeGreaterThan(clean * .9); // observed: clean 0.378, noisy 0.000
});

it('copy: commission "too narrow" advice tells the user to put a finger into an opening the solid pot does not have', () => {
  const target = getTarget('vase');
  const clay = createClay();
  clay.height = target.height;
  target.radii.forEach((r, i) => (clay.radii[i] = r - (i >= 8 && i <= 12 ? .12 : 0))); // solid, narrower near u≈.2
  enforceInvariants(clay);
  expect(clay.cavityDepthWorld).toBe(0);
  const rules = new RuleEngine();
  let ev;
  for (let t = 0; t <= 3100; t += 100) {
    const out = rules.update({ tMs: t, phase: 'studio', input: frame(t, hand(-3, 0), hand(3, 0)), gesture: shapeGesture(.5, 1, false), clay, target });
    ev = out.active.find((e) => e.type === 'targetMismatch') ?? ev;
  }
  const text = hintText({ id: 'targetMismatch', params: { cause: ev!.cause! }, severity: 'info', priority: 40, expiresAtMs: 0, speak: false });
  console.log(ev!.cause, '→', text);
  expect(text).not.toMatch(/отверсти/); // observed: «Опустите палец в отверстие…» although there is no opening
});

it('glitch: one bad finger reading per second during an armed rim press loses over half the compression (lift has a grace for this, rim does not)', () => {
  const pressed = (glitch: boolean) => {
    const core = inSession('free'); let now = T_START;
    const h0 = core.tick(now).clay!.height;
    for (let k = 1; k <= 66; k++) { // 0.7 s still hold, then 1.5 s down at 0.2 palm/s
      now += 33;
      const down = Math.max(0, k - 21);
      let rim = poseHand('flat', 0, 1.45 - down * .2 * (100 / 180) / 30, moving(0, down ? -.2 : 0));
      if (glitch && down > 0 && k % 30 === 0) rim = { ...rim, extension: { ...rim.extension, middle: .3 } };
      core.observe(frame(now, poseHand('wall', -1, .6), rim));
    }
    return h0 - core.tick(now).clay!.height;
  };
  const clean = pressed(false), glitchy = pressed(true);
  console.log('rim compression clean', clean.toFixed(3), 'with 1 glitch frame/s', glitchy.toFixed(3));
  expect(glitchy).toBeGreaterThan(clean * .8);
});

it('raise (studio): a support palm on the upper wall turns a rim press into "raise", which does nothing in the studio', () => {
  const press = (supportY: number) => {
    const core = inSession('free'); let now = T_START;
    const h0 = core.tick(now).clay!.height, seen = new Set<string>();
    for (let k = 1; k <= 120; k++) {
      now += 33;
      const down = Math.max(0, k - 21);
      core.observe(frame(now, poseHand('wall', -1, supportY), poseHand('flat', 0, 1.45 - down * .2 * (100 / 180) / 30, moving(0, down ? -.2 : 0))));
      seen.add(core.tick(now).gesture!.gesture);
    }
    return { pressed: h0 - core.tick(now).clay!.height, seen: [...seen] };
  };
  const low = press(.6), high = press(1.2);
  console.log('support at mid-wall:', low, ' support at the rim:', high);
  expect(high.seen).not.toContain('raise');
  // (it still presses less: once the rim drops below the fixed support palm, that palm no longer holds a wall)
  expect(high.pressed).toBeGreaterThan(low.pressed * .7);
});

it('lesson step 4 «ямка» (real scale): a thumb press below the indentTooFast limit jumps past the ±0.025 depth window and fails the lesson', () => {
  const outcome = (palmPerS: number) => {
    const { core, t: t0 } = rsession('tutorial'); // 215 px palm, 145 px/unit
    let t = t0, id = 1;
    const lesson = new TutorialScript((c) => core.dispatch(c, t));
    t += 33; core.observe(rframe(t, rpose('wall', -3, .6), rpose('wall', 3, .6), id++)); lesson.update(core.tick(t), t);
    (lesson as any).enter(3, core.tick(t).clay); // the dent step (index 3)
    for (let k = 1; k <= 90 && lesson.status === 'working'; k++) {
      t += 33;
      core.observe(rframe(t, rpose('wall', -1.35, .6), rpose('thumbDown', .02, 1.3 - palmPerS * PALM_W * k / 30, { vy: -palmPerS }), id++));
      lesson.update(core.tick(t), t);
    }
    return `${lesson.status} depth ${core.tick(t).clay!.cavityDepthWorld.toFixed(3)} (target .12 ± .025) nearMiss ${core.tick(t).gesture?.nearMiss?.reason ?? '-'}`;
  };
  const slow = outcome(.3), brisk = outcome(1.9); // INDENT_MAX_PALM_PER_S = 2.0
  console.log('dent at 0.3 palm/s:', slow, '| at 1.9 palm/s:', brisk);
  expect(brisk).not.toMatch(/^failed/);
});

it('storage (rare): gallery validation computes the cavity start band with a different float formula than the engine', () => {
  const clay = createClay();
  clay.height = 0.9 + 40 * 0.001; clay.cavityDepthWorld = .32; clay.cavityRadiusWorld = .3; // h = 0.9400000000000001
  clay.radii[30] = .8; // narrowed just below the opening
  enforceInvariants(clay);
  // engine: floor(((h - d) / h) * 47) = 31; storage: floor((1 - d / h) * 47) = 30
  const result = new SessionTracker('s', 'free', 0).finalize(clay, 'jade', '2026-10-02T00:00:00.000Z', 1000);
  console.log('h', clay.height, 'd', clay.cavityDepthWorld, 'cr', clay.cavityRadiusWorld, 'eng', Math.floor(((clay.height - clay.cavityDepthWorld) / clay.height) * 47), 'sto', Math.floor((1 - clay.cavityDepthWorld / clay.height) * 47), 'engine thickness', clay.thickness.toFixed(3), 'valid for the gallery:', isSessionResult(result));
  expect(isSessionResult(result)).toBe(true); // observed: false, the fired pot is silently not saved
});

it('ext-widen: one frame of a loosened pinch (or a one-frame hand dropout) ends the stroke for good while the hands keep spreading', () => {
  const spread = (glitchFrame: number | null) => {
    const core = inSession('free'); let now = T_START, x = 1.05;
    const before = core.tick(now).clay!.radii[20];
    for (let k = 1; k <= 75; k++) { // 0.66 s still hold, then 1.8 s spreading at 0.3 palm/s
      now += 33;
      const moving_ = k > 20, vx = moving_ ? .3 : 0;
      if (moving_) x += .3 * (100 / 180) / 30;
      const loose = k === glitchFrame;
      core.observe(frame(now, hand(-x, .6, { pinchRatio: loose ? .6 : .2, trackId: 1, ...moving(-vx, 0) }), hand(x, .6, { pinchRatio: .2, trackId: 2, ...moving(vx, 0) })));
    }
    return core.tick(now).clay!.radii[20] - before;
  };
  const clean = spread(null), glitch = spread(35);
  console.log('outside widening clean', clean.toFixed(3), 'with one loose-pinch frame', glitch.toFixed(3));
  expect(glitch).toBeGreaterThan(clean * .8);
});

it('lift (real palm): on a short pot the lift zone overlaps the rim zone and the rim press takes the lift hand', () => {
  // real palm 215 px at 145 px/unit = 1.48 world; in test px (180/unit) the reference palm is 267 px
  const big = { referencePalmSizePx: 215 * 180 / 145 };
  const clay = createClay(); clay.height = 0.9; enforceInvariants(clay);
  const rec = new GestureRecognizer(); const seen = new Set<string>(); let c = clay;
  for (let t = 0; t <= 3600; t += 33) {
    const g = rec.update(frame(t, poseHand('wall', -1.3, .45, { trackId: 1, ...big }), poseHand('flat', 0, .45, { trackId: 2, ...big })),
      { phase: 'studio', potHeightWorld: c.height, uiEnabled: false }, c, PROJ);
    c = stepClay(c, g, .033, undefined, rec.delta);
    seen.add(g.gesture);
  }
  expect([...seen]).toContain('pullUp'); // observed: only compressRim, the lift never arms
});
