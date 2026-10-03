// v9.2 local outside widening at real palm scale (215 px palm, 145 px/unit): it widens at the pinch height,
// and the grip's contact is judged at the pinch points (a real palm sits ~a palm above them).
import { describe, expect, it } from 'vitest';
import { gripPoint } from '../src/tracking/externalWiden';
import { rframe, rpose, rsession, PALM_W, RPROJ } from './realScale';

it.each([.3, .6, .9])('a pinch grip at y=%f widens the wall at that height only', (pinchY) => {
  const { core, t: t0 } = rsession('free'); let t = t0, id = 1;
  const c0 = core.tick(t).clay!, before = Array.from(c0.radii);
  let x = c0.radii[24] + .02, s = core.tick(t);
  for (let k = 0; k < 80; k++) {
    t += 33; const v = k > 20 ? .3 : 0; if (k > 20) x += .3 * PALM_W / 30;
    core.observe(rframe(t, rpose('pinch', -x, pinchY, { trackId: 1, vx: -v }), rpose('pinch', x, pinchY, { trackId: 2, vx: v }), id++));
    s = core.tick(t);
  }
  const d = Array.from(s.clay!.radii, (r, i) => r - before[i]), peak = d.indexOf(Math.max(...d));
  const band = Math.round(pinchY / c0.height * (d.length - 1));
  expect(s.gesture!.gesture).toBe('widen');
  expect(s.gesture!.contact.valid).toBe(true); // the overlay's grip rings need it, even on the upper wall
  expect(Math.abs(peak - band)).toBeLessThanOrEqual(1);
  expect(d[peak]).toBeGreaterThan(.3);
  // the far end of the pot from the grip stays put (whichever end is farther, so it is always checked)
  expect(d[band < d.length / 2 ? d.length - 1 : 0]).toBeLessThan(.02);
  expect(Math.abs(s.gesture!.contact.bandY! * c0.height - pinchY)).toBeLessThan(.06); // contact reported at the pinch
});

/** Same grip at real scale; `move(k)` returns this frame's [left x, right x, y, vx, vy] after the 20-frame hold. */
function grip(move: (k: number, x0: number) => [number, number, number, number, number]) {
  const { core, t: t0 } = rsession('free'); let t = t0, id = 1;
  const c0 = core.tick(t).clay!, before = Array.from(c0.radii), x0 = c0.radii[24] + .02;
  let s = core.tick(t), tooFast = false;
  for (let k = 0; k < 80; k++) {
    t += 33;
    const [lx, rx, y, vx, vy] = k <= 20 ? [x0, x0, .6, 0, 0] as const : move(k - 20, x0);
    core.observe(rframe(t, rpose('pinch', -lx, y, { trackId: 1, vx: -vx, vy }), rpose('pinch', rx, y, { trackId: 2, vx, vy }), id++));
    s = core.tick(t);
    tooFast ||= s.gesture!.nearMiss?.reason === 'widenTooFast';
  }
  return { change: Math.max(...Array.from(s.clay!.radii, (r, i) => Math.abs(r - before[i]))), tooFast };
}

it('guards still block at real scale with pinch-point contact: too fast (with its hint), vertical, one-sided', () => {
  const fast = grip((k, x0) => [x0 + k * 2 * PALM_W / 30, x0 + k * 2 * PALM_W / 30, .6, 2, 0]);
  expect(fast.change).toBeLessThan(.01);
  expect(fast.tooFast).toBe(true);
  // a deliberate vertical move (0.65 palm/s, above the 0.25 palm/s drift the anchor follows) while spreading
  // cuts the stroke short once it has risen 0.2 palm past the anchor (~0.5 s), instead of widening all the way
  const up = .65 * PALM_W / 30, spread = (k: number, x0: number) => x0 + k * .3 * PALM_W / 30;
  const clean = grip((k, x0) => [spread(k, x0), spread(k, x0), .6, .3, 0]).change;
  expect(grip((k, x0) => [spread(k, x0), spread(k, x0), .6 + k * up, .3, .65]).change).toBeLessThan(clean / 3);
  expect(grip((k, x0) => [x0 + k * .3 * PALM_W / 30, x0, .6, .3, 0]).change).toBeLessThan(.01);
});


it('gripPoint is the thumb–index midpoint, or the palm for a hand without landmarks', () => {
  const pinched = rpose('pinch', .9, .5);
  const p = gripPoint(pinched, RPROJ);
  expect(p.x).toBeCloseTo(.9, 3);
  expect(p.y).toBeCloseTo(.5, 3);
  const bare = { ...pinched, landmarksPx: [] };
  expect(gripPoint(bare, RPROJ)).toEqual(bare.palmWorld);
});

describe('the outside grip never fails silently (ECC silent-failure-hunter)', () => {
  it('both pinches held near but off the walls: a widen hint names the hand to bring in', () => {
    const { core, t: t0 } = rsession('free'); let t = t0, id = 1;
    const x = core.tick(t).clay!.radii[24] + 1.2 * PALM_W; let s = core.tick(t);
    for (let k = 0; k < 45; k++) { t += 33; core.observe(rframe(t, rpose('pinch', -x, .6, { trackId: 1 }), rpose('pinch', x + .3, .6, { trackId: 2 }), id++)); s = core.tick(t); }
    expect(s.gesture!.nearMiss).toMatchObject({ intended: 'widen', reason: 'handsTooFar', params: { side: 'right' } });
  });

  it('an armed grip stopped by a vertical move says why, until the pinches open', () => {
    const { core, t: t0 } = rsession('free'); let t = t0, id = 1;
    let x = core.tick(t).clay!.radii[24] + .02, y = .6, s = core.tick(t);
    const feed = (vy: number) => { t += 33; core.observe(rframe(t, rpose('pinch', -x, y, { trackId: 1, vy }), rpose('pinch', x, y, { trackId: 2, vy }), id++)); return core.tick(t); };
    for (let k = 0; k < 20; k++) s = feed(0);
    expect(s.gesture!.activationProgress).toBe(1);
    for (let k = 0; k < 20; k++) { y += .65 * PALM_W / 30; x += .3 * PALM_W / 30; s = feed(.65); }
    expect(s.gesture!.activationProgress).toBe(0);
    for (let k = 0; k < 20; k++) s = feed(0); // now still, but still pinched and blocked
    expect(s.gesture!.nearMiss).toMatchObject({ intended: 'widen', reason: 'widenNotLevel' });
  });
});
