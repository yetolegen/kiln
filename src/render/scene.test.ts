import { expect, it } from 'vitest';
import { OrthographicCamera, Vector2, Vector3 } from 'three';
import { configureCamera } from './scene';
import { fillProfile } from './pot';
import { cameraProjection } from '../browser/camera';
import { MockCore } from '../dev/mockCore';

it.each([[1440, 900], [390, 844], [844, 390]])('matches the core interaction plane within 0.5px at %i × %i', (width, height) => {
  const p = cameraProjection({ videoWidth: 1280, videoHeight: 720 }, { width, height }, 1);
  const camera = new OrthographicCamera(-1, 1, 1, -1, .1, 100);
  configureCamera(camera, p);
  for (const x of [-1.6, 0, 1.6]) for (const y of [0, 1.2, 3.2]) {
    const projected = new Vector3(x, y, 0).project(camera);
    expect(Math.abs((projected.x + 1) / 2 * width - (p.axisXPx + x * p.pixelsPerWorldUnit))).toBeLessThan(.5);
    expect(Math.abs((1 - projected.y) / 2 * height - (p.bottomYPx - y * p.pixelsPerWorldUnit))).toBeLessThan(.5);
  }
});

it('builds an outer wall, rim, inner wall and floor without changing the clay', () => {
  const clay = new MockCore().tick(0).clay!;
  const original = Array.from(clay.radii);
  const points: Vector2[] = [];
  fillProfile(clay, points);
  const n = clay.radii.length;
  expect(points[n].y).toBe(clay.height);
  expect(points[n + 1].y).toBe(clay.height);
  expect(points[n + 1].x).toBeCloseTo(clay.radii[n - 1] - clay.thickness);
  expect(points[points.length - 1].y).toBeGreaterThan(0);
  expect(points.every((point) => point.x > 0 && Number.isFinite(point.y))).toBe(true);
  expect(Array.from(clay.radii)).toEqual(original);
});
