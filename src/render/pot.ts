import { DoubleSide, Float32BufferAttribute, Group, LatheGeometry, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, TorusGeometry, Vector2 } from 'three';
import type { ClayState } from '../types';
import { createClaySurface } from './claySurface';

export function fillProfile(clay: ClayState, points: Vector2[]): void {
  const n = clay.radii.length;
  while (points.length < n * 2 + 2) points.push(new Vector2());
  points.length = n * 2 + 2;
  const hollow = clay.cavityRadiusWorld > 0 && clay.cavityDepthWorld > 0;
  const floor = hollow ? clay.height - clay.cavityDepthWorld : clay.height;
  points[0].set(clay.bottomHole ? clay.cavityRadiusWorld : .001, 0);
  for (let i = 0; i < n; i++) points[i + 1].set(clay.radii[i], clay.height * i / (n - 1));
  for (let i = 0; i < n; i++) {
    const y = clay.height - (clay.height - floor) * i / (n - 1);
    // Fixed point count allows solid → shallow dent → deep opening without reallocating geometry.
    const r = hollow ? clay.cavityRadiusWorld : clay.radii[n - 1] * (1 - i / (n - 1));
    points[n + 1 + i].set(Math.max(.001, r), y);
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

export function createPotView() {
  const group = new Group();
  const surface = createClaySurface();
  const material = new MeshPhysicalMaterial({ color: '#b9825e', roughness: .6, metalness: 0, vertexColors: true, side: DoubleSide,
    map: surface.map, bumpMap: surface.bumpMap, bumpScale: .018, roughnessMap: surface.roughnessMap,
    clearcoat: .22, clearcoatRoughness: .4, envMapIntensity: .7 });
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
  const segments = 64;

  return {
    group, material,
    update(clay: ClayState, band: number | null, nowMs: number, rotation = nowMs * .00016, reducedMotion = false): void {
      if (revision !== clay.revision || radii !== clay.radii) {
        fillProfile(clay, points);
        if (!mesh || mesh.geometry.parameters.points.length !== points.length) {
          if (mesh) { group.remove(mesh); mesh.geometry.dispose(); }
          const geometry = new LatheGeometry(points, segments);
          geometry.setAttribute('color', new Float32BufferAttribute(new Float32Array(geometry.getAttribute('position').count * 3), 3));
          mesh = new Mesh(geometry, material);
          mesh.castShadow = mesh.receiveShadow = true;
          intactIndices = Uint32Array.from(geometry.getIndex()!.array);
          group.add(mesh);
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
            const shade = 1 - damage * (.45 + .25 * Math.sin(angle * 7) ** 2);
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
    dispose(): void { mesh?.geometry.dispose(); material.dispose(); surface.dispose(); ringGeometry.dispose(); ringMaterial.dispose(); },
  };
}
