// Lesson steps 1 (narrow) and 2 (widen) driven through the real controller and lesson script at real palm scale
// (215 px palm, 145 px/unit) with ±2 px palm jitter. A brisk stroke under the too-fast limit used to fail both:
// the speed cap was applied per band, flattening the Gaussian into a plateau whose flanks overshot the target.
import { expect, it } from 'vitest';
import { TutorialScript } from '../src/ui/tutorial';
import { rframe, rpose, rsession, PALM_W } from './realScale';

function lcg(seed: number) { let s = seed; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }

function attempt(step: 0 | 1, band: number, speed: number, seed: number): string {
  const rand = lcg(seed), n = () => (rand() * 2 - 1) * 2 / 145;
  const { core, t: t0 } = rsession('tutorial'); let t = t0, id = 1;
  const lesson = new TutorialScript((c) => core.dispatch(c, t));
  t += 33; core.observe(rframe(t, rpose('wall', -3, .6), rpose('wall', 3, .6), id++)); lesson.update(core.tick(t), t);
  if (step === 1) (lesson as unknown as { enter(s: number, c: unknown): void }).enter(1, core.tick(t).clay);
  const c0 = core.tick(t).clay!, y = band / 47 * c0.height;
  // narrowing: open palms whose inner edge starts outside the wall move in; widening: pinches at the wall spread
  let x = step === 0 ? c0.radii[band] + .45 * PALM_W + .3 : c0.radii[band] + .02;
  const dir = step === 0 ? -1 : 1, pose = step === 0 ? 'wall' : 'pinch';
  for (let k = 0; k < 300 && lesson.status === 'working'; k++) {
    t += 33; const v = k > 20 ? speed : 0; if (k > 20) x += dir * speed * PALM_W / 30;
    core.observe(rframe(t, rpose(pose, -x + n(), y + n(), { trackId: 1, vx: -dir * v }), rpose(pose, x + n(), y + n(), { trackId: 2, vx: dir * v }), id++));
    lesson.update(core.tick(t), t);
  }
  return lesson.status;
}

for (const step of [0, 1] as const) {
  it.each([[24, .3], [20, .6], [29, 1.0], [24, 1.15]])(`lesson step ${step + 1}: a stroke at band %i and %f palm/s matches`, (band, speed) => {
    for (const seed of [1, 2, 3]) expect(attempt(step, band, speed, seed)).toBe('matched');
  });
}
