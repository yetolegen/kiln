import { expect, it, vi } from 'vitest';
import { Group, MeshPhysicalMaterial, Vector3 } from 'three';
import { createClay } from '../engine/clay';
import { emptyCustomization } from '../engine/customization';
import { placeHandle, handleEndpoints } from '../engine/handles';
import { createPotView, visualRadius } from './pot';
import { createHandleView, HandleCurve, handleMatrix } from './handles';
import { createMaterialFamily } from './materialFamily';
import { createDecorationView, stampGeometry } from './decoration';

const anchor={point:{x:1,y:.6,z:0},normal:{x:1,y:0,z:0}};
it('body replacement preserves the assembly, transforms and cached handle geometry; disposal is owned', () => {
 const family=createMaterialFamily(),body=createPotView(family),handles=createHandleView(body.group,family),decor=createDecorationView(body.group,family),clay=createClay();
 const h=placeHandle('round',anchor,clay,'a');handles.update([h,{...h,id:'b'}]);body.update(clay,null,0,.4);
 const c=emptyCustomization();c.attachments.push({id:'a',kind:'sphere',anchor,length:.3,width:.2,rotation:0,tilt:0,material:'amber'});decor.update(c,clay);
 const attachment=decor.group.children[0],mesh=body.mesh!,old=mesh.geometry,disposed=vi.fn();old.addEventListener('dispose',disposed);
 const handle=handles.meshes.get('a')!,shared=handle.geometry,sharedDisposed=vi.fn();shared.addEventListener('dispose',sharedDisposed);
 expect(handles.meshes.get('b')!.geometry).toBe(shared);const transform=handle.matrix.clone();body.group.position.set(.1,.2,.3);
 clay.radii[20]-=.1;clay.revision++;body.update(clay,null,10,.4);decor.update(c,clay);
 expect(body.mesh).toBe(mesh);expect(mesh.geometry).not.toBe(old);expect(disposed).toHaveBeenCalledOnce();expect(sharedDisposed).not.toHaveBeenCalled();
 expect(handles.meshes.get('a')).toBe(handle);expect(handle.matrix).toEqual(transform);expect(body.group.rotation.y).toBe(.4);expect(body.group.position.toArray()).toEqual([.1,.2,.3]);expect(decor.group.children[0]).toBe(attachment);
 const unchanged=mesh.geometry;body.update(clay,null,20,.4);expect(mesh.geometry).toBe(unchanged);
 const neutral={...clay,radii:clay.radii.slice(),damage:clay.damage.slice(),revision:clay.revision+1,wobble:.2};body.update(neutral,null,30,.4);expect(mesh.geometry).toBe(unchanged);
 handles.update([{...h,id:'b'}]);expect(body.mesh).toBe(mesh);expect(sharedDisposed).not.toHaveBeenCalled();
 handles.dispose();expect(sharedDisposed).toHaveBeenCalledOnce();decor.dispose();body.dispose();family.dispose();
});
it.each(['round','angular','arch'] as const)('%s rotates with the root, has exact endpoint transforms and reconstructs deterministically', preset=>{
 const family=createMaterialFamily(),root=new Group(),h=placeHandle(preset,anchor,createClay(),'a',undefined,.25),view=createHandleView(root,family);
 view.update([h]);const mesh=view.meshes.get('a')!,matrix=mesh.matrix.clone();const before=new Vector3().setFromMatrixPosition(matrix);
 root.rotation.y=.6;root.updateMatrixWorld(true);expect(new Vector3().setFromMatrixPosition(mesh.matrixWorld).distanceTo(before.applyMatrix4(root.matrixWorld))).toBeLessThan(1e-7);
 const curve=new HandleCurve(preset);for(const [i,t] of [0,1].entries()) {const actual=curve.getPoint(t).applyMatrix4(handleMatrix(h)),expected=handleEndpoints(h)[i];expect(actual.distanceTo(new Vector3(expected.x,expected.y,expected.z))).toBeLessThan(1e-7);}
 const restored=createHandleView(new Group(),family);restored.update(JSON.parse(JSON.stringify([h])));expect(restored.group.children).toHaveLength(1);expect(restored.meshes.get('a')!.matrix).toEqual(matrix);
 view.dispose();restored.dispose();family.dispose();
});
it('glaze uses consistent independent materials and highlighting never recolors the body',()=>{
 const family=createMaterialFamily(),root=new Group(),view=createHandleView(root,family),body=family.create(true),h=placeHandle('round',anchor,createClay(),'h');
 view.update([h]);const matrix=view.meshes.get('h')!.matrix.clone();view.setFinish('#355690',1,0);family.apply(body,'#355690',1,0);
 const material=view.meshes.get('h')!.material as MeshPhysicalMaterial;expect(material).not.toBe(body);expect(material.map).toBe(body.map);
 expect(material.color).toEqual(body.color);expect(material.roughness).toBe(body.roughness);expect(material.metalness).toBe(0);expect(view.meshes.get('h')!.matrix).toEqual(matrix);
 const color=body.color.clone();material.color.set('red');view.preview(h);expect(body.color).toEqual(color);view.dispose();body.dispose();family.dispose();
});
it('visual interpolation passes all 48 samples without overshoot, drift, or lost local neck/bulges',()=>{
 const clay=createClay();for(let i=0;i<48;i++)clay.radii[i]=.7+.24*Math.sin(i*.7);const original=Array.from(clay.radii);
 for(let i=0;i<48;i++)expect(visualRadius(clay.radii,i)).toBeCloseTo(clay.radii[i],7);
 for(let i=0;i<47;i++)for(let s=0;s<=10;s++){const r=visualRadius(clay.radii,i+s/10);expect(r).toBeGreaterThanOrEqual(Math.min(clay.radii[i],clay.radii[i+1])-1e-7);expect(r).toBeLessThanOrEqual(Math.max(clay.radii[i],clay.radii[i+1])+1e-7);}
 const view=createPotView();view.update(clay,null,0);expect(view.mesh!.geometry.parameters.points).toHaveLength(200);expect(view.mesh!.geometry.parameters.segments).toBe(96);expect(Array.from(clay.radii)).toEqual(original);view.dispose();
});
it('stamps follow the smoothed surface through a neck without changing their anchor or footprint',()=>{
 const clay=createClay();for(let i=0;i<48;i++)clay.radii[i]=.8+.1*Math.cos(i*.5);
 const stamp={id:'s',kind:'star' as const,anchor,size:.28,rotation:0,color:'chalk' as const};
 const original=structuredClone(stamp),geometry=stampGeometry(stamp,clay),points=geometry.getAttribute('position');
 for(let i=0;i<points.count;i++) {const y=points.getY(i),radius=Math.hypot(points.getX(i),points.getZ(i));expect(radius).toBeCloseTo(visualRadius(clay.radii,y/clay.height*47)+.0015,5);}
 expect(stamp).toEqual(original);geometry.dispose();
});
it('moving a handle preview reuses its mesh and shared geometry without changing confirmed handles',()=>{
 const family=createMaterialFamily(),root=new Group(),view=createHandleView(root,family),h=placeHandle('round',anchor,createClay(),'h');
 view.update([h]);const confirmed=view.meshes.get('h')!,matrix=confirmed.matrix.clone();view.preview(h);
 const preview=root.getObjectByName('HandlePreview')!,mesh=preview.children[0];view.preview({...h,rotation:.25});
 expect(preview.children[0]).toBe(mesh);expect(confirmed.matrix).toEqual(matrix);view.preview(null);expect(view.group.children).toHaveLength(1);view.dispose();family.dispose();
});
