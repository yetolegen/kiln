import { expect, it } from 'vitest';
import { createController } from '../engine/controller';
import { hand, frame, toMenu } from '../../tests/helpers';
import { TutorialScript } from './tutorial';
import { DwellController } from './dwell';
import { createGalleryStore } from '../browser/storage';
import type { AppCommand, HandFeatures } from '../types';

it('integrates real recognition, tutorial, dwell, commission, firing and storage', () => {
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
  const pinch = { pinchRatio: .1, velocityPalmPerS: { x: 0, y: 1 }, velocityWorldPerS: { x: 0, y: 1 } };
  feed(hand(-.9, .5, pinch), hand(.9, .5, pinch), 1000); expect(tutorial.step).toBe(2);
  const fist = { extension: { index: 0, middle: 0, ring: 0, pinky: 0 }, velocityPalmPerS: { x: 0, y: -1 }, velocityWorldPerS: { x: 0, y: -1 } };
  feed(hand(-.9, .5, fist), hand(.9, .5, fist), 1000); expect(tutorial.step).toBe(3);
  feed(hand(-.9, .5), hand(.9, .5), 600);
  const fast = { velocityPalmPerS: { x: 9, y: 0 } };
  feed(hand(-.9, .5, fast), hand(.9, .5, fast), 600); expect(tutorial.step).toBe(4);
  feed(hand(-.9, .5), hand(.9, .5), 1300); expect(tutorial.step).toBe(5);
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
