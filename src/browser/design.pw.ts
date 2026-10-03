import { test, expect } from '@playwright/test';

test('V8 studio inspection rotates freely and restores the shaping view', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/?dev=1&mock=1');
  await page.locator('[data-action="free"]').click(); await page.mouse.move(0, 0);
  await page.keyboard.press('i'); await page.keyboard.press('o'); await page.keyboard.press('Escape');
  const inspect = page.locator('[data-action="inspect"]'); await expect(inspect).toBeEnabled();
  await inspect.click();
  await expect(page.locator('.inspection')).toBeVisible();
  const canvas = page.getByTestId('pot-canvas');
  await expect(canvas).toHaveAttribute('data-spinning', 'false');
  const initial = await canvas.getAttribute('data-view');
  const surface = page.locator('.inspection .inspection__surface'); const box = (await surface.boundingBox())!;
  await page.mouse.move(box.x + box.width * .5, box.y + box.height * .5);
  await page.mouse.down(); await page.mouse.move(box.x + box.width * .8, box.y + box.height * .25, { steps: 15 }); await page.mouse.up();
  await expect.poll(() => canvas.getAttribute('data-view')).not.toBe(initial);
  await page.locator('[data-action="view-bottom"]').click(); await page.mouse.move(0, 0);
  await expect.poll(async () => Number((await canvas.getAttribute('data-view'))!.split(',')[1])).toBeLessThan(0);
  await page.screenshot({ path: 'test-results/v8-inspection-bottom.png' });
  await page.locator('[data-action="view-reset"]').click();
  await expect(canvas).toHaveAttribute('data-view', initial!);
  await page.keyboard.press('Escape');
  await expect(page.locator('.inspection')).toBeHidden();
  await expect(inspect).toBeEnabled();
  await page.keyboard.press('s');
  await expect(inspect).toBeDisabled(); await expect(inspect).toBeHidden();
  await expect.poll(async () => Number(await canvas.getAttribute('data-particles'))).toBeGreaterThan(0);
  await page.keyboard.press('Escape'); await expect(inspect).toBeEnabled();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(canvas).toHaveAttribute('data-spinning', 'false');
  await expect(canvas).toHaveAttribute('data-particles', '0');
  expect(errors).toEqual([]);
});

test('V8 workshop layout keeps the tablet lesson beside the clay and captures all modes', async ({ page }) => {
  await page.goto('/?dev=1&mock=1'); await expect(page.getByTestId('mock-badge')).toBeVisible(); await page.mouse.move(0, 0);
  await page.screenshot({ path: 'test-results/v8-menu.png' });
  for (const [key, name] of [['4', 'lesson'], ['5', 'studio'], ['6', 'glaze'], ['8', 'result'], ['9', 'gallery']]) {
    await page.keyboard.press(key); await page.mouse.move(0, 0);
    await page.screenshot({ path: `test-results/v8-${name}.png` });
  }
  await page.setViewportSize({ width: 800, height: 900 }); await page.keyboard.press('4');
  const card = (await page.locator('.tutorial-card').boundingBox())!;
  expect(card.x + card.width).toBeLessThan(800 * .66 - 1.6 * Math.min(800 / 5, 900 * .48 / 3.2));
  await page.screenshot({ path: 'test-results/v8-tablet-lesson.png' });
});

test('V8 inspecting glaze and results preserves controls and selection across reentry', async ({ page }) => {
  await page.goto('/?dev=1&mock=1');
  await expect(page.getByTestId('mock-badge')).toBeVisible();
  // click-driven test: drop the fixed support palm and park the controlled one, so neither dwells on paper-layout buttons
  await page.keyboard.press('j'); await page.keyboard.press('h');
  await page.keyboard.press('6'); await page.mouse.move(0, 0);
  const jars = page.locator('.glaze-jar'); await expect(jars).toHaveCount(3);
  await jars.nth(1).click();
  for (let i = 0; i < 2; i++) {
    await page.locator('[data-action="inspect"]').click();
    await expect(page.locator('.inspection button')).toHaveCount(10);
    await page.locator('[data-action="view-close"]').click();
    await expect(jars).toHaveCount(3); await expect(jars.nth(1)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-action="fire"]')).toHaveCount(1);
  }
  // A phase transition while the inspector is open must clear the previous modal controls.
  await page.locator('[data-action="inspect"]').click(); await page.keyboard.press('8');
  await expect(page.locator('.inspection')).toBeHidden();
  await expect(page.locator('.result-summary')).toHaveCount(1);
  await page.locator('[data-action="inspect"]').click();
  await expect(page.locator('.inspection button')).toHaveCount(10);
  await page.keyboard.press('Escape');
  await expect(page.locator('.result-summary')).toHaveCount(1);
  await expect(page.locator('[data-action="download"]')).toHaveCount(1);
});

test('V8 phone touch drag and pinch change the view; rim rupture remains visible', async ({ browser, browserName, baseURL }) => {
  test.skip(browserName !== 'chromium', 'CDP provides real touch input for this test.');
  const context = await browser.newContext({ baseURL, hasTouch: true, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  try {
    await page.goto('/?dev=1&mock=1'); await expect(page.getByTestId('mock-badge')).toBeVisible(); await page.keyboard.press('5');
    for (const key of ['i', 'o', 'o', 't', 'Escape']) await page.keyboard.press(key);
    await page.locator('[data-action="inspect"]').tap();
    const canvas = page.getByTestId('pot-canvas');
    const initial = await canvas.getAttribute('data-view');
    const touch = await context.newCDPSession(page);
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 160, y: 330 }] });
    await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 260, y: 380 }] });
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect.poll(() => canvas.getAttribute('data-view')).not.toBe(initial);
    const dragged = await canvas.getAttribute('data-view');
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 140, y: 360 }, { x: 240, y: 360 }] });
    await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 100, y: 360 }, { x: 280, y: 360 }] });
    await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect.poll(() => canvas.getAttribute('data-view')).not.toBe(dragged);
    await page.locator('[data-action="view-top"]').tap();
    await page.locator('[data-action="view-reset"]').tap();
    await page.screenshot({ path: 'test-results/v8-phone-tear-inspection.png' });
    await page.locator('[data-action="view-close"]').tap();
    await expect(page.locator('.inspection')).toBeHidden();
  } finally { await context.close(); }
});
