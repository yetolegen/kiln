import { Float32BufferAttribute, Group, LatheGeometry, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, TorusGeometry, Vector2 } from 'three';
import type { ClayState } from '../types';
import { createMaterialFamily, type MaterialFamily } from './materialFamily';

export const BODY_RADIAL_SEGMENTS = 96;
// 2 keeps the smooth redesigned profile; 3 cost ~4x frame time on software GL and starved hand tracking
export const VISUAL_SUBDIVISIONS = 2;
/** Monotone cubic interpolation: passes every logical sample and cannot overshoot either neighbour. */
export function visualRadius(radii: Float32Array, band: number): number {
  const i = Math.min(radii.length - 2, Math.floor(band)), t = band - i;
  const d = radii[i + 1] - radii[i];
  const slope = (a: number, b: number) => a * b <= 0 ? 0 : 2 * a * b / (a + b);
  const m0 = i ? slope(radii[i] - radii[i - 1], d) : d;
  const m1 = i + 2 < radii.length ? slope(d, radii[i + 2] - radii[i + 1]) : d;
  return (2*t*t*t-3*t*t+1)*radii[i]+(t*t*t-2*t*t+t)*m0+(-2*t*t*t+3*t*t)*radii[i+1]+(t*t*t-t*t)*m1;
}

export function fillProfile(clay: ClayState, points: Vector2[], n = clay.radii.length): void {
  const innerCount = clay.radii.length;
  while (points.length < n + innerCount + 10) points.push(new Vector2());
  points.length = n + innerCount + 10;
  const hollow = clay.cavityRadiusWorld > 0 && clay.cavityDepthWorld > 0;
  const floor = hollow ? clay.height - clay.cavityDepthWorld : clay.height;
  const outer = clay.radii[innerCount - 1], inner = clay.cavityRadiusWorld;
  const bevel = Math.min(.018, clay.height * .018, hollow ? (outer - inner) * .18 : .018, hollow ? clay.cavityDepthWorld * .2 : .018);
  points[0].set(clay.bottomHole ? clay.cavityRadiusWorld : .001, 0);
  for (let i = 0; i < n; i++) {
    const y = (n === innerCount ? clay.height : clay.height - bevel) * i / (n - 1);
    points[i + 1].set(visualRadius(clay.radii, y / clay.height * (innerCount - 1)), y);
  }
  points[n].set(outer, clay.height - bevel);
  // A small rounded lip stays inside the real outer radius and above the real cavity floor.
  for (let i = 0; i < 4; i++) {
    const a = (i + 1) / 4 * Math.PI / 2;
    points[n + 1 + i].set(outer - bevel + bevel * Math.cos(a), clay.height - bevel + bevel * Math.sin(a));
  }
  for (let i = 0; i < 4; i++) {
    const a = i / 3 * Math.PI / 2;
    points[n + 5 + i].set(hollow ? inner + bevel - bevel * Math.sin(a) : outer - bevel, hollow ? clay.height - bevel + bevel * Math.cos(a) : clay.height);
  }
  for (let i = 0; i < innerCount; i++) {
    const innerTop = hollow ? clay.height - bevel : clay.height;
    const y = innerTop - (innerTop - floor) * i / (innerCount - 1);
    // Fixed point count allows solid → shallow dent → deep opening without reallocating geometry.
    const r = hollow ? clay.cavityRadiusWorld : (outer - bevel) * (1 - i / (innerCount - 1));
    points[n + 9 + i].set(Math.max(.001, r), y);
  }
  // A perforation closes only the annular wall, never a disk across the axis.
  points[points.length - 1].set(clay.bottomHole ? clay.cavityRadiusWorld : .001, floor);
}

/** Every wall opening is connected to the rim, even if its weakest band is lower down. */
export function rimTearBottom(clay: ClayState): number | null {
  if (clay.cavityDepthWorld <= 0 || clay.bottomHole || clay.collapseCause === 'pancake') return null;
  const floor = clay.height - clay.cavityDepthWorld;
  for (let b = 0; b < clay.damage.length; b++) {
    const y = b / (clay.damage.length - 1) * clay.height;
    if (y >= floor && clay.damage[b] >= .65) return Math.max(floor + .01, y - clay.height / (clay.damage.length - 1));
  }
  return null;
}

export function createPotView(sharedFamily?: MaterialFamily) {
  const group = new Group();
  group.name = 'VesselRoot';
  const family = sharedFamily ?? createMaterialFamily();
  const material = family.create(true);
  const ringGeometry = new TorusGeometry(1, .009, 6, 64);
  const ringMaterial = new MeshBasicMaterial({ color: '#ffe0a2', transparent: true, opacity: .8 });
  const ring = new Mesh(ringGeometry, ringMaterial);
  ring.rotation.x = Math.PI / 2;
  group.add(ring);
  const points: Vector2[] = [];
  let mesh: Mesh<LatheGeometry, MeshPhysicalMaterial> | null = null;
  let intactIndices = new Uint32Array();
  let revision = -1;
  let radii: Float32Array | null = null;
  let geometryKey = '';
  const segments = BODY_RADIAL_SEGMENTS;

  return {
    group, material,
    get mesh() { return mesh; },
    update(clay: ClayState, band: number | null, nowMs: number, rotation = nowMs * .00016, reducedMotion = false): void {
      if (revision !== clay.revision || radii !== clay.radii) {
        // The engine can clone radii on a neutral observation. Only changed
        // render data needs new geometry; wobble and contact are root/ring state.
        const key = [clay.height, clay.cavityRadiusWorld, clay.cavityDepthWorld, clay.bottomHole, clay.collapseCause, ...clay.radii, ...clay.damage].join(',');
        if (key !== geometryKey) {
        const outerCount = (clay.radii.length - 1) * VISUAL_SUBDIVISIONS + 1;
        fillProfile(clay, points, outerCount);
        // allocate only when the point count changes; positions, colours and indices are rewritten in place below
        if (!mesh || mesh.geometry.parameters.points.length !== points.length) {
          const geometry = new LatheGeometry(points, segments);
          geometry.setAttribute('color', new Float32BufferAttribute(new Float32Array(geometry.getAttribute('position').count * 3), 3));
          if (!mesh) { mesh = new Mesh(geometry, material); mesh.name = 'BodyMesh'; mesh.castShadow = mesh.receiveShadow = true; group.add(mesh); }
          else { const old = mesh.geometry; mesh.geometry = geometry; old.dispose(); }
          intactIndices = Uint32Array.from(geometry.getIndex()!.array);
        }
        const geometry = mesh.geometry;
        const positions = geometry.getAttribute('position');
        const colors = geometry.getAttribute('color');
        for (let i = 0; i <= segments; i++) {
          const angle = i / segments * Math.PI * 2;
          for (let j = 0; j < points.length; j++) {
            const index = i * points.length + j;
            positions.setXYZ(index, points[j].x * Math.sin(angle), points[j].y, points[j].x * Math.cos(angle));
            const b = Math.round(points[j].y / clay.height * (clay.damage.length - 1));
            const damage = clay.damage[b] ?? 0;
            const inside = clay.cavityDepthWorld > 0 && j >= outerCount + 9;
            const depth = inside ? Math.max(0, (clay.height - points[j].y) / clay.cavityDepthWorld) : 0;
            const shade = (inside ? .96 - depth * .20 : 1) * (1 - damage * (.45 + .25 * Math.sin(angle * 7) ** 2));
            colors.setXYZ(index, shade, shade * (1 - damage * .15), shade * (1 - damage * .2));
          }
        }
        positions.needsUpdate = true;
        colors.needsUpdate = true;
        const indices = geometry.getIndex()!;
        const tearBottom = rimTearBottom(clay);
        for (let i = 0; i < segments; i++) for (let j = 0; j < points.length - 1; j++) {
          const y = Math.max(points[j].y, points[j + 1].y);
          const slit = .075 + Math.sin(y / clay.height * 18) * .008;
          // Remove whole quads through the outer wall, lip and inner wall, never the floor.
          const torn = tearBottom !== null && j > 0 && j < points.length - 2 && y >= tearBottom && Math.abs((i + .5) / segments - slit) < .022;
          const offset = (i * (points.length - 1) + j) * 6;
          for (let k = 0; k < 6; k++) indices.setX(offset + k, torn ? 0 : intactIndices[offset + k]);
        }
        indices.needsUpdate = true;
        geometry.computeVertexNormals();
        const normals = geometry.getAttribute('normal');
        for (let j = 0; j < points.length; j++) {
          const end = segments * points.length + j;
          const x = normals.getX(j) + normals.getX(end), y = normals.getY(j) + normals.getY(end), z = normals.getZ(j) + normals.getZ(end);
          const length = Math.hypot(x, y, z) || 1;
          normals.setXYZ(j, x / length, y / length, z / length);
          normals.setXYZ(end, x / length, y / length, z / length);
        }
        normals.needsUpdate = true;
        geometry.computeBoundingSphere();
        geometryKey = key;
        }
        revision = clay.revision;
        radii = clay.radii;
      }
      ring.visible = band !== null;
      if (band !== null) {
        const b = Math.max(0, Math.min(clay.radii.length - 1, band));
        ring.position.y = clay.height * b / (clay.radii.length - 1);
        ring.scale.setScalar(clay.radii[b] + .025);
      }
      group.rotation.y = rotation;
      group.rotation.z = reducedMotion ? 0 : Math.sin(nowMs * .012) * clay.wobble * .022;
    },
    dispose(): void { mesh?.geometry.dispose(); material.dispose(); if (!sharedFamily) family.dispose(); ringGeometry.dispose(); ringMaterial.dispose(); },
  };
}
