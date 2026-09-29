import { expect, it } from 'vitest';
import { PresentationHint } from './presentationHint';
import { MockCore } from '../dev/mockCore';
import { cameraProjection } from '../browser/camera';

it('announces loss immediately without repeating speech, then clears on recovery', () => {
  const core = new MockCore(); core.updateProjection(cameraProjection({ videoWidth: 1280, videoHeight: 720 }, { width: 1000, height: 800 }, 1));
  const coach = new PresentationHint();
  expect(coach.update(core.tick(0), 0)).toBeNull();
  core.key('x', 33); const lost = core.tick(66);
  const hint = coach.update(lost, 66); expect(hint?.speak).toBe(true); expect(hint?.params.interrupted).toBe('true');
  expect(coach.update(lost, 100)).toBe(hint);
  const stale = coach.update(lost, 500); expect(stale?.speak).toBe(false);
  core.key('x', 600); core.setCursor(50, 50);
  expect(coach.update(core.tick(650), 650)).toBeNull();
});
