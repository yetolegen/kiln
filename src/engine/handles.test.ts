import { expect, it } from 'vitest';
import { createClay } from './clay';
import { HANDLE_MIN_SCALE, HANDLE_PRESETS, handleFits, handlePlacementHint, placeHandle } from './handles';
import { emptyCustomization, readCustomization } from './customization';
import { createController } from './controller';
import { toMenu, frame, shapingHands } from '../../tests/helpers';
import { createGalleryStore, isSessionResult } from '../browser/storage';
import { artifactFromResult } from './artifact';
import { decodeShare, encodeShare, packArtifact, unpackArtifact } from '../browser/shareCodec';

const anchor = {point:{x:1,y:.6,z:0},normal:{x:1,y:0,z:0}};
it.each(HANDLE_PRESETS)('%s survives real finalization, gallery reload and bounded share serialization', async preset => {
 const core=createController({nowIso:()=> '2026-10-03T00:00:00Z'});let now=toMenu(core);
 core.dispatch({type:'start',mode:'free',sessionId:preset},now); core.dispatch({type:'finishShaping'},++now);
 const c=emptyCustomization();c.handles.push(placeHandle(preset,anchor,core.tick(now).clay!,'handle',undefined,.15));
 expect(handleFits(c.handles[0],core.tick(now).clay!)).toBe(true);
 core.dispatch({type:'customize',value:c},++now);core.dispatch({type:'selectGlaze',glazeId:'cobalt'},++now);core.dispatch({type:'confirmGlaze'},++now);
 const result=core.tick(now+5000).result!;expect(result.customization?.handles).toEqual(c.handles);expect(isSessionResult(result)).toBe(true);
 let saved='';const backend={getItem:()=>saved||null,setItem:(_:string,v:string)=>{saved=v;}};
 expect(createGalleryStore(()=>backend).save(result)).toBe(true);
 const reloaded=createGalleryStore(()=>backend).list()[0];expect(reloaded.customization?.handles).toEqual(c.handles);
 const decoded=await decodeShare(await encodeShare(artifactFromResult(reloaded)));
 expect(decoded.customization.handles).toEqual(c.handles.map(h=>({...h,id:'h0'})));expect(decoded.glazeId).toBe('cobalt');
});
it('zero handles and old saved work/links remain valid', () => {
 const core=createController({nowIso:()=> '2026-10-03T00:00:00Z'});let now=toMenu(core);core.dispatch({type:'start',mode:'free',sessionId:'old'},now);
 core.dispatch({type:'finishShaping'},++now);core.dispatch({type:'selectGlaze',glazeId:'jade'},++now);core.dispatch({type:'confirmGlaze'},++now);
 const result=structuredClone(core.tick(now+5000).result!);expect(result.customization?.handles).toEqual([]);
 Reflect.deleteProperty(result.customization!,'handles');expect(isSessionResult(result)).toBe(true);
 const backend={getItem:()=>JSON.stringify([result]),setItem:()=>{}};expect(createGalleryStore(()=>backend).list()).toHaveLength(1);
 const packed=packArtifact(artifactFromResult(result));expect(packed).not.toHaveProperty('handles');expect(unpackArtifact(packed)?.customization.handles).toEqual([]);
 expect(readCustomization({...emptyCustomization(),handles:undefined})?.handles).toEqual([]);
});
it('two handles are independent; deletion remains deleted after saving and sharing', async () => {
 const core=createController({nowIso:()=> '2026-10-03T00:00:00Z'});let now=toMenu(core);core.dispatch({type:'start',mode:'commission',sessionId:'two',targetId:'vase@1'},now);core.dispatch({type:'finishShaping'},++now);
 const c=emptyCustomization();c.handles=HANDLE_PRESETS.slice(0,2).map((p,i)=>placeHandle(p,anchor,core.tick(now).clay!,'h'+i));
 core.dispatch({type:'customize',value:c},++now);expect(core.tick(now).customization?.handles).toHaveLength(2);
 c.handles.splice(0,1);core.dispatch({type:'customize',value:c},++now);core.dispatch({type:'selectGlaze',glazeId:'chalk'},++now);core.dispatch({type:'confirmGlaze'},++now);
 const result=core.tick(now+5000).result!;expect(result.customization?.handles.map(h=>h.id)).toEqual(['h1']);
 let raw='';const storage={getItem:()=>raw||null,setItem:(_:string,v:string)=>{raw=v;}};createGalleryStore(()=>storage).save(result);
 const reopened=createGalleryStore(()=>storage).list()[0];expect(reopened.customization?.handles).toHaveLength(1);
 expect((await decodeShare(await encodeShare(artifactFromResult(reopened)))).customization.handles.map(h=>h.preset)).toEqual(['angular']);
});
it('rejects malformed, floating, detached, duplicate and excessive handles atomically', () => {
 const clay=createClay(),h=placeHandle('round',anchor,clay,'a');
 for(const patch of [{scale:NaN},{scale:Infinity},{rotation:Infinity},{anchor:null},{preset:'freeform'},{scale:20}]) expect(readCustomization({...emptyCustomization(),handles:[{...h,...patch}]})).toBeNull();
 expect(readCustomization({...emptyCustomization(),handles:[h,h]})).toBeNull();
 expect(readCustomization({...emptyCustomization(),handles:Array.from({length:5},(_,i)=>({...h,id:'h'+i}))})).toBeNull();
 expect(handleFits({...h,anchor:{...h.anchor,point:{x:0,y:10,z:0}}},clay)).toBe(false);
 const arch=placeHandle('arch',anchor,clay,'top');expect(handleFits({...arch,scale:arch.scale+.3},clay)).toBe(false);
 const packed=packArtifact({clay,glazeId:'jade',customization:{...emptyCustomization(),handles:[h]}}) as object;
 expect(unpackArtifact({...packed,handles:[{...h,scale:1.8}]})).toBeNull();
});
it('post-shaping handles cannot alter the locked body and do not enable shaping commands', () => {
 const core=createController();let now=toMenu(core);core.dispatch({type:'start',mode:'free',sessionId:'locked'},now);core.dispatch({type:'finishShaping'},++now);
 const before=core.tick(now).clay!;const c=emptyCustomization();c.handles.push(placeHandle('round',anchor,before,'h'));
 core.dispatch({type:'customize',value:c},++now);for(let i=0;i<20;i++) {now+=50;core.observe(frame(now,...shapingHands(i*50)));core.tick(now);}
 expect(core.tick(now).clay!.radii).toEqual(before.radii);expect(core.tick(now).clay!.height).toBe(before.height);
});
it('short usable pots get a valid minimum side handle; impossible fits explain the actual constraint', () => {
 const clay=createClay();clay.height=.3;
 const h=placeHandle('round',{...anchor,point:{x:1,y:.15,z:0}},clay,'small');
 expect(h.scale).toBe(HANDLE_MIN_SCALE);expect(handleFits(h,clay)).toBe(true);
 clay.height=.2;expect(handleFits(h,clay)).toBe(false);expect(handlePlacementHint(h,clay)).toContain('слишком низкая');
 clay.height=1.2;clay.cavityDepthWorld=.8;clay.cavityRadiusWorld=.98;
 const arch=placeHandle('arch',anchor,clay,'thin');expect(handleFits(arch,clay)).toBe(false);expect(handlePlacementHint(arch,clay)).toContain('попадают в отверстие');
});
