// v9.2 local outside widening at real palm scale (215 px palm, 145 px/unit): it widens at the pinch height,
// and the grip's contact is judged at the pinch points (a real palm sits ~a palm above them).
import { expect, it } from 'vitest';
import { rframe, rpose, rsession, PALM_W } from './realScale';

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
  for (const far of [0, d.length - 1]) if (Math.abs(far - band) > 12) expect(d[far]).toBeLessThan(.02);
});
