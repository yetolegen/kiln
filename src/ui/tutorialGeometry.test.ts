import { expect, it } from 'vitest';
import { MockCore } from '../dev/mockCore';
import { assessLessonShape, createLessonGoal } from './tutorialGeometry';

it.each([0, 1, 2, 3, 4, 5])('requires the complete geometry target for step %i and rejects a tiny change', (step) => {
  const c = new MockCore().tick(0).clay!;
  if (step >= 4) { c.cavityRadiusWorld = .12; c.cavityDepthWorld = .12; }
  if (step === 5) { c.cavityRadiusWorld = .38; c.cavityDepthWorld = .588; }
  const goal = createLessonGoal(step, c);
  expect(assessLessonShape(c, goal).matched).toBe(false);
  c.height += .006; c.radii[24] -= .004;
  expect(assessLessonShape(c, goal).matched).toBe(false);
  const reached = { ...c, ...goal.target, radii: Float32Array.from(goal.target.radii) };
  expect(assessLessonShape(reached, goal)).toMatchObject({ matched: true, failure: null });
  expect(goal.start.height).not.toBe(c.height);
});

it('fails over-pulling, over-compression, an oversized opening, over-deepening, wrong profile and collapse', () => {
  const c = new MockCore().tick(0).clay!;
  const goal = createLessonGoal(2, c);
  expect(assessLessonShape({ ...c, height: goal.target.height + .2 }, goal).failure).toContain('выше');
  expect(assessLessonShape({ ...c, height: c.height - .2 }, goal).failure).toContain('ниже');
  expect(assessLessonShape({ ...c, cavityRadiusWorld: .8 }, goal).failure).toContain('шире');
  expect(assessLessonShape({ ...c, cavityDepthWorld: .8 }, goal).failure).toContain('глубокое');
  expect(assessLessonShape({ ...c, radii: c.radii.map((r) => r + .2) }, goal).failure).toContain('Стенки');
  expect(assessLessonShape({ ...c, collapsed: true }, goal).failure).toContain('обрушился');
});

it('fails irreversible overshoot just outside tolerance instead of trapping the lesson', () => {
  const c = new MockCore().tick(0).clay!;
  for (const step of [2, 3, 4, 5]) {
    if (step >= 4) { c.cavityDepthWorld = .12; c.cavityRadiusWorld = .12; }
    const goal = createLessonGoal(step, c);
    const reached = { ...c, ...goal.target, radii: Float32Array.from(goal.target.radii) };
    if (step === 2) reached.height += .036;
    if (step === 3) reached.cavityDepthWorld += .026;
    if (step === 4) reached.cavityRadiusWorld += .046;
    if (step === 5) reached.height -= .036;
    const result = assessLessonShape(reached, goal);
    expect(result.failure).not.toBeNull(); expect(result.matched).toBe(false);
    expect(result.similarity).toBeLessThan(90);
  }
});

it('accepts the first narrowing wherever the hands made it near the middle, not only at one exact band', () => {
  const c = new MockCore().tick(0).clay!;
  const goal = createLessonGoal(0, c);
  const dent = (centre: number, depth: number) => ({ ...c, radii: Float32Array.from(c.radii, (r, i) => r - depth * Math.exp(-.5 * ((i - centre) / 4) ** 2)) });
  // Real hands land a few bands (~10–30 px) above or below the drawn outline; before, 2 bands off could never match.
  for (const centre of [18, 21, 27, 30]) {
    expect(assessLessonShape(dent(centre, .20), goal)).toMatchObject({ matched: true, failure: null });
    expect(assessLessonShape(dent(centre, .10), goal).matched).toBe(false);
  }
  expect(assessLessonShape(dent(40, .20), goal).matched).toBe(false);
  expect(assessLessonShape(dent(27, .40), goal).failure).toContain('Стенки');
});
