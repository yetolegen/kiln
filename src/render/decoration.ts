import { BufferGeometry, CanvasTexture, ConeGeometry, CylinderGeometry, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, Quaternion, SphereGeometry, Vector3 } from 'three';
import type { ClayState } from '../types';
import type { Attachment, Customization, Stamp, StampKind } from '../engine/customization';
import { glazeColor } from '../engine/materials';
import type { MaterialFamily } from './materialFamily';
import { visualRadius } from './pot';

/** Curved, exterior-only stamp patch follows the actual body instead of projecting through it. */
export function stampGeometry(stamp: Stamp, clay: ClayState): BufferGeometry {
  const vertices: number[] = [], uv: number[] = [], indices: number[] = [];
  const a = stamp.anchor.point, theta = Math.atan2(a.x, a.z), radius = Math.hypot(a.x, a.z), n = 12;
  for (let y = 0; y <= n; y++) for (let x = 0; x <= n; x++) {
    const py = a.y + (y / n - .5) * stamp.size;
    const band = Math.max(0, Math.min(clay.radii.length - 1, py / clay.height * (clay.radii.length - 1)));
    const r = visualRadius(clay.radii, band) + .0015;
    const angle = theta + (x / n - .5) * stamp.size / radius;
    vertices.push(Math.sin(angle) * r, py, Math.cos(angle) * r); uv.push(x / n, y / n);
    if (x < n && y < n) { const i = y * (n + 1) + x; indices.push(i, i + 1, i + n + 1, i + 1, i + n + 2, i + n + 1); }
  }
  const g = new BufferGeometry(); g.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  // Rotate the procedural motif within the footprint; the validated square never crosses the rim.
  const c = Math.cos(stamp.rotation), s = Math.sin(stamp.rotation);
  for (let i = 0; i < uv.length; i += 2) { const x = uv[i] - .5, y = uv[i + 1] - .5; uv[i] = x * c - y * s + .5; uv[i + 1] = x * s + y * c + .5; }
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2)); g.setIndex(indices); g.computeVertexNormals(); return g;
}

export function createDecorationView(parent: Group, family: MaterialFamily) {
  const group = new Group(), stamps = new Group(), preview = new Group(); group.name = 'AttachmentGroup'; stamps.name = 'SurfaceDecorationLayer'; parent.add(group, stamps, preview);
  const textures = new Map<StampKind, CanvasTexture>();
  let attachmentKey = '', stampKey = '';
  let previous: Customization | null = null, previousRevision = -1;
  let finishColor = '#b9825e', finishGloss = 0, finishGlow = 0;
  const clear = (g: Group) => { for (const child of [...g.children]) { g.remove(child); const m = child as Mesh<BufferGeometry, MeshStandardMaterial>; m.geometry.dispose(); m.material.dispose(); } };
  function texture(kind: StampKind): CanvasTexture {
    const found = textures.get(kind); if (found) return found;
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#fff'; ctx.strokeStyle = '#fff';
    if (kind === 'star') {
      ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? 21 : 49; const x = 64 + Math.cos(a) * r, y = 64 + Math.sin(a) * r; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.closePath(); ctx.fill();
    } else if (kind === 'dots') {
      for (const y of [35, 64, 93]) for (const x of [35, 64, 93]) { ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill(); }
    } else {
      ctx.lineWidth = 7; ctx.lineCap = 'round';
      for (const y of [36, 64, 92]) { ctx.beginPath(); for (let x = 20; x <= 108; x++) { const py = y + Math.sin((x - 20) / 88 * Math.PI * 2) * 9; if (x === 20) ctx.moveTo(x, py); else ctx.lineTo(x, py); } ctx.stroke(); }
    }
    const t = new CanvasTexture(canvas); textures.set(kind, t); return t;
  }
  function primitive(a: Attachment, ghost = false): Mesh<BufferGeometry, MeshStandardMaterial | MeshBasicMaterial> {
    const g = a.kind === 'sphere' ? new SphereGeometry(.5, 24, 16) : a.kind === 'cylinder' ? new CylinderGeometry(.5, .5, 1, 24) : new ConeGeometry(.5, 1, 24);
    const material = ghost ? new MeshBasicMaterial({ color: '#8ed9b7', transparent: true, opacity: .65 }) : family.create();
    if (!ghost) family.apply(material as ReturnType<MaterialFamily['create']>, finishColor, finishGloss, finishGlow);
    const m = new Mesh(g, material);
    const normal = new Vector3(a.anchor.normal.x, a.anchor.normal.y, a.anchor.normal.z);
    m.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), normal);
    m.quaternion.multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), a.rotation));
    m.quaternion.multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), a.tilt));
    m.scale.set(a.width, a.length, a.width);
    m.position.set(a.anchor.point.x, a.anchor.point.y, a.anchor.point.z).addScaledVector(normal, a.length * .38);
    m.castShadow = !ghost; m.receiveShadow = !ghost; m.userData.decorationId = a.id; return m;
  }
  function stamp(s: Stamp, clay: ClayState, ghost = false) {
    const m = new Mesh(stampGeometry(s, clay), new (ghost ? MeshBasicMaterial : MeshStandardMaterial)({ map: texture(s.kind), color: ghost ? '#8ed9b7' : glazeColor(s.color), transparent: true,
      opacity: ghost ? .65 : 1, alphaTest: .08, ...(ghost ? {} : { roughness: .38 }), depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 }));
    m.renderOrder = 5; m.userData.decorationId = s.id; return m;
  }
  return {
    group,
    setFinish(color: string, gloss: number, glow: number) { finishColor=color;finishGloss=gloss;finishGlow=glow;for(const m of group.children as Mesh[]) family.apply(m.material as ReturnType<MaterialFamily['create']>,color,gloss,glow); },
    update(c: Customization, clay: ClayState): void {
      if (previous === c && previousRevision === clay.revision) return;
      previous = c; previousRevision = clay.revision;
      const nextAttachments = JSON.stringify(c.attachments);
      if (attachmentKey !== nextAttachments) { clear(group); for (const a of c.attachments) group.add(primitive(a)); attachmentKey = nextAttachments; }
      const nextStamps = JSON.stringify([c.stamps, Array.from(clay.radii), clay.height]);
      if (stampKey !== nextStamps) { clear(stamps); for (const s of c.stamps) stamps.add(stamp(s, clay)); stampKey = nextStamps; }
    },
    preview(value: Attachment | Stamp | null, clay: ClayState): void { clear(preview); if (value) preview.add('length' in value ? primitive(value, true) : stamp(value, clay, true)); },
    clearPreview(): void { clear(preview); },
    dispose(): void { clear(group); clear(stamps); clear(preview); for (const t of textures.values()) t.dispose(); parent.remove(group, stamps, preview); },
  };
}
