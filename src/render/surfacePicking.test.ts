import { expect, it } from 'vitest';
import { CylinderGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, PerspectiveCamera, Vector3 } from 'three';
import { createClay } from '../engine/clay';
import { pickOuterSurface } from './surfacePicking';

it('uses the CSS canvas rectangle and preserves local anchors through rotation and nonuniform scale', () => {
  const clay = createClay(); const root = new Group(); root.rotation.y = .8; root.scale.set(1.2, .9, .7);
  const mesh = new Mesh(new CylinderGeometry(1, 1, clay.height, 96), new MeshBasicMaterial({ side: DoubleSide }));
  mesh.position.y = clay.height / 2; root.add(mesh); root.updateMatrixWorld(true);
  const camera = new PerspectiveCamera(40, 2, .01, 100); camera.position.set(0, .54, 5); camera.lookAt(0, .54, 0); camera.updateMatrixWorld();
  const hit = pickOuterSurface({ x: 500, y: 260 }, { left: 100, top: 60, width: 800, height: 400 }, camera, mesh, root, clay)!;
  expect(hit).not.toBeNull(); expect(Math.hypot(hit.point.x, hit.point.z)).toBeCloseTo(1, 2);
  expect(hit.point.y).toBeCloseTo(.6, 2); expect(Math.hypot(hit.normal.x, hit.normal.y, hit.normal.z)).toBeCloseTo(1, 5);
  const normal = new Vector3(hit.normal.x, hit.normal.y, hit.normal.z);
  expect(normal.dot(new Vector3(hit.point.x, 0, hit.point.z).normalize())).toBeGreaterThan(.99);
  expect(pickOuterSurface({ x: 50, y: 260 }, { left: 100, top: 60, width: 800, height: 400 }, camera, mesh, root, clay)).toBeNull();
  mesh.geometry.dispose(); mesh.material.dispose();
});
