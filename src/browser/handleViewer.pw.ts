import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createClay } from '../engine/clay';
import { emptyCustomization } from '../engine/customization';
import { placeHandle } from '../engine/handles';
import { encodeShare } from './shareCodec';

// This exercises the real hash route and also runs against the production preview.
test('handles: public assembly rotates and survives resize without camera or creator controls', async ({page}) => {
 const clay=createClay(),customization=emptyCustomization();clay.cavityRadiusWorld=.5;clay.cavityDepthWorld=.8;
 customization.handles=['round','angular','arch'].map((preset,i)=>placeHandle(preset as 'round'|'angular'|'arch',{point:{x:i===1?-1:1,y:.6,z:0},normal:{x:i===1?-1:1,y:0,z:0}},clay,'h'+i));
 customization.attachments=[{id:'a',kind:'sphere',anchor:{point:{x:0,y:.6,z:1},normal:{x:0,y:0,z:1}},length:.3,width:.2,rotation:0,tilt:0,material:'amber'}];
 customization.stamps=[{id:'s',kind:'star',anchor:{point:{x:0,y:.9,z:1},normal:{x:0,y:0,z:1}},size:.2,rotation:0,color:'chalk'}];
 const requests:string[]=[],errors:string[]=[];page.on('request',r=>{if(/mediapipe|hand_landmarker|handTracker/.test(r.url()))requests.push(r.url());});page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  const denyCamera=()=>{throw Error('Camera must remain off in read-only viewer');};
  // Windows WebKit may omit mediaDevices; still fail on any attempted camera use.
  if(navigator.mediaDevices) Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:denyCamera});
  else Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia:denyCamera}});
 });
 await page.goto('/'+await encodeShare({clay,customization,glazeId:'cobalt'}));
 const canvas=page.getByTestId('pot-canvas');await expect(canvas).toHaveAttribute('data-handles','3');await expect(page.locator('.public-viewer')).toContainText('Камера выключена');
 expect(await page.locator('[data-action^="decor-"]').count()).toBe(0);expect(await page.evaluate(()=>localStorage.getItem('kiln.gallery.v1'))).toBeNull();
 const initial=await canvas.getAttribute('data-view');await page.mouse.move(700,450);await page.mouse.down();await page.mouse.move(820,470,{steps:8});await page.mouse.up();await expect(canvas).not.toHaveAttribute('data-view',initial!);
 for(const size of [{width:390,height:844},{width:844,height:390}]) {await page.setViewportSize(size);await expect(canvas).toHaveAttribute('data-handles','3');for(const button of await page.locator('.public-viewer button:visible').all()){const r=(await button.boundingBox())!;expect(r.x).toBeGreaterThanOrEqual(0);expect(r.y).toBeGreaterThanOrEqual(0);expect(r.x+r.width).toBeLessThanOrEqual(size.width+1);expect(r.y+r.height).toBeLessThanOrEqual(size.height+1);}}
 expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
 await page.reload();await expect(canvas).toHaveAttribute('data-handles','3');expect(requests).toEqual([]);expect(errors).toEqual([]);
});
