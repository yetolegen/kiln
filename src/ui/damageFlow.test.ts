import { expect, it } from 'vitest';
import { inSession, T_START, poseHand, frame, moving } from '../../tests/helpers';
import { CONFIG } from '../config';
import { hintText } from '../i18n';
import type { HandFeatures } from '../types';

function fixture(activeId: number) {
  const core = inSession(); let now = T_START;
  const run = (ms: number, make: (s: number) => HandFeatures, lost = false) => {
    const start = now;
    while (now < start + ms) {
      now += 33;
      const c = core.tick(now).clay!;
      const support = poseHand('wall', (activeId === 1 ? 1 : -1) * c.radii[24], c.height / 2, { trackId: activeId === 1 ? 2 : 1 });
      const active = { ...make((now - start) / 1000), trackId: activeId };
      core.observe(frame(now, lost ? null : activeId === 1 ? active : support, lost ? null : activeId === 1 ? support : active));
    }
    return core.tick(now);
  };
  return { core, run };
}

it.each([1, 2])('routes deep-thumb and pancake failures to actionable hints with active hand %i', (id) => {
  const indent = fixture(id);
  const hole = indent.run(5000, (s) => poseHand('thumbDown', 0, 1.2 - s * .3, moving(0, -.54)));
  expect(hole.clay!.bottomHole).toBe(true); expect(hole.clay!.floorThicknessWorld).toBe(0);
  expect(hole.clay!.collapseCause).toBe('bottomHole');
  expect(hintText(hole.hint!)).toContain('Начать сначала');
  indent.run(800, () => poseHand('flat', 0, 1.35));
  const stillHoled = indent.run(4000, (s) => poseHand('flat', 0, 1.35 - s * .28, moving(0, -.5)));
  expect(stillHoled.clay!.collapseCause, JSON.stringify({ bottomHole: stillHoled.clay!.bottomHole, radius: stillHoled.clay!.cavityRadiusWorld, depth: stillHoled.clay!.cavityDepthWorld, height: stillHoled.clay!.height })).toBe('bottomHole');
  expect(stillHoled.clay!.cavityRadiusWorld).toBeGreaterThan(0);
  const press = fixture(id);
  press.run(800, () => poseHand('flat', 0, 1.35));
  const pancake = press.run(4000, (s) => poseHand('flat', 0, 1.35 - s * .28, moving(0, -.5)));
  expect(pancake.clay!.collapseCause).toBe('pancake'); expect(pancake.clay!.height).toBeLessThanOrEqual(CONFIG.PANCAKE_HEIGHT_WORLD);
  expect(hintText(pancake.hint!)).toContain('Начать сначала');
});

it.each([1, 2])('warns then tears held stretching, while tracking loss cancels its clock, hand %i', (id) => {
  const prepare = () => {
    const f = fixture(id);
    f.run(350, (s) => poseHand('thumbDown', 0, 1.2 - s * .3, moving(0, -.54)));
    f.run(400, () => poseHand('pinch', 0, 1.15));
    f.run(500, (s) => poseHand('spread', 0, 1.15, { ratio: .2 + s }));
    return f;
  };
  const f = prepare();
  const warning = f.run(7000, () => poseHand('spread', 0, 1.15, { ratio: .728 }));
  expect(warning.gesture!.engagedMs).toBeGreaterThanOrEqual(CONFIG.STRETCH_DANGER_MS);
  expect(warning.activeIssues.some((issue) => issue.type === 'overStretch')).toBe(true);
  const torn = f.run(3000, () => poseHand('spread', 0, 1.15, { ratio: .728 }));
  expect(torn.clay!.collapseCause).toBe('wallTorn');
  const interrupted = prepare();
  const before = interrupted.run(5000, () => poseHand('spread', 0, 1.15, { ratio: .728 }));
  const radius = before.clay!.cavityRadiusWorld;
  interrupted.run(1000, () => poseHand('spread', 0, 1.15, { ratio: .728 }), true);
  const after = interrupted.run(8000, () => poseHand('spread', 0, 1.15, { ratio: .728 }));
  expect(after.gesture!.engagedMs).toBe(0); expect(after.clay!.cavityRadiusWorld).toBe(radius);
  expect(after.clay!.collapsed).toBe(false);
});
