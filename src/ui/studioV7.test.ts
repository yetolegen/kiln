import { expect, it } from 'vitest';
import { CONFIG } from '../config';
import { createClay, enforceInvariants, NO_DELTA, stepClay } from '../engine/clay';
import { actionGesture, frame, inSession, moving, poseHand, shapeGesture, T_START } from '../../tests/helpers';
import type { HandFeatures, SessionMode } from '../types';

function fixture(mode: SessionMode, id: number) {
  const core = inSession(mode); let now = T_START;
  const feed = (active: HandFeatures) => {
    now += 33; const c = core.tick(now).clay!;
    const support = poseHand('wall', (id === 1 ? 1 : -1) * c.radii[24], c.height / 2, { trackId: id === 1 ? 2 : 1 });
    active = { ...active, trackId: id };
    const [left, right] = [active, support].sort((a, b) => a.palmWorld.x - b.palmWorld.x);
    core.observe(frame(now, left, right));
    return core.tick(now);
  };
  return { core, feed, now: () => now };
}

for (const mode of ['free', 'commission'] as const) for (const id of [1, 2]) {
  it(`V7 ${mode} hand ${id}: supported horizontal hand below base lifts after a full hold`, () => {
    const f = fixture(mode, id);
    for (let i = 0; i < 105; i++) f.feed(poseHand('flat', 0, -.15));
    const before = f.core.tick(f.now()).clay!.height;
    for (let i = 0; i < 30; i++) f.feed(poseHand('flat', 0, -.15 + i * .033 * 50 / 180, moving(0, .5)));
    expect(f.core.tick(f.now()).clay!.height).toBeGreaterThan(before + .2);
  });
  it(`V7 ${mode} hand ${id}: unrelated flat hand above the base cannot arm a lift`, () => {
    const f = fixture(mode, id);
    for (let i = 0; i < 105; i++) f.feed(poseHand('flat', 0, .25));
    const before = f.core.tick(f.now()).clay!.height;
    for (let i = 0; i < 25; i++) f.feed(poseHand('flat', 0, .25 + i * .033 * 50 / 180, moving(0, .5)));
    expect(f.core.tick(f.now()).clay!.height).toBe(before);
  });
  it(`V7 ${mode} hand ${id}: lifting stops when the active hand leaves sideways`, () => {
    const f = fixture(mode, id);
    for (let i = 0; i < 105; i++) f.feed(poseHand('flat', 0, -.15));
    const before = f.core.tick(f.now()).clay!.height;
    for (let i = 0; i < 25; i++) f.feed(poseHand('flat', 3, -.15 + i * .033 * 50 / 180, moving(0, .5)));
    expect(f.core.tick(f.now()).clay!.height).toBe(before);
  });
  it(`V7 ${mode} hand ${id}: sustained compression reaches 20% initial height before terminal flattening`, () => {
    const f = fixture(mode, id);
    for (let i = 0; i < 25; i++) f.feed(poseHand('flat', 0, 1.3));
    for (let i = 0; i < 180; i++) {
      const c = f.core.tick(f.now()).clay!;
      f.feed(poseHand('flat', 0, c.height + .1, moving(0, -.5)));
    }
    const flat = f.core.tick(f.now()).clay!;
    expect(flat.collapseCause).toBe('pancake');
    expect(flat.height).toBeLessThanOrEqual(CONFIG.INIT_HEIGHT * .2);
  });
}

it('V7 opening can reach 10% original thickness and tears locally without sagging', () => {
  let clay = createClay(); const original = clay.thickness;
  clay.cavityDepthWorld = .8; clay.cavityRadiusWorld = .8;
  clay.radii[32] = .95; enforceInvariants(clay);
  const height = clay.height;
  for (let i = 0; i < 30; i++) clay = stepClay(clay, actionGesture('open'), .033, undefined, { ...NO_DELTA, spreadRatio: .02 });
  expect(clay.collapseCause).toBe('wallTorn');
  expect(clay.thickness).toBeLessThanOrEqual(original * .1 + 1e-6);
  expect(clay.height).toBe(height);
  expect(clay.damage[32]).toBeGreaterThanOrEqual(.65);
  expect(clay.damage[0]).toBe(0);
});

it('V7 critical thin cavity wall ruptures instead of entering recoverable thinWall sag', () => {
  let clay = createClay(); clay.cavityDepthWorld = .8; clay.cavityRadiusWorld = .93;
  clay = enforceInvariants(clay); const height = clay.height;
  const torn = stepClay(clay, actionGesture('open'), .033, undefined, { ...NO_DELTA, spreadRatio: .001 });
  expect(torn.collapseCause).toBe('wallTorn');
  expect(torn.height).toBe(height);
});

it.each(['pancake', 'wallTorn'] as const)('terminal %s freezes every shaping action and its failure cause', (cause) => {
  const clay = createClay(); clay.collapsed = true; clay.collapseCause = cause;
  if (cause === 'pancake') clay.height = CONFIG.INIT_HEIGHT * .2;
  else { clay.cavityRadiusWorld = .9; clay.cavityDepthWorld = .8; clay.damage[32] = .8; }
  for (const g of [shapeGesture(.5, .8), ...(['pullUp', 'indent', 'open', 'compressRim'] as const).map((a) => actionGesture(a))]) {
    const next = stepClay(clay, g, .033, undefined, { shapeWorld: -.2, liftWorld: .1, indentWorld: .1, spreadRatio: .2, compressWorld: .1, stretchMs: 12_000 });
    expect(next).toEqual(clay);
  }
  expect(createClay().collapsed).toBe(false);
});
