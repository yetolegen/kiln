import { expect, it } from 'vitest';
import { WheelEffects } from './wheelEffects';
import { MockCore } from '../dev/mockCore';
import { cameraProjection } from '../browser/camera';

function sample() {
  const core = new MockCore();
  core.updateProjection(cameraProjection({ videoWidth: 1280, videoHeight: 720 }, { width: 1440, height: 900 }, 1));
  core.key('5', 0); core.key('s', 0);
  return core.tick(100);
}
it('emits only once per fresh deformation sample without changing geometry', () => {
  const fx = new WheelEffects(), s = sample(), radii = Array.from(s.clay!.radii);
  fx.update(s, 100, false, false);
  expect(fx.life.filter(v => v > 0)).toHaveLength(2);
  fx.update(s, 116, false, false);
  expect(fx.life.filter(v => v > 0)).toHaveLength(2);
  fx.update({ ...s, input: { ...s.input!, frameId: 20 } }, 1000, false, false);
  expect(fx.life.filter(v => v > 0)).toHaveLength(2);
  expect(Array.from(s.clay!.radii)).toEqual(radii);
});
it.each(['reduced', 'inspection', 'damage', 'firing'])('stops splatter during %s', reason => {
  const fx = new WheelEffects(), s = sample(); fx.update(s, 100, false, false);
  if (reason === 'damage') s.clay!.collapseCause = 'wallTorn';
  if (reason === 'firing') s.phase = 'firing';
  fx.update(s, 133, reason === 'reduced', reason === 'inspection');
  expect(fx.life.every(v => v <= 0)).toBe(true);
});
