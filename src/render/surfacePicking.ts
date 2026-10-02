import { Matrix3, Raycaster, Vector2, Vector3, type Camera, type Mesh, type Object3D } from 'three';
import type { Anchor } from '../engine/customization';
import { anchorOnBody } from '../engine/customization';
import type { ClayState, Vec2 } from '../types';

/** Only the nearest visible face of the body may be decorated. Never search through an invalid hit. */
export function pickOuterSurface(pointer: Vec2, rect: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>,
    camera: Camera, body: Mesh, root: Object3D, clay: ClayState): Anchor | null {
  if (!rect.width || !rect.height || pointer.x < rect.left || pointer.y < rect.top || pointer.x > rect.left + rect.width || pointer.y > rect.top + rect.height) return null;
  camera.updateMatrixWorld(); root.updateWorldMatrix(true, true);
  const ray = new Raycaster();
  ray.setFromCamera(new Vector2((pointer.x - rect.left) / rect.width * 2 - 1, 1 - (pointer.y - rect.top) / rect.height * 2), camera);
  const first = ray.intersectObject(body, false)[0];
  if (!first?.face) return null;
  const normalWorld = first.face.normal.clone().applyNormalMatrix(new Matrix3().getNormalMatrix(body.matrixWorld));
  if (normalWorld.dot(ray.ray.direction) >= -.02) return null;
  const point = root.worldToLocal(first.point.clone());
  const normal = normalWorld.applyNormalMatrix(new Matrix3().getNormalMatrix(root.matrixWorld.clone().invert()));
  const a: Anchor = { point: vector(point), normal: vector(normal) };
  return anchorOnBody(a, clay) ? a : null;
}
const vector = (v: Vector3) => ({ x: v.x, y: v.y, z: v.z });
