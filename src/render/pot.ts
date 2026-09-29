import { Float32BufferAttribute, Group, LatheGeometry, Mesh, MeshBasicMaterial, MeshStandardMaterial, TorusGeometry, Vector2 } from 'three';
import type { ClayState } from '../types';

export function fillProfile(clay: ClayState, points: Vector2[]): void {
  const n = clay.radii.length;
  while (points.length < n * 2 + 2) points.push(new Vector2());
  points.length = n * 2 + 2;
  const floor = Math.min(clay.thickness, clay.height * .25);
  points[0].set(.001, 0);
  for (let i = 0; i < n; i++) points[i + 1].set(clay.radii[i], clay.height * i / (n - 1));
  for (let i = 0; i < n; i++) {
    const y = clay.height - (clay.height - floor) * i / (n - 1);
    const band = y / clay.height * (n - 1);
    const lo = Math.floor(band), hi = Math.min(n - 1, lo + 1);
    const r = clay.radii[lo] + (clay.radii[hi] - clay.radii[lo]) * (band - lo);
    points[n + 1 + i].set(Math.max(.02, r - clay.thickness), y);
  }
  points[points.length - 1].set(.001, floor);
}

export function createPotView() {
  const group = new Group();
  const material = new MeshStandardMaterial({ color: '#b9825e', roughness: .85, metalness: 0, vertexColors: true });
  const ringGeometry = new TorusGeometry(1, .009, 6, 64);
  const ringMaterial = new MeshBasicMaterial({ color: '#ffe0a2', transparent: true, opacity: .8 });
  const ring = new Mesh(ringGeometry, ringMaterial);
  ring.rotation.x = Math.PI / 2;
  group.add(ring);
  const points: Vector2[] = [];
  let mesh: Mesh<LatheGeometry, MeshStandardMaterial> | null = null;
  let revision = -1;
  let radii: Float32Array | null = null;
  const segments = 64;

  return {
    group, material,
    update(clay: ClayState, band: number | null, nowMs: number): void {
      if (revision !== clay.revision || radii !== clay.radii) {
        fillProfile(clay, points);
        if (!mesh || mesh.geometry.parameters.points.length !== points.length) {
          if (mesh) { group.remove(mesh); mesh.geometry.dispose(); }
          const geometry = new LatheGeometry(points, segments);
          geometry.setAttribute('color', new Float32BufferAttribute(new Float32Array(geometry.getAttribute('position').count * 3), 3));
          mesh = new Mesh(geometry, material);
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
      group.rotation.y = nowMs * .00016;
      group.rotation.z = Math.sin(nowMs * .012) * clay.wobble * .022;
    },
    dispose(): void { mesh?.geometry.dispose(); material.dispose(); ringGeometry.dispose(); ringMaterial.dispose(); },
  };
}
