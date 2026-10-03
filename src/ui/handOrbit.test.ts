import { expect, it } from 'vitest';
import { HandOrbit } from './handOrbit';
import { frame, hand } from '../../tests/helpers';

// >= .5: open hand (seen released); below: a closed fist. Mirrors the old pinch-ratio fixture values.
const pose = (v: number) => v >= .5 ? { pinchRatio: 1, extension: { index: 1, middle: 1, ring: 1, pinky: 1 } } : { pinchRatio: .6, extension: { index: .4, middle: .4, ring: .4, pinky: .4 } };

it.each([1, 2])('continuously rotates with track %i, suppresses repeats, and requires release after loss', (id) => {
  const orbit = new HandOrbit(); let now = 1000;
  const feed = (pinch: number, x: number, track = id) => {
    now += 33; const h = hand(0, .6, { trackId: track, ...pose(pinch), indexTipPx: { x, y: 300 }, palmPx: { x, y: 320 } });
    const f = frame(now, h, null); return { f, delta: orbit.update(f, now, [], 1000, 800) };
  };
  feed(.2, 500); expect(orbit.state).toBe('idle');
  feed(.7, 500); feed(.2, 500);
  for (let i = 0; i < 5; i++) feed(.2, 500);
  expect(orbit.state).toBe('dragging');
  const moved = feed(.2, 520); expect(moved.delta?.x).toBeCloseTo(.02);
  expect(orbit.update(moved.f, now, [], 1000, 800)).toBeNull();
  orbit.update(frame(now + 33, null, null), now + 33, [], 1000, 800);
  feed(.2, 600); expect(orbit.state).toBe('idle');
  feed(.7, 600); feed(.2, 600); for (let i = 0; i < 5; i++) feed(.2, 600);
  expect(orbit.state).toBe('dragging');
  feed(.2, 650, id + 10); expect(orbit.state).toBe('idle');
});

it('a slow frame ends a grab but keeps the open-hand release, so slow devices can still grip', () => {
  const orbit = new HandOrbit(); let now = 1000;
  const feed = (pinch: number, step = 33) => { now += step; return orbit.update(frame(now, hand(0, .6, { ...pose(pinch), indexTipPx: { x: 500, y: 300 }, palmPx: { x: 500, y: 320 } }), null), now, [], 1000, 800); };
  feed(.7); feed(.7, 300); // fingers seen open, then a 300ms render hitch
  feed(.2, 150); feed(.2, 150); feed(.2, 150);
  expect(orbit.state).toBe('dragging');
  feed(.2, 300); expect(orbit.state).toBe('idle'); // a hitch mid-drag still ends the drag (no jump)
  feed(.2, 150); feed(.2, 150); feed(.2, 150); expect(orbit.state).toBe('dragging'); // re-grip without re-opening
});

it('rejects UI grabs, stale frames, jumps and mode resets', () => {
  const orbit = new HandOrbit(); let now = 1000;
  const regions = [{ id: 'button', x: 450, y: 250, width: 100, height: 150 }];
  const feed = (ratio: number) => { now += 33; return frame(now, hand(0, .6, { ...pose(ratio), indexTipPx: { x: 500, y: 300 }, palmPx: { x: 500, y: 330 } }), null); };
  orbit.update(feed(.7), now, regions, 1000, 800); orbit.update(feed(.2), now, regions, 1000, 800);
  expect(orbit.state).toBe('idle');
  orbit.update(feed(.7), now, [], 1000, 800); orbit.update(feed(.2), now, [], 1000, 800);
  for (let i = 0; i < 5; i++) orbit.update(feed(.2), now, [], 1000, 800);
  expect(orbit.state).toBe('dragging');
  const last = feed(.2); expect(orbit.update(last, now + 1000, [], 1000, 800)).toBeNull(); expect(orbit.state).toBe('idle');
  orbit.reset(); orbit.update(feed(.2), now, [], 1000, 800); expect(orbit.state).toBe('idle');
});

it('a pinch no longer rotates; only a fist grabs, and pointing never does', () => {
  const orbit = new HandOrbit(); let now = 1000;
  const feed = (over: object) => { now += 33; return orbit.update(frame(now, hand(0, .6, { indexTipPx: { x: 500, y: 300 }, palmPx: { x: 500, y: 320 }, ...over }), null), now, [], 1000, 800); };
  feed(pose(.7));
  for (let i = 0; i < 8; i++) feed({ pinchRatio: .15 }); // thumb-index pinch with the other fingers open
  expect(orbit.state).toBe('idle');
  for (let i = 0; i < 8; i++) feed({ pointing: true, extension: { index: 1, middle: .4, ring: .4, pinky: .4 }, pinchRatio: .8 });
  expect(orbit.state).toBe('idle');
  for (let i = 0; i < 8; i++) feed(pose(.2));
  expect(orbit.state).toBe('dragging');
});
