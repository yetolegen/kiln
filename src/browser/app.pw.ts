import { test, expect } from '@playwright/test';

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

test('B7 tutorial follows gestures and a complete tear episode', async ({ page }) => {
  await page.goto('/?dev=1&mock=1');
  await page.locator('[data-action="tutorial"]').hover();
  const lesson = page.locator('.tutorial-card');
  await expect(lesson).toHaveAttribute('data-step', '0');
  await page.keyboard.press('s'); await expect(lesson).toHaveAttribute('data-step', '1');
  await page.keyboard.press('u'); await expect(lesson).toHaveAttribute('data-step', '2');
  await page.keyboard.press('d'); await expect(lesson).toHaveAttribute('data-step', '3');
  await page.keyboard.press('s');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/b7-tutorial-phone.png' });
  await page.keyboard.press('t'); await expect(lesson).toHaveAttribute('data-step', '4');
  await page.keyboard.press('t'); await expect(lesson).toHaveAttribute('data-step', '5');
  await page.keyboard.press('f'); await expect(page.locator('.workshop')).toHaveAttribute('data-phase', 'menu');
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
  await expect(page.getByTestId('pot-canvas')).toBeVisible();
  await page.keyboard.press('u');
  await page.keyboard.press('ArrowRight');
  await page.screenshot({ path: 'test-results/b4-pot.png' });
  await page.getByTestId('pot-canvas').dispatchEvent('webglcontextlost');
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

test('B2 loads the real model, starts a mirrored camera, and resizes', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  const start = page.getByRole('button', { name: 'Начать', exact: true });
  await expect(start).toBeEnabled({ timeout: 50_000 });
  await start.click();
  await expect(page.locator('.workshop')).toHaveAttribute('data-phase', 'calibrate', { timeout: 20_000 });
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
