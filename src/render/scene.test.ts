import { expect, it } from 'vitest';
import { OrthographicCamera, Vector2, Vector3, Mesh, LatheGeometry } from 'three';
import { configureCamera } from './scene';
import { fillProfile, createPotView } from './pot';
import { cameraProjection } from '../browser/camera';
import { MockCore } from '../dev/mockCore';
import { createClay } from '../engine/clay';
import { CONFIG } from '../config';

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

it('leaves a real central void when the clay floor is perforated', () => {
  const clay = new MockCore().tick(0).clay!;
  clay.bottomHole = true; clay.cavityRadiusWorld = .4; clay.cavityDepthWorld = clay.height; clay.floorThicknessWorld = 0;
  const points: Vector2[] = []; fillProfile(clay, points);
  expect(points[0]).toEqual(points.at(-1));
  expect(points.every((p) => p.x >= .4)).toBe(true);
  expect(points.at(-1)!.y).toBe(0);
});

it('removes faces for a torn cavity wall and restores intact topology for an undamaged pot', () => {
  const clay = new MockCore().tick(0).clay!, view = createPotView();
  clay.cavityRadiusWorld = .5; clay.cavityDepthWorld = 1;
  view.update(clay, null, 0);
  const mesh = view.group.children.find((child) => child instanceof Mesh && child.geometry instanceof LatheGeometry) as Mesh<LatheGeometry>;
  const intact = Array.from(mesh.geometry.getIndex()!.array);
  clay.damage.fill(.8); clay.revision++; view.update(clay, null, 0);
  expect(Array.from(mesh.geometry.getIndex()!.array).filter((v, i) => v !== intact[i]).length).toBeGreaterThan(20);
  clay.damage.fill(0); clay.revision++; view.update(clay, null, 0);
  expect(Array.from(mesh.geometry.getIndex()!.array)).toEqual(intact); view.dispose();
});

it('a weak middle band tears continuously from the rim without lowering the mesh', () => {
  const clay = createClay(), view = createPotView();
  clay.cavityRadiusWorld = .9; clay.cavityDepthWorld = .8;
  view.update(clay, null, 0);
  const mesh = view.group.children.find((child) => child instanceof Mesh && child.geometry instanceof LatheGeometry) as Mesh<LatheGeometry>;
  const intact = Array.from(mesh.geometry.getIndex()!.array);
  const positions = Array.from(mesh.geometry.getAttribute('position').array);
  clay.damage[32] = .8; clay.collapsed = true; clay.collapseCause = 'wallTorn'; clay.revision++;
  view.update(clay, null, 1);
  const torn = Array.from(mesh.geometry.getIndex()!.array);
  expect(torn.some((v, i) => v !== intact[i])).toBe(true);
  expect(Array.from(mesh.geometry.getAttribute('position').array)).toEqual(positions);
  const p = mesh.geometry.getAttribute('position');
  const removed = new Set<number>();
  for (let i = 0; i < torn.length; i += 3) if (torn[i] !== intact[i]) {
    const band = Math.round(p.getY(intact[i]) / clay.height * 47);
    expect(band).toBeGreaterThanOrEqual(30);
    removed.add(band);
  }
  for (let band = 32; band <= 47; band++) expect(removed.has(band)).toBe(true);
  view.dispose();
});

it('20 percent pancake uses actual flat geometry without the rupture effect', () => {
  const clay = createClay(), view = createPotView();
  clay.height = CONFIG.INIT_HEIGHT * .2; clay.collapsed = true; clay.collapseCause = 'pancake';
  view.update(clay, null, 0);
  const mesh = view.group.children.find((child) => child instanceof Mesh && child.geometry instanceof LatheGeometry) as Mesh<LatheGeometry>;
  mesh.geometry.computeBoundingBox();
  expect(mesh.geometry.boundingBox!.max.y).toBeCloseTo(CONFIG.INIT_HEIGHT * .2);
  expect(mesh.geometry.boundingBox!.min.y).toBe(0);
  view.dispose();
});

it.each([[0, 0], [.12, .12], [.6, 1]])('renders explicit cavity radius %f / depth %f without changing the clay', (radius, depth) => {
  const clay = new MockCore().tick(0).clay!;
  const original = Array.from(clay.radii);
  clay.cavityRadiusWorld = radius; clay.cavityDepthWorld = depth;
  const points: Vector2[] = [];
  fillProfile(clay, points);
  const n = clay.radii.length;
  expect(points[n].y).toBe(clay.height);
  expect(points[n + 1].y).toBe(clay.height);
  expect(points[n + 1].x).toBeCloseTo(radius || clay.radii[n - 1]);
  expect(points.at(-1)!.y).toBeCloseTo(clay.height - depth);
  if (radius) expect(points.slice(n + 1, -1).every((p) => p.x === radius)).toBe(true);
  expect(points[points.length - 1].y).toBeGreaterThan(0);
  expect(points.every((point) => point.x > 0 && Number.isFinite(point.y))).toBe(true);
  expect(Array.from(clay.radii)).toEqual(original);
});
