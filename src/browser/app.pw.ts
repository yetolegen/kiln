import { test, expect } from '@playwright/test';

test('B10 retains a fading visual briefly while lost tracking pauses the controls', async ({ page }) => {
  await page.goto('/?dev=1&mock=1');
  await expect(page.getByTestId('mock-badge')).toBeVisible();
  await page.keyboard.press('5'); await page.keyboard.press('s');
  const pixels = () => page.locator('.overlay-canvas').evaluate((canvas: HTMLCanvasElement) => {
    const top = Math.floor(canvas.height / 2);
    const data = canvas.getContext('2d')!.getImageData(0, top, canvas.width, canvas.height - top).data;
    let count = 0; for (let i = 3; i < data.length; i += 4) if (data[i]) count++; return count;
  });
  // Free mode removes the target; sample the lower half to exclude V5's persistent height-limit line.
  await page.keyboard.press('3'); await page.locator('[data-action="free"]').click(); await page.mouse.move(0, 0); await page.keyboard.press('s');
  await expect.poll(pixels).toBeGreaterThan(0);
  const retained = await page.evaluate(async () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
    return new Promise<number>((resolve) => {
      const deadline = performance.now() + 3000;
      const sample = () => {
        if (document.querySelector('.hud__hint')?.textContent?.includes('Отслеживание потеряно')) {
          const canvas = document.querySelector<HTMLCanvasElement>('.overlay-canvas')!;
          const top = Math.floor(canvas.height / 2);
          const data = canvas.getContext('2d')!.getImageData(0, top, canvas.width, canvas.height - top).data;
          let count = 0; for (let i = 3; i < data.length; i += 4) if (data[i]) count++;
          resolve(count);
        } else if (performance.now() >= deadline) resolve(-1);
        else requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
  });
  expect(retained).toBeGreaterThan(0);
  await expect(page.locator('.hud__hint')).toContainText('Отслеживание потеряно');
  const advice = await page.locator('.hud__hint').boundingBox(), heading = await page.locator('h1').boundingBox();
  expect(advice!.y + advice!.height).toBeLessThanOrEqual(heading!.y);
  await expect(page.locator('.hand-cursor')).toBeHidden();
  await expect.poll(pixels).toBe(0);
  await page.keyboard.press('x'); await expect.poll(pixels).toBeGreaterThan(0);
});

test('B9 keeps portrait/landscape controls in view and exports a square PNG', async ({ page }) => {
  await page.goto('/?dev=1&mock=1');
  await expect(page.getByTestId('mock-badge')).toBeVisible();
  for (const size of [{ width: 390, height: 844 }, { width: 360, height: 740 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(size);
    for (const phase of ['3', '4', '5', '6', '8', '9']) {
      await page.mouse.move(0, 0);
      await page.keyboard.press(phase);
      await expect(page.locator('.workshop')).toHaveAttribute('data-phase', ({ '3': 'menu', '4': 'tutorial', '5': 'studio', '6': 'glaze', '8': 'result', '9': 'gallery' } as Record<string, string>)[phase]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(size.width);
      const boxes = await page.locator('.dwell-button:visible').evaluateAll((buttons) => buttons.map((button) => { const r = button.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }));
      for (const box of boxes) {
        expect(box.x).toBeGreaterThanOrEqual(0); expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(size.width + 1);
        expect(box.y + box.height).toBeLessThanOrEqual(size.height + 1);
      }
      if (phase === '8') await page.screenshot({ path: `test-results/b9-result-${size.width}.png` });
    }
  }
  await page.keyboard.press('8');
  const downloaded = page.waitForEvent('download'); await page.locator('[data-action="download"]').click();
  const download = await downloaded;
  const bytes: number[] = [];
  for await (const chunk of (await download.createReadStream())!) for (const byte of chunk) { if (bytes.length < 24) bytes.push(byte); }
  const png = new DataView(Uint8Array.from(bytes).buffer);
  expect(png.getUint32(16)).toBe(1200); expect(png.getUint32(20)).toBe(1200);
  await download.saveAs('test-results/b9-export.png');
});

for (const blockedStorage of [false, true]) test(`B8 finishes a pot, exports PNG and opens gallery (storage blocked: ${blockedStorage})`, async ({ page }) => {
  if (blockedStorage) await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('storage disabled'); } });
    Object.defineProperty(window, 'speechSynthesis', { value: undefined });
    Object.defineProperty(window, 'AudioContext', { value: undefined });
  });
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?dev=1&mock=1');
  await page.locator('[data-action="commission"]').hover();
  await expect(page.locator('.workshop')).toHaveAttribute('data-phase', 'studio');
  await page.keyboard.press('u'); await page.keyboard.press('f');
  await expect(page.locator('.workshop')).toHaveAttribute('data-phase', 'studio');
  await expect(page.locator('[data-action="fire"]')).toHaveCount(0);
  await expect(page.locator('[data-action="glaze-jade"]')).toHaveCount(0);
  await page.keyboard.press('h'); await page.locator('[data-action="done"]').hover();
  await expect(page.locator('[data-action="done"]')).toHaveClass(/is-dwelling/);
  await expect(page.locator('[data-action="fire"]')).toBeDisabled();
  await page.locator('[data-action="glaze-jade"]').hover();
  await expect(page.locator('[data-action="glaze-jade"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-action="fire"]').hover();
  await expect(page.locator('.workshop')).toHaveAttribute('data-phase', 'firing');
  await expect(page.locator('.result-score')).toHaveText('82%', { timeout: 10_000 });
  if (blockedStorage) await expect(page.locator('.storage-status')).toContainText('до закрытия');
  const downloaded = page.waitForEvent('download'); await page.locator('[data-action="download"]').hover();
  expect((await downloaded).suggestedFilename()).toMatch(/^kiln-.*\.png$/);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `test-results/b8-result-${blockedStorage}.png` });
  await page.locator('[data-action="gallery"]').hover();
  await expect(page.locator('.gallery-card')).toHaveCount(1);
  if (!blockedStorage) {
    await page.reload(); await expect(page.getByTestId('mock-badge')).toBeVisible(); await page.keyboard.press('9');
    await expect(page.locator('.gallery-card')).toHaveCount(1);
  }
  expect(errors).toEqual([]);
});

test('studio Free Mode unlocks glazing only through the palm-selectable Done button', async ({ page }) => {
  await page.goto('/?dev=1&mock=1');
  await page.keyboard.press('h'); await page.locator('[data-action="free"]').hover();
  await expect(page.locator('.workshop')).toHaveAttribute('data-phase', 'studio');
  await page.mouse.move(0, 0); await page.keyboard.press('f');
  await expect(page.locator('[data-action="glaze-jade"]')).toHaveCount(0);
  await expect(page.locator('[data-action="fire"]')).toHaveCount(0);
  await expect(page.locator('[data-action="done"]')).toHaveText('Готово');
  await page.keyboard.press('h'); await page.locator('[data-action="done"]').hover();
  await expect(page.locator('[data-action="done"]')).toHaveClass(/is-dwelling/);
  await expect(page.locator('.workshop')).toHaveAttribute('data-phase', 'glaze');
  await expect(page.locator('[data-action="fire"]')).toBeDisabled();
  await page.locator('[data-action="glaze-jade"]').hover();
  await expect(page.locator('[data-action="fire"]')).toBeEnabled();
});

test('B7 tutorial validates geometry for all actions and requires release', async ({ page }) => {
  await page.goto('/?dev=1&mock=1');
  await page.locator('[data-action="tutorial"]').hover();
  const lesson = page.locator('.tutorial-card');
  const complete = async (key: string, step: number) => {
    await page.keyboard.press(key); await expect(lesson).toHaveAttribute('data-state', 'matched');
    await expect(lesson).toHaveAttribute('data-step', String(step));
    await page.keyboard.press('Escape'); await expect(lesson).toHaveAttribute('data-step', String(step + 1));
  };
  await expect(lesson).toHaveAttribute('data-step', '0');
  await complete('s', 0); await complete('u', 1);
  await expect(lesson.locator('.tutorial-instruction')).toContainText('фаланга');
  await page.screenshot({ path: 'test-results/v6-thumb-depth.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId('pot-canvas')).toHaveCSS('width', '390px');
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.screenshot({ path: 'test-results/v6-thumb-depth-phone.png' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await complete('i', 2);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.mouse.move(0, 0);
  await page.keyboard.press('Escape');
  await expect(lesson.locator('h2')).toHaveText('Раскройте углубление');
  await page.screenshot({ path: 'test-results/b7-tutorial-phone.png' });
  await page.setViewportSize({ width: 844, height: 390 });
  await page.keyboard.press('x');
  await expect(page.locator('.hud__hint')).toBeVisible();
  await expect(page.locator('.hud__hint')).toContainText('Отслеживание потеряно');
  const warning = await page.locator('.hud__hint').boundingBox(), title = await page.locator('h1').boundingBox();
  expect(warning!.y + warning!.height).toBeLessThanOrEqual(title!.y);
  const panel = await lesson.boundingBox(); expect(panel!.y + panel!.height).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'test-results/b7-tutorial-landscape.png' });
  await page.keyboard.press('x');
  await page.keyboard.press('w'); await expect(page.locator('.hud__hint')).toContainText('Смести');
  await expect(page.locator('.hud__hint')).toBeVisible(); await page.keyboard.press('w');
  await complete('o', 3);
  await page.screenshot({ path: 'test-results/v6-wall-section.png' });
  await page.keyboard.press('d');
  await expect(lesson).toHaveAttribute('data-state', 'completed');
  await expect(lesson).toHaveAttribute('data-step', '5');
  await expect(page.locator('h1')).toHaveText('Обучение окончено');
  await expect(page.locator('.hud__hint')).toContainText('Обучение окончено');
  await page.keyboard.press('x');
  await expect(page.locator('.hud__hint')).toContainText('Обучение окончено');
  await page.keyboard.press('x');
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  const finalPanel = await lesson.boundingBox(); expect(finalPanel!.y + finalPanel!.height).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'test-results/final-lesson-advice.png' });
  await page.keyboard.press('f'); await expect(page.locator('.workshop')).toHaveAttribute('data-phase', 'tutorial');
  await page.keyboard.press('h'); await page.locator('[data-action="menu"]').hover();
  await expect(page.locator('.workshop')).toHaveAttribute('data-phase', 'menu');
});

test('B7 palm dwell fills, failures stop the lesson and palm retry resets the attempt', async ({ page }) => {
  await page.goto('/?dev=1&mock=1');
  await expect(page.getByTestId('mock-badge')).toBeVisible();
  await page.keyboard.press('h');
  const button = page.locator('[data-action="tutorial"]');
  await button.hover();
  await expect(button).toHaveClass(/is-dwelling/);
  await expect(page.locator('.workshop > .hand-cursor')).toBeVisible();
  await expect.poll(() => button.evaluate((el) => parseFloat((el as HTMLElement).style.getPropertyValue('--dwell')))).toBeGreaterThan(0);
  const lesson = page.locator('.tutorial-card');
  await expect(lesson).toHaveAttribute('data-step', '0');
  await page.mouse.move(0, 0);
  // An actual mock clay tear exceeds the geometry validator's damage limit.
  await page.keyboard.press('t');
  await expect(lesson).toHaveAttribute('data-state', 'failed');
  await expect(lesson.locator('.tutorial-feedback')).toContainText('Стенка повреждена');
  await page.keyboard.press('s'); await expect(lesson).toHaveAttribute('data-step', '0');
  for (const size of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(size);
    const retry = page.locator('[data-action="lesson-retry"]');
    await expect(retry).toBeVisible();
    const box = await retry.boundingBox(); expect(box!.y + box!.height).toBeLessThanOrEqual(size.height);
    await page.screenshot({ path: `test-results/b7-failed-${size.width}.png` });
  }
  await page.locator('[data-action="lesson-retry"]').hover();
  await expect(lesson).toHaveAttribute('data-state', 'working');
  await expect(lesson).toHaveAttribute('data-step', '0');
  await expect(page.locator('[data-action="lesson-retry"]')).toBeHidden();
});

test('B6 continues without sound APIs and toggles mute by dwell', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'speechSynthesis', { value: undefined });
    Object.defineProperty(window, 'AudioContext', { value: undefined });
  });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?dev=1&mock=1');
  await page.locator('[data-action="mute"]').hover();
  await expect(page.locator('[data-action="mute"]')).toHaveText('Звук выключен');
  await page.locator('[data-action="free"]').hover();
  await expect(page.locator('.workshop')).toHaveAttribute('data-phase', 'studio');
  await page.keyboard.press('t');
  await expect(page.locator('.hud__hint')).toContainText('Слишком быстро');
  expect(errors).toEqual([]);
});

test('V5 warns about stretching and shows permanent hole/pancake failures with restart', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?dev=1&mock=1'); await page.locator('[data-action="free"]').hover();
  await expect(page.locator('.workshop')).toHaveAttribute('data-phase', 'studio');
  await page.mouse.move(0, 0); await page.keyboard.press('i'); await page.keyboard.press('e');
  await expect(page.locator('.hud__hint')).toContainText('слишком долго');
  await page.keyboard.press('e'); await page.keyboard.press('b');
  await expect(page.locator('.hud__hint')).toContainText('продавили дно насквозь');
  await page.screenshot({ path: 'test-results/v5-hole.png' });
  if (await page.getByTestId('pot-canvas').isVisible()) await page.getByTestId('pot-canvas').dispatchEvent('webglcontextlost');
  await expect(page.getByTestId('pot-fallback')).toBeVisible();
  await page.screenshot({ path: 'test-results/v5-hole-fallback.png' });
  await page.locator('[data-action="restart"]').hover(); await expect(page.locator('.hud__hint')).not.toContainText('продавили'); await page.mouse.move(0, 0);
  await page.keyboard.press('n'); await expect(page.locator('.hud__hint')).toContainText('лепёшку');
  await expect(page.locator('.hud__hint')).toContainText('Начать сначала');
  await page.screenshot({ path: 'test-results/v5-pancake.png' });
  expect(errors).toEqual([]);
});

test('B5 navigates by dwell and shows a readable phone HUD', async ({ page }) => {
  await page.goto('/?dev=1&mock=1');
  await expect(page.locator('[data-action="free"]')).toBeVisible();
  await page.locator('[data-action="free"]').hover();
  await expect(page.locator('.workshop')).toHaveAttribute('data-phase', 'studio');
  await page.keyboard.press('s');
  await page.keyboard.press('w');
  await expect(page.locator('.hud__hint')).toContainText('влево');
  await page.screenshot({ path: 'test-results/b5-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/b5-phone.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.locator('[data-action="menu"]').hover();
  await expect(page.locator('.workshop')).toHaveAttribute('data-phase', 'menu');
});

test('B4 renders clay and falls back after WebGL context loss', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?dev=1&mock=1');
  await expect(page.getByTestId('mock-badge')).toBeVisible();
  await page.keyboard.press('5');
  await expect(page.locator('.workshop')).toHaveAttribute('data-phase', 'studio');
  const webgl = await page.getByTestId('pot-canvas').isVisible();
  await expect(page.getByTestId(webgl ? 'pot-canvas' : 'pot-fallback')).toBeVisible();
  await page.keyboard.press('u');
  await page.keyboard.press('ArrowRight');
  await page.screenshot({ path: 'test-results/b4-pot.png' });
  if (webgl) await page.getByTestId('pot-canvas').dispatchEvent('webglcontextlost');
  await expect(page.getByTestId('pot-fallback')).toBeVisible();
  await page.screenshot({ path: 'test-results/b4-fallback.png' });
  expect(errors).toEqual([]);
});

test('B3 mock changes phases without loading a model or camera', async ({ page }) => {
  let modelRequests = 0;
  page.on('request', (request) => { if (request.url().includes('hand_landmarker.task')) modelRequests++; });
  await page.goto('/?dev=1&mock=1');
  await expect(page.getByTestId('mock-badge')).toBeVisible();
  await page.keyboard.press('5');
  await expect(page.locator('.workshop')).toHaveAttribute('data-phase', 'studio');
  await page.keyboard.press('8');
  await expect(page.locator('.workshop')).toHaveAttribute('data-phase', 'result');
  expect(modelRequests).toBe(0);
});

test('B2 loads the real model, starts a mirrored camera, and resizes', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'This fake-camera setup is Chromium-specific; physical camera is not exercised.');
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  const start = page.getByRole('button', { name: 'Начать', exact: true });
  await expect(start).toBeEnabled({ timeout: 50_000 });
  await start.click();
  await expect(page.locator('.workshop')).toHaveAttribute('data-phase', 'calibrate', { timeout: 20_000 });
  await expect(page.locator('footer')).toContainText('V5.3');
  const video = page.locator('video');
  await expect(video).toBeVisible();
  expect(await video.evaluate((element: HTMLVideoElement) => ({
    width: element.videoWidth, height: element.videoHeight, paused: element.paused,
    fit: getComputedStyle(element).objectFit, transform: getComputedStyle(element).transform,
  }))).toMatchObject({ paused: false, fit: 'cover', transform: 'matrix(-1, 0, 0, 1, 0, 0)' });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await video.evaluate((element) => Math.round(element.getBoundingClientRect().width))).toBe(390);
  await page.screenshot({ path: 'test-results/b2-camera-phone.png' });
  expect(errors).toEqual([]);
});

test('B2 shows a retryable model failure', async ({ page }) => {
  await page.route('**/models/hand_landmarker.task', (route) => route.abort());
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Не удалось загрузить распознавание рук' })).toBeVisible({ timeout: 50_000 });
  await expect(page.getByRole('button', { name: 'Начать' })).toBeEnabled();
});
