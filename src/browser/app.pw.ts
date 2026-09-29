import { test, expect } from '@playwright/test';

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
