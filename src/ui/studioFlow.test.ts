import { expect, it } from 'vitest';
import { frame, hand, inSession, moving, poseHand, shapingHands, T_START } from '../../tests/helpers';
import type { HandFeatures, SessionMode } from '../types';

const modes = ['free', 'commission'] as const;

it.each(modes)('%s requires explicit Done: raised hands cannot unlock glazing', (mode) => {
  const core = inSession(mode);
  for (let t = T_START + 33; t < T_START + 2500; t += 33) {
    core.observe(frame(t, hand(-1, 1.7), hand(1, 1.7))); core.tick(t);
  }
  expect(core.tick(T_START + 2500).phase).toBe('studio');
});

it.each(modes)('%s gates glaze/firing commands until Done and a selected glaze', (mode) => {
  const core = inSession(mode);
  core.dispatch({ type: 'selectGlaze', glazeId: 'jade' }, T_START + 1);
  core.dispatch({ type: 'confirmGlaze' }, T_START + 2);
  expect(core.tick(T_START + 3).phase).toBe('studio');
  expect(core.tick(T_START + 3).glazeId).toBeNull();
  core.dispatch({ type: 'finishShaping' }, T_START + 4);
  expect(core.tick(T_START + 5).phase).toBe('glaze');
  core.dispatch({ type: 'confirmGlaze' }, T_START + 6);
  expect(core.tick(T_START + 7).phase).toBe('glaze');
  core.dispatch({ type: 'selectGlaze', glazeId: 'jade' }, T_START + 8);
  core.dispatch({ type: 'confirmGlaze' }, T_START + 9);
  expect(core.tick(T_START + 10).phase).toBe('firing');
});

function fixture(mode: SessionMode, id: number) {
  const core = inSession(mode);
  let now = T_START;
  const feed = (left: HandFeatures | null, right: HandFeatures | null) => {
    now += 33; core.observe(frame(now, left, right)); return core.tick(now);
  };
  const action = (make: (seconds: number) => HandFeatures, count: number) => {
    for (let i = 0; i < count; i++) {
      const active = { ...make(i * .033), trackId: id };
      const clay = core.tick(now).clay!;
      const support = poseHand('wall', id === 1 ? 1 : -1, clay.height / 2, { trackId: id === 1 ? 2 : 1 });
      feed(id === 1 ? active : support, id === 1 ? support : active);
    }
    return core.tick(now).clay!;
  };
  const release = () => { for (let i = 0; i < 8; i++) feed(null, null); };
  return { core, feed, action, release, clay: () => core.tick(now).clay! };
}

for (const mode of modes) it.each([1, 2])('%s supports all five pottery actions with active hand %i'.replace('%s', mode), (id) => {
  const f = fixture(mode, id);
  const initial = f.clay();
  for (let i = 0; i < 30; i++) {
    const [left, right] = shapingHands(i * 33);
    f.feed({ ...left, trackId: id }, { ...right, trackId: id === 1 ? 2 : 1 });
  }
  expect(f.clay().radii[24]).toBeLessThan(initial.radii[24] - .15);
  f.release();
  const shaped = f.clay();
  f.action(() => poseHand('flat', 0, 0), 105);
  const lifted = f.action((s) => poseHand('flat', 0, s * 50 / 180, moving(0, .5)), 25);
  expect(lifted.height).toBeGreaterThan(shaped.height + .15);
  f.release();
  const dent = f.action((s) => poseHand('thumbDown', 0, lifted.height - s * .3, moving(0, -.54)), 12);
  expect(dent.cavityDepthWorld).toBeGreaterThan(.05);
  expect(dent.bottomHole).toBe(false);
  f.release();
  f.action(() => poseHand('pinch', 0, lifted.height - .05), 13);
  const opened = f.action((s) => poseHand('spread', 0, lifted.height - .05, { ratio: .2 + s }), 20);
  expect(opened.cavityRadiusWorld).toBeGreaterThan(dent.cavityRadiusWorld + .15);
  expect(opened.cavityDepthWorld).toBeGreaterThan(dent.cavityDepthWorld + .2);
  expect(opened.thickness).toBeLessThan(dent.thickness - .15);
  f.release();
  f.action(() => poseHand('flat', 0, opened.height + .1), 25);
  const compressed = f.action((s) => poseHand('flat', 0, opened.height + .1 - s * 50 / 180, moving(0, -.5)), 25);
  expect(compressed.height).toBeLessThan(opened.height - .15);
  expect(compressed.collapsed).toBe(false);
});
