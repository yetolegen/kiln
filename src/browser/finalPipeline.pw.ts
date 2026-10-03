import { expect, test } from '@playwright/test';

// Substitute only the landmark source. CameraSession, FeatureExtractor, recognizer,
// controller, rendering, dwell, storage and finalization are the real application.
const tracker = `
export class HandTrackerError extends Error {}
export class HandTracker {
  epoch=0; frame=0; timer=0;
  static async create(){return new HandTracker();}
  start(video, callback){
    this.timer=setInterval(()=>{
      const now=performance.now(), w=innerWidth,h=innerHeight;
      window.__fixtureTiming={frame:this.frame,dt:now-(this.last??now)};this.last=now;
      const scale=Math.max(w/video.videoWidth,h/video.videoHeight);
      const specs=window.__fixtureHands ?? [{x:w*.35,y:h*.65},{x:w*.65,y:h*.65}];
      const hands=specs.map(({x,y,pinch=false,tip=false})=>{
        let u=1-(x+(video.videoWidth*scale-w)/2)/(video.videoWidth*scale),v=(y+(video.videoHeight*scale-h)/2)/(video.videoHeight*scale);
        u+=.0025;v-=.025;
        if(tip){u=1-(x+(video.videoWidth*scale-w)/2)/(video.videoWidth*scale)+.03;v=(y+(video.videoHeight*scale-h)/2)/(video.videoHeight*scale)+.07;}
        const p=[];p[0]={x:u,y:v+.1,z:0};
        [[-.04,.06],[-.06,.03],[-.08,.01],[-.09,-.01]].forEach(([dx,dy],k)=>p[k+1]={x:u+dx,y:v+dy,z:0});
        [-.03,-.01,.01,.03].forEach((dx,f)=>[0,-.03,-.05,-.07].forEach((dy,k)=>p[5+f*4+k]={x:u+dx,y:v+dy,z:0}));
        if(pinch)p[4]={...p[8],x:p[8].x+.009};
        return {landmarks:p,handednessScore:1};
      });
      callback({frameId:++this.frame,epoch:this.epoch,capturedAtMs:now,receivedAtMs:performance.now(),mediaTimeMs:now,hands});
    },33);
  }
  stop(){clearInterval(this.timer);}
  close(){this.stop();}
}`;

test('M6 real pipeline: landmark dwell, shaping, checkpoint, restore, decoration, firing, shelf and share', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'CameraSession uses Chromium fake media; observations below are synthetic.');
  test.setTimeout(180000);
  await page.route('**/src/tracking/handTracker.ts*', route => route.fulfill({ contentType: 'text/javascript', body: tracker }));
  await page.goto('/'); await page.getByRole('button', { name: 'Начать', exact: true }).click();
  await expect(page.locator('.workshop')).toHaveAttribute('data-phase', 'menu', { timeout: 12000 });
  type Hand = { x: number; y: number; pinch?: boolean; tip?: boolean };
  const hands = (value: Hand[]) => page.evaluate(value => { (window as typeof window & { __fixtureHands: Hand[] }).__fixtureHands = value; }, value);
  const select = async (id: string) => {
    await hands([{ x: 50, y: 70 }]); await page.waitForTimeout(300);
    const button = page.locator(`[data-action="${id}"]`); await expect(button).toBeEnabled();
    const element = await button.elementHandle();
    await expect.poll(async () => {
      const state = await element!.evaluate(el => {
        const r = el.getBoundingClientRect();
        return { complete: !el.isConnected || !!el.closest('[hidden],[inert]') || parseFloat((el as HTMLElement).style.getPropertyValue('--dwell')) >= 100 ||
          (!el.closest('.work-modal') && !!document.querySelector('.work-modal:not([hidden])')), rect: { x: r.x, y: r.y, width: r.width, height: r.height } };
      });
      if (state.complete) return true;
      const r = state.rect;
      await hands([{ x: r.x + r.width / 2, y: r.y + r.height / 2 }]);
      return false;
    }, { timeout: 10000, intervals: [100, 150] }).toBe(true).catch(async cause => {
      const observed = await page.evaluate(() => ({
        timing: (window as typeof window & { __fixtureTiming?: unknown }).__fixtureTiming,
        hint: document.querySelector('.hud__hint')?.textContent,
        rendering: (document.querySelector('[data-testid="pot-canvas"]') as HTMLElement)?.dataset,
      }));
      throw new Error(`Palm selection ${id}: ${JSON.stringify(observed)}`, { cause });
    });
    await hands([{ x: 50, y: 70 }]); await page.waitForTimeout(150);
  };
  await select('free'); await expect(page.locator('.workshop')).toHaveAttribute('data-phase', 'studio');
  const projection = await page.evaluate(async () => {
    const path = '/src/browser/camera.ts'; const { cameraProjection } = await import(/* @vite-ignore */ path);
    return cameraProjection(document.querySelector('video'), { width: innerWidth, height: innerHeight }, 0, 'studio');
  });
  const p = projection, bandY = p.bottomYPx - .6 * p.pixelsPerWorldUnit;
  // Establish contact calmly, then converge at the same rate as the real-controller regressions.
  await hands([{ x: p.axisXPx - 1.3 * p.pixelsPerWorldUnit, y: bandY }, { x: p.axisXPx + 1.3 * p.pixelsPerWorldUnit, y: bandY }]);
  await page.waitForTimeout(900);
  for (let i = 0; i <= 32; i++) {
    const r = 1.3 - i * .012;
    await hands([{ x: p.axisXPx - r * p.pixelsPerWorldUnit, y: bandY }, { x: p.axisXPx + r * p.pixelsPerWorldUnit, y: bandY }]);
    await page.waitForTimeout(65);
  }
  await hands([{ x: 50, y: 70 }]); await page.waitForTimeout(600);
  await select('checkpoint-save'); await expect(page.locator('.checkpoint-status')).toContainText('Точка сохранена');
  const checkpoint = await page.evaluate(() => JSON.parse(localStorage.getItem('kiln.checkpoint.v1')!));
  expect(Math.min(...checkpoint.clay.radii.slice(20, 29))).toBeLessThan(.99);
  await select('more'); await select('checkpoint-restore'); await select('modal-restore'); // «Восстановить» is folded under «Ещё» on wide screens
  await expect(page.locator('.checkpoint-status')).toContainText('Точка восстановлена');
  await select('done'); await select('decor-handle-done'); await select('decor-add'); await select('decor-sphere');
  const place = async (x: number) => {
    await hands([{ x, y: 450, tip: true }]); await page.waitForTimeout(800);
    await hands([{ x, y: 450, tip: true, pinch: true }]);
    await expect(page.locator('.decoration-editor h2')).toContainText('изменение', { timeout: 10000 }).catch(async cause => {
      const observed = await page.evaluate(() => ({ timing: (window as typeof window & { __fixtureTiming?: unknown }).__fixtureTiming,
        rendering: (document.querySelector('[data-testid="pot-canvas"]') as HTMLElement)?.dataset,
        placement: document.querySelector('.decoration-editor header p')?.textContent }));
      throw new Error(`Landmark placement: ${JSON.stringify(observed)}`, { cause });
    });
    await hands([{ x: 50, y: 70 }]); await page.waitForTimeout(200); await select('decor-apply');
  };
  await place(720); await select('decor-stamp'); await select('decor-star'); await place(750); await select('decor-close');
  await select('glaze-jade'); await select('fire'); await expect(page.locator('.workshop')).toHaveAttribute('data-phase', 'result', { timeout: 10000 });
  const pots = await page.evaluate(() => JSON.parse(localStorage.getItem('kiln.gallery.v1')!).pots);
  expect(pots).toHaveLength(1); expect(pots[0].stats.restores).toBe(1); expect(pots[0].customization.attachments).toHaveLength(1); expect(pots[0].customization.stamps).toHaveLength(1);
  await select('gallery'); await select('shelf-open-0'); await select('view-share');
  await expect(page.locator('.share-url')).toHaveAttribute('href', /#pot=v1\./);
  await page.screenshot({ path: 'test-results/final-real-pipeline.png' });
});
