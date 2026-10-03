import { BufferGeometry, Curve, Group, Matrix4, Mesh, TubeGeometry, Vector3 } from 'three';
import { handlePoint, type PotteryHandle, type HandlePreset } from '../engine/handles';
import type { MaterialFamily } from './materialFamily';

export class HandleCurve extends Curve<Vector3> {
  constructor(readonly preset: HandlePreset) { super(); }
  getPoint(t: number, target = new Vector3()): Vector3 {
    if (this.preset === 'arch') return target.set(-Math.cos(t * Math.PI), Math.sin(t * Math.PI), 0);
    if (this.preset === 'round') return target.set(0, -.5 * Math.cos(t * Math.PI), -.04 + .52 * Math.sin(t * Math.PI));
    // Fixed squared loop with gently rounded corners supplied by the tube's radial section.
    const points = [[-.5,-.04],[-.5,.42],[.5,.42],[.5,-.04]];
    const lengths = [.46, 1, .46], distance = t * 1.92;
    let start = 0;
    for (let i = 0; i < 3; i++) { if (distance <= start + lengths[i] || i === 2) { const u = (distance - start) / lengths[i]; return target.set(0, points[i][0] * (1-u) + points[i+1][0]*u, points[i][1]*(1-u)+points[i+1][1]*u); } start += lengths[i]; }
    return target;
  }
}
export function handleMatrix(h: PotteryHandle): Matrix4 {
  const p = handlePoint(h, {x:0,y:0,z:0});
  const axis = (x: number,y: number,z: number) => { const q = handlePoint(h,{x,y,z}); return new Vector3(q.x-p.x,q.y-p.y,q.z-p.z); };
  return new Matrix4().makeBasis(axis(1,0,0),axis(0,1,0),axis(0,0,1)).setPosition(p.x,p.y,p.z);
}
export function createHandleView(parent: Group, family: MaterialFamily) {
  const group = new Group(), preview = new Group(); group.name = 'HandleGroup'; preview.name = 'HandlePreview'; parent.add(group,preview);
  const geometries = new Map<HandlePreset, BufferGeometry>();
  const records = new Map<string, string>(); const meshes = new Map<string, Mesh>();
  let previous: readonly PotteryHandle[] | null = null;
  let color = '#b9825e', gloss = 0, glow = 0;
  function geometry(preset: HandlePreset) { let g = geometries.get(preset); if (!g) { g = new TubeGeometry(new HandleCurve(preset), preset === 'angular' ? 48 : 56, preset === 'arch' ? .065 : .085, 10, false); geometries.set(preset,g); } return g; }
  function make(h: PotteryHandle, ghost = false) { const m = family.create(); family.apply(m,color,gloss,glow); if (ghost) { m.emissive.set('#558c69'); m.emissiveIntensity=.3; m.transparent=true; m.opacity=.65; } const mesh = new Mesh(geometry(h.preset),m); mesh.userData.handleId=h.id; mesh.castShadow=mesh.receiveShadow=!ghost; mesh.matrixAutoUpdate=false; mesh.matrix.copy(handleMatrix(h)); return mesh; }
  function clearPreview() { for (const m of [...preview.children] as Mesh[]) { preview.remove(m); (m.material as ReturnType<MaterialFamily['create']>).dispose(); } }
  return {
    group, meshes,
    update(handles: readonly PotteryHandle[]) {
      if (handles === previous && Object.isFrozen(handles)) return;
      previous = handles;
      const ids = new Set(handles.map(h=>h.id));
      for(const [id,m] of meshes) if(!ids.has(id)) { group.remove(m); (m.material as ReturnType<MaterialFamily['create']>).dispose(); meshes.delete(id); records.delete(id); }
      for(const h of handles) { const key=JSON.stringify(h); if(records.get(h.id)===key) continue; let mesh=meshes.get(h.id); if(!mesh) {mesh=make(h);meshes.set(h.id,mesh);group.add(mesh);} else {mesh.geometry=geometry(h.preset);mesh.matrix.copy(handleMatrix(h));} records.set(h.id,key); }
    },
    setFinish(nextColor: string, nextGloss: number, nextGlow: number) { color=nextColor;gloss=nextGloss;glow=nextGlow;for(const m of meshes.values()) family.apply(m.material as ReturnType<MaterialFamily['create']>,color,gloss,glow); },
    preview(h: PotteryHandle | null) {
      if (!h) { clearPreview(); return; }
      const mesh = preview.children[0] as Mesh | undefined;
      if (mesh) { mesh.geometry = geometry(h.preset); mesh.matrix.copy(handleMatrix(h)); }
      else preview.add(make(h, true));
    },
    dispose() { clearPreview();for(const m of meshes.values()) (m.material as ReturnType<MaterialFamily['create']>).dispose(); for(const g of geometries.values()) g.dispose(); meshes.clear();records.clear();parent.remove(group,preview); },
  };
}
