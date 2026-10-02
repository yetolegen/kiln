import { test, expect } from '@playwright/test';

test('V9 workshop artwork, parchment lesson and damage restart stay readable', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?dev=1&mock=1');
  await expect(page.getByTestId('mock-badge')).toBeVisible();
  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    const art = new Image(); art.onload = () => resolve(); art.onerror = () => reject(new Error('Workshop artwork missing')); art.src = '/workshop-dusk.png';
  }));
  await expect(page.locator('.camera-viewport')).toHaveCSS('background-image', /workshop-dusk\.png/);
  await expect(page.locator('.phase-actions > .dwell-button .action-icon')).toHaveCount(4);
  await page.mouse.move(0, 0); await page.screenshot({ path: 'test-results/v9-menu.png' });
  await page.locator('[data-action="tutorial"]').click(); await page.mouse.move(0, 0);
  await expect(page.locator('.tutorial-card')).toBeVisible();
  await page.screenshot({ path: 'test-results/v9-lesson.png' });
  await page.keyboard.press('b');
  await expect(page.locator('.hud__hint')).toContainText('Глина испортилась, начните заново');
  await page.screenshot({ path: 'test-results/v9-lesson-damaged.png' });
  await page.locator('[data-action="modal-menu"]').click(); await page.locator('[data-action="free"]').click(); await page.mouse.move(0, 0);
  for (const [key, cause] of [['b', 'продавили дно'], ['n', 'лепёшку'], ['c', 'осела'], ['t', 'разрывы']] as const) {
    await page.keyboard.press(key); await page.keyboard.press('Escape');
    const banner = page.locator('.hud__hint');
    await expect(banner).toContainText('Глина испортилась, начните заново');
    await expect(banner).toContainText(cause); await expect(banner).toHaveAttribute('role', 'alert');
    await page.keyboard.press('x'); // Tracking failure must not hide already damaged geometry.
    await expect(banner).toContainText('Глина испортилась, начните заново');
    await page.keyboard.press('x');
    await page.screenshot({ path: `test-results/v9-damage-${key}.png` });
    await page.locator(key === 'b' || key === 'n' ? '[data-action="modal-restart"]' : '[data-action="restart"]').click(); await page.mouse.move(0, 0);
    await expect(banner).not.toContainText('Глина испортилась');
    await expect(page.locator('.workshop')).toHaveAttribute('data-damaged', 'false');
  }
  for (const viewport of [{ width: 800, height: 900 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport); await page.keyboard.press('n');
    const banner = (await page.locator('.hud__hint').boundingBox())!;
    expect(banner.x).toBeGreaterThanOrEqual(0); expect(banner.y).toBeGreaterThanOrEqual(0);
    expect(banner.x + banner.width).toBeLessThanOrEqual(viewport.width);
    const retry = (await page.locator('[data-action="modal-restart"]').boundingBox())!;
    expect(retry.y + retry.height).toBeLessThanOrEqual(viewport.height);
    await page.screenshot({ path: `test-results/v9-damage-${viewport.width}.png` });
    await page.locator('[data-action="modal-restart"]').click();
  }
  expect(errors).toEqual([]);
});
