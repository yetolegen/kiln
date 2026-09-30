import { test, expect } from '@playwright/test';

// Only the camera landmark provider is substituted. Features, controller, UI and clock are real.
const trackerModule = `
export class HandTrackerError extends Error {}
export class HandTracker {
  epoch = 0; frame = 0; last = -Infinity;
  static async create() { return new HandTracker(); }
  start(video, onPacket) {
    window.__cameraSample = (rafTime) => {
      const now = performance.now(); if (now - this.last < 32) return;
      this.last = now;
      const phase = document.querySelector('.workshop')?.dataset.phase;
      const w = innerWidth, h = innerHeight, scale = Math.max(w / video.videoWidth, h / video.videoHeight);
      const source = (x, y) => [1 - (x + (video.videoWidth * scale - w) / 2) / (video.videoWidth * scale), (y + (video.videoHeight * scale - h) / 2) / (video.videoHeight * scale)];
      const hand = (x, y) => {
        let [u, v] = source(x, y); u += .0025; v -= .025;
        const p = []; p[0] = {x:u, y:v+.1, z:0};
        [[-.04,.06],[-.06,.03],[-.08,.01],[-.09,-.01]].forEach(([dx,dy],k)=>p[k+1]={x:u+dx,y:v+dy,z:0});
        [-.03,-.01,.01,.03].forEach((dx,f)=>[0,-.03,-.05,-.07].forEach((dy,k)=>p[5+f*4+k]={x:u+dx,y:v+dy,z:0}));
        return {landmarks:p, handednessScore:1};
      };
      let hands = [hand(w*.35,h*.65),hand(w*.65,h*.65)];
      if (phase === 'menu') {
        const r = document.querySelector('[data-action="tutorial"]').getBoundingClientRect();
        hands = [hand(r.x+r.width/2,r.y+r.height/2)];
      }
      if (phase === 'tutorial') {
        const ppu = Math.min(w/5,h*.48/3.2), y = h*.8 - 1.2*24/47*ppu;
        this.shapeStart ??= now;
        const halfGap = 1.3 - Math.min(.4, Math.max(0, now - this.shapeStart - 500) * .0002);
        hands = [hand(w*.5-halfGap*ppu,y), hand(w*.5+halfGap*ppu,y)];
      }
      window.__cameraAhead = (window.__cameraAhead ?? 0) + Number(now > rafTime);
      onPacket({frameId:++this.frame,epoch:this.epoch,capturedAtMs:now,receivedAtMs:performance.now(),mediaTimeMs:now,hands});
    };
  }
  stop() { window.__cameraSample = undefined; }
  close() { this.stop(); }
}
`;

test('camera observations newer than the animation timestamp can dwell and confirm real clay geometry', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Synthetic camera permission is configured for Chromium.');
  await page.addInitScript(() => {
    const w = window as typeof window & { __cameraSample?: (t: number) => void };
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) => raf((t) => { w.__cameraSample?.(t); callback(t); });
  });
  await page.route('**/src/tracking/handTracker.ts*', (route) => route.fulfill({ contentType: 'text/javascript', body: trackerModule }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Начать', exact: true }).click();
  await expect(page.locator('.workshop')).toHaveAttribute('data-phase', 'menu', { timeout: 12_000 });
  const button = page.locator('[data-action="tutorial"]');
  await expect(button).toHaveClass(/is-dwelling/);
  const pointer = page.locator('.workshop > .hand-cursor');
  await expect(pointer).toBeVisible(); await expect(pointer).toHaveCSS('z-index', '6');
  await expect.poll(() => pointer.locator('.hand-cursor__progress').getAttribute('stroke-dashoffset')).not.toBe('126');
  await page.screenshot({ path: 'test-results/v51-palm-cursor.png' });
  await expect(page.locator('.workshop')).toHaveAttribute('data-phase', 'tutorial', { timeout: 8000 });
  const lesson = page.locator('.tutorial-card');
  await expect(lesson).toHaveAttribute('data-state', 'matched', { timeout: 8000 });
  await expect(lesson).toHaveAttribute('data-step', '0');
  expect(await page.evaluate(() => (window as typeof window & { __cameraAhead: number }).__cameraAhead)).toBeGreaterThan(15);
});
