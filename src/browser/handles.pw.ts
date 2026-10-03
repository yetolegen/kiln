import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createClay } from '../engine/clay';
import { emptyCustomization } from '../engine/customization';
import { placeHandle } from '../engine/handles';
import { encodeShare } from './shareCodec';

const action=(page:Page,id:string)=>page.locator(`[data-action="${id}"]`);
const evidenceDir='test-results/handles-evidence';
const capture=async(page:Page,name:string)=>{await page.emulateMedia({reducedMotion:'reduce'});return page.screenshot({path:`${evidenceDir}/${name}.png`,animations:'disabled',style:'[data-testid="mock-badge"] { visibility: hidden; }'});};
async function start(page:Page) { await page.goto('/?dev=1&mock=1');await expect(page.getByTestId('mock-badge')).toBeVisible();await page.keyboard.press('j');await page.keyboard.press('h');await action(page,'free').click();await action(page,'done').click();await expect(page.locator('.decoration-editor h2')).toHaveText('Добавить ручку?'); }
async function dwell(page:Page,id:string) {await page.mouse.move(0,0);await page.waitForTimeout(350);const button=action(page,id),element=await button.elementHandle();await button.hover();await expect.poll(()=>element!.evaluate(el=>!el.isConnected||parseFloat((el as HTMLElement).style.getPropertyValue('--dwell'))>=100)).toBe(true);}
async function place(page:Page) {await page.mouse.move(720,520);await expect(page.locator('.decoration-editor header p')).toContainText('Точки крепления касаются');await page.waitForTimeout(500);await page.keyboard.press('q');await expect(page.locator('.decoration-editor h2')).toContainText('изменение');await page.keyboard.press('q');}

test('handles: zero-handle optional step, body lock and mini lesson skip are dwell accessible',async({page})=>{
 await start(page);await dwell(page,'decor-handle-done');await expect(action(page,'decor-add')).toBeVisible();await dwell(page,'decor-close');
 await action(page,'glaze-jade').click();await action(page,'fire').click();await expect(page.locator('.workshop')).toHaveAttribute('data-phase','result');
 const pots=await page.evaluate(()=>JSON.parse(localStorage.getItem('kiln.gallery.v1')!).pots);expect(pots[0].customization.handles).toEqual([]);
 await action(page,'menu').click();await action(page,'new-lessons').click();await action(page,'modal-lesson-handles').click();
 await expect(page.locator('.decoration-editor h2')).toHaveText('Добавить ручку?');await dwell(page,'decor-lesson-skip');await expect(page.locator('.workshop')).toHaveAttribute('data-phase','menu');
});

for(const preset of ['round','angular','arch'] as const) test(`handles: ${preset} hand placement, confirm, gallery reopen and shared viewer`,async({page,browser})=>{
 test.setTimeout(120000);await start(page);await dwell(page,'decor-handle-add');await dwell(page,`decor-handle-${preset}`);await place(page);
 await dwell(page,'decor-turn-right');await dwell(page,'decor-apply');await expect(page.getByTestId('pot-canvas')).toHaveAttribute('data-handles','1');
 await dwell(page,'decor-handle-done');await dwell(page,'decor-close');await action(page,'glaze-jade').click();await action(page,'fire').click();await expect(page.locator('.workshop')).toHaveAttribute('data-phase','result');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('kiln.gallery.v1')!).pots[0]);expect(saved.customization.handles).toHaveLength(1);expect(saved.customization.handles[0].preset).toBe(preset);expect(saved.customization.handles[0].rotation).toBeCloseTo(Math.PI/12);
 await capture(page,`handles-${preset}-result`);await page.reload();await expect(page.getByTestId('mock-badge')).toBeVisible();await action(page,'gallery').click();await action(page,'shelf-open-0').click();
 await expect(page.getByTestId('pot-canvas')).toHaveAttribute('data-handles','1');await capture(page,`handles-${preset}-reopen`);
 await action(page,'view-share').click();const link=page.locator('.share-url');await expect(link).toHaveAttribute('href',/#pot=v1/);
 const recipient=await browser.newPage();const camera:string[]=[];recipient.on('request',r=>{if(/mediapipe|hand_landmarker|handTracker/.test(r.url()))camera.push(r.url());});
 await recipient.goto((await link.getAttribute('href'))!);await expect(recipient.getByTestId('pot-canvas')).toHaveAttribute('data-handles','1');await expect(recipient.locator('.public-viewer')).toContainText('Камера выключена');expect(camera).toEqual([]);
 await capture(recipient,`handles-${preset}-shared`);await recipient.close();
});

test('handles: add another, rotate complete assembly, edit and delete only one handle by dwell',async({page})=>{
 test.setTimeout(120000);await start(page);
 for(const preset of ['round','angular']) {await dwell(page,'decor-handle-add');await dwell(page,`decor-handle-${preset}`);await place(page);await dwell(page,'decor-apply');}
 await expect(page.getByTestId('pot-canvas')).toHaveAttribute('data-handles','2');
 const view=await page.getByTestId('pot-canvas').getAttribute('data-view');await page.mouse.move(700,430);await page.waitForTimeout(400);await page.keyboard.press('q');await page.waitForTimeout(300);await page.mouse.move(790,460,{steps:10});await page.keyboard.press('q');await expect(page.getByTestId('pot-canvas')).not.toHaveAttribute('data-view',view!);
 await dwell(page,'decor-handle-list');await dwell(page,'decor-select-0');await dwell(page,'decor-delete');await expect(page.getByTestId('pot-canvas')).toHaveAttribute('data-handles','1');
 await dwell(page,'decor-handle-done');await dwell(page,'decor-close');await action(page,'glaze-chalk').click();await action(page,'fire').click();await expect(page.locator('.workshop')).toHaveAttribute('data-phase','result');
 await page.reload();await expect(page.getByTestId('mock-badge')).toBeVisible();await action(page,'gallery').click();await action(page,'shelf-open-0').click();await expect(page.getByTestId('pot-canvas')).toHaveAttribute('data-handles','1');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('kiln.gallery.v1')!).pots[0]);expect(saved.customization.handles.map((h:{preset:string})=>h.preset)).toEqual(['angular']);
});

for(const viewport of [{width:1440,height:900},{width:1366,height:768},{width:390,height:844},{width:430,height:932},{width:844,height:390}]) test(`handles: accessible editor ${viewport.width}x${viewport.height}`,async({page})=>{
 await page.setViewportSize(viewport);await start(page);await action(page,'decor-handle-add').click();
 expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
 for(const b of await page.locator('.decoration-editor button:visible').all()) {const r=await b.boundingBox();expect(r).not.toBeNull();expect(r!.width).toBeGreaterThanOrEqual(44);expect(r!.height).toBeGreaterThanOrEqual(44);expect(r!.x).toBeGreaterThanOrEqual(0);expect(r!.y).toBeGreaterThanOrEqual(0);expect(r!.x+r!.width).toBeLessThanOrEqual(viewport.width);expect(r!.y+r!.height).toBeLessThanOrEqual(viewport.height);}
 await capture(page,`handles-editor-${viewport.width}x${viewport.height}`);
 const clay=createClay(),customization=emptyCustomization();customization.handles=['round','angular','arch'].map((p,i)=>placeHandle(p as 'round'|'angular'|'arch',{point:{x:i===1?-1:1,y:.6,z:0},normal:{x:i===1?-1:1,y:0,z:0}},clay,'h'+i));
 await page.goto('/'+await encodeShare({clay,customization,glazeId:'cobalt'}));await expect(page.getByTestId('pot-canvas')).toHaveAttribute('data-handles','3');
 expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
 await capture(page,`handles-viewer-${viewport.width}x${viewport.height}`);
});
