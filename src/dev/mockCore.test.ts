import { expect, it } from 'vitest';
import { MockCore } from './mockCore';
import { cameraProjection } from '../browser/camera';

it('produces one begin and one end with a stable episode id, without replaying events', () => {
  const core = new MockCore();
  core.key('t', 1);
  const begin = core.tick(1).events[0];
  expect(core.tick(1).hint).toBe(core.tick(2).hint);
  expect(begin.phase).toBe('begin');
  expect(core.tick(2).events).toHaveLength(0);
  core.key('t', 3);
  expect(core.tick(3).events[0]).toMatchObject({ episodeId: begin.episodeId, phase: 'end' });
  expect(core.tick(4).stats?.executionEpisodes.tear).toBe(1);
});

it('freezes result arrays and stats, and finalizes firing only once', () => {
  const core = new MockCore();
  core.dispatch({ type: 'confirmGlaze' }, 0);
  const result = core.tick(5000).result!;
  core.key('ArrowRight', 5100);
  core.key('t', 5100);
  expect(core.tick(5200).result).toBe(result);
  expect(result.finalProfile).not.toEqual(Array.from(core.tick(5200).clay!.radii));
  expect(result.stats.executionEpisodes.tear).toBeUndefined();
});

it('generates distinct observations and clears pointing when hands disappear', () => {
  const core = new MockCore();
  core.updateProjection(cameraProjection({ videoWidth: 1280, videoHeight: 720 }, { width: 1000, height: 800 }, 1));
  core.setCursor(100, 200);
  expect(core.tick(0).gesture?.cursorPx).toEqual({ x: 100, y: 200 });
  expect(core.tick(10).input?.frameId).toBe(1);
  core.key('x', 20);
  expect(core.tick(40).gesture?.cursorPx).toBeNull();
  expect(core.tick(40).input?.frameId).toBe(2);
});
