import { expect, it } from 'vitest';
import { createController } from '../engine/controller';
import { hand, frame, moving, poseHand, toMenu } from '../../tests/helpers';
import { TutorialScript } from './tutorial';
import { DwellController } from './dwell';
import { createGalleryStore } from '../browser/storage';
import type { AppCommand, HandFeatures } from '../types';

it.each([-1, 1])('dwells once using reported webcam finger readings on side %i despite brief pose dropouts', (side) => {
  const core = createController();
  const start = toMenu(core), dwell = new DwellController();
  const targets = [{ id: 'tutorial', x: 0, y: 0, width: 100, height: 100 }];
  const selected: string[] = [];
  for (let i = 0; i < 80; i++) {
    const now = start + i * 33;
    // A's real-hand finger readings; isolated synthetic frame for the pose dropout.
    const extension = i > 10 && i % 9 === 0 ? { index: .3, middle: .3, ring: .3, pinky: .3 } :
      i % 2 ? { index: 1, middle: .36, ring: .42, pinky: .54 } : { index: 1, middle: .47, ring: .52, pinky: .66 };
    const pointer = hand(side, .6, { extension, pinchRatio: 1.21, indexTipPx: { x: 50, y: 50 } });
    core.observe(frame(now, side < 0 ? pointer : null, side > 0 ? pointer : null));
    const hit = dwell.update(core.tick(now), now, targets);
    if (hit) selected.push(hit);
  }
  expect(selected).toEqual(['tutorial']);
  core.dispatch({ type: 'start', mode: 'tutorial', sessionId: 'measured-point' }, start + 80 * 33);
  expect(core.tick(start + 80 * 33).phase).toBe('tutorial');
});

it.each([1, 2])('integrates v4 lessons with active track %i, one-hand dwell, commission, firing and storage', (activeId) => {
  const core = createController({ nowIso: () => '2026-09-29T18:00:00.000Z' });
  let now = toMenu(core);
  const tutorial = new TutorialScript((command) => core.dispatch(command, now));
  const dwell = new DwellController();
  let command: AppCommand | null = null;
  const target = [{ id: 'action', x: 0, y: 0, width: 100, height: 100 }];
  function feed(left: HandFeatures | null, right: HandFeatures | null, ms: number) {
    for (let end = now + ms; now < end; now += 33) {
      core.observe(frame(now, left, right)); const snap = core.tick(now);
      tutorial.update(snap, now);
      if (dwell.update(snap, now, target) && command) core.dispatch(command, now);
    }
    return core.tick(now);
  }
  function select(next: AppCommand) {
    feed(null, null, 66); command = next;
    const pointing = hand(-1, .6, { pointing: true, extension: { index: 1, middle: 0, ring: 0, pinky: 0 }, indexTipPx: { x: 50, y: 50 } });
    const snap = feed(pointing, null, 1400); command = null; return snap;
  }
  expect(select({ type: 'start', mode: 'tutorial', sessionId: 'lesson' }).phase).toBe('tutorial');
  feed(hand(-.9, .5), hand(.9, .5), 1000); expect(tutorial.step).toBe(1);
  function action(makeHand: (elapsed: number) => HandFeatures, ms: number) {
    const start = now;
    while (now < start + ms) {
      const support = poseHand('wall', activeId === 1 ? 1 : -1, .6, { trackId: activeId === 1 ? 2 : 1 });
      const active = { ...makeHand((now - start) / 1000), trackId: activeId };
      feed(activeId === 1 ? active : support, activeId === 1 ? support : active, 33);
    }
  }
  action(() => poseHand('flat', 0, 0), 3300);
  expect(core.tick(now).gesture!.activationProgress).toBe(1);
  action((s) => poseHand('flat', 0, s * 50 / 180, moving(0, .5)), 500);
  expect(tutorial.step).toBe(2);
  const lifted = core.tick(now).clay!.height;
  action((s) => poseHand('thumbDown', 0, lifted - s * .3, moving(0, -.54)), 600);
  expect(tutorial.step).toBe(3);
  expect(core.tick(now).clay!.cavityDepthWorld).toBeCloseTo(.12);
  action(() => poseHand('pinch', 0, lifted - .05), 400);
  action((s) => poseHand('spread', 0, lifted - .05, { ratio: .2 + s }), 600);
  expect(tutorial.step).toBe(4);
  action(() => poseHand('flat', 0, lifted + .1), 800);
  action((s) => poseHand('flat', 0, lifted + .1 - s * 50 / 180, moving(0, -.5)), 500);
  expect(tutorial.step).toBe(5);
  let top = core.tick(now).clay!.height + .4;
  expect(feed(hand(-1, top), hand(1, top), 2000).phase).toBe('menu');
  expect(select({ type: 'start', mode: 'commission', sessionId: 'commission', targetId: 'vase@1' }).phase).toBe('studio');
  feed(hand(-.9, .5), hand(.9, .5), 800);
  top = core.tick(now).clay!.height + .4;
  expect(feed(hand(-1, top), hand(1, top), 2000).phase).toBe('glaze');
  expect(select({ type: 'selectGlaze', glazeId: 'jade' }).glazeId).toBe('jade');
  expect(select({ type: 'confirmGlaze' }).phase).toBe('firing');
  const result = core.tick(now + 5000).result!;
  expect(result.stats.executionEpisodes.tear).toBeUndefined();
  expect(result.stats.targetId).toBe('vase@1');
  const store = createGalleryStore(() => { throw new Error('disabled'); });
  expect(store.save(result)).toBe(true); expect(store.list()).toHaveLength(1);
});
