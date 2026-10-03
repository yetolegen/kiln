import { expect, test } from '@playwright/test';
import { encodeShare } from './shareCodec';
import { createClay } from '../engine/clay';
import { emptyCustomization } from '../engine/customization';
import { continueWithoutHandles } from './handleTestFlow';

test('M1 palm checkpoint replacement, isolated damage dialog and restore', async ({ page }) => {
  await page.goto('/?dev=1&mock=1'); await expect(page.getByTestId('mock-badge')).toBeVisible(); await page.keyboard.press('h');
  await page.locator('[data-action="free"]').hover();
  await expect(page.locator('.workshop')).toHaveAttribute('data-phase', 'studio');
  await page.locator('[data-action="checkpoint-save"]').hover();
  await expect(page.locator('.checkpoint-status')).toContainText('Точка сохранена');
  await page.mouse.move(0, 0); await page.keyboard.press('s');
  await expect(page.locator('[data-action="checkpoint-save"]')).toBeDisabled();
  await page.keyboard.press('Escape'); await page.keyboard.press('h');
  await expect(page.locator('[data-action="checkpoint-save"]')).toBeEnabled();
  await page.locator('[data-action="checkpoint-save"]').hover();
  await expect(page.locator('.work-modal:not(.share-panel)')).toContainText('Заменить контрольную точку');
  await page.mouse.move(0, 0); await page.locator('[data-action="modal-cancel"]').hover();
  await expect(page.locator('.work-modal:not(.share-panel)')).toBeHidden();
  await page.mouse.move(0, 0); await page.keyboard.press('b');
  await expect(page.locator('.work-modal:not(.share-panel)')).toContainText('Дно пробито');
  await page.locator('[data-action="done"]').evaluate(el => (el as HTMLButtonElement).click());
  await expect(page.locator('.workshop')).toHaveAttribute('data-phase', 'studio');
  await page.mouse.move(0, 0); await page.waitForTimeout(120); // deliver a fresh neutral camera observation
  await page.locator('[data-action="modal-restore"]').hover();
  await expect(page.locator('.work-modal:not(.share-panel)')).toBeHidden();
  await expect(page.locator('.checkpoint-status')).toContainText('Точка восстановлена');
  await page.screenshot({ path: 'test-results/final-m1-recovery.png' });
});

test('M6 recovery lesson keeps personal checkpoint and shelf isolated and requires damage plus restore', async ({ page }) => {
  test.setTimeout(90000);
  await page.goto('/?dev=1&mock=1'); await expect(page.getByTestId('mock-badge')).toBeVisible(); await page.keyboard.press('h');
  await page.locator('[data-action="free"]').hover(); await page.locator('[data-action="checkpoint-save"]').hover();
  await expect(page.locator('.checkpoint-status')).toContainText('Точка сохранена');
  const personal = await page.evaluate(() => localStorage.getItem('kiln.checkpoint.v1'));
  await page.locator('[data-action="menu"]').hover(); await page.locator('[data-action="new-lessons"]').hover();
  await expect(page.locator('.work-modal:not(.share-panel)')).toContainText('Уроки новых возможностей');
  await page.mouse.move(0, 0); await page.waitForTimeout(350); await page.locator('[data-action="modal-lesson-recovery"]').hover();
  await expect(page.locator('.tool-lesson')).toHaveAttribute('data-module', 'recovery');
  await page.mouse.move(0, 0); await page.waitForTimeout(350); await page.locator('[data-action="checkpoint-save"]').hover();
  await expect(page.locator('.checkpoint-status')).toContainText('до закрытия страницы');
  await page.mouse.move(0, 0); await page.keyboard.press('n'); await expect(page.locator('.work-modal:not(.share-panel)')).toContainText('Сосуд сплющен');
  await page.mouse.move(0, 0); await page.waitForTimeout(350); await page.locator('[data-action="modal-restore"]').hover();
  await expect(page.locator('.work-modal:not(.share-panel)')).toContainText('Вы справились с обучением');
  expect(await page.evaluate(() => localStorage.getItem('kiln.checkpoint.v1'))).toBe(personal);
  expect(await page.evaluate(() => localStorage.getItem('kiln.gallery.v1'))).toBeNull();
  await page.screenshot({ path: 'test-results/final-m6-lesson.png' });
  await page.mouse.move(0, 0); await page.waitForTimeout(350); await page.locator('[data-action="modal-menu"]').hover();
  await expect(page.locator('.workshop')).toHaveAttribute('data-phase', 'menu');
});

test('M5 share opens a separate camera-free viewer; denial and invalid links leave usable controls', async ({ page, browser }) => {
  await page.addInitScript(() => { Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => { throw new DOMException('denied', 'NotAllowedError'); } } }); });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/?dev=1&mock=1'); await expect(page.getByTestId('mock-badge')).toBeVisible(); await page.keyboard.press('h'); await page.keyboard.press('8');
  await page.locator('[data-action="result-share"]').hover();
  await expect(page.locator('.share-url')).toHaveAttribute('href', /#pot=v1\./);
  const url = await page.locator('.share-url').getAttribute('href');
  await page.mouse.move(0, 0); await page.waitForTimeout(350); await page.locator('[data-action="share-copy"]').hover();
  await expect(page.locator('.share-panel')).toContainText('Браузер не разрешил копирование');
  await page.mouse.move(0, 0); await page.waitForTimeout(350); await page.locator('[data-action="share-close"]').hover();
  await expect(page.locator('.share-panel')).toBeHidden();
  const recipientContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const recipient = await recipientContext.newPage(); const models: string[] = [];
  recipient.on('pageerror', e => errors.push(e.message));
  recipient.on('request', r => { if (/handTracker|hand_landmarker|mediapipe/.test(r.url())) models.push(r.url()); });
  await recipient.addInitScript(() => {
    (window as typeof window & { cameraCalls: number }).cameraCalls = 0;
    navigator.mediaDevices.getUserMedia = async () => { (window as typeof window & { cameraCalls: number }).cameraCalls++; throw new DOMException('denied', 'NotAllowedError'); };
  });
  await recipient.goto(url!);
  await expect(recipient.locator('.public-viewer')).toContainText('Камера выключена');
  expect(await recipient.evaluate(() => localStorage.getItem('kiln.gallery.v1'))).toBeNull();
  expect(models).toEqual([]); expect(await recipient.evaluate(() => (window as typeof window & { cameraCalls: number }).cameraCalls)).toBe(0);
  const view = recipient.getByTestId('pot-canvas'); await expect(view).toHaveAttribute('data-view', /,/);
  const before = await view.getAttribute('data-view'); await recipient.locator('[data-action="public-bottom"]').click();
  await expect(view).not.toHaveAttribute('data-view', before!);
  await recipient.route('**/src/tracking/handTracker.ts', route => route.fulfill({ contentType: 'application/javascript', body: 'export class HandTracker { static async create() { return { close() {} }; } }' }));
  await recipient.locator('[data-action="public-hands"]').click(); await expect(recipient.locator('.public-viewer')).toContainText('Камера недоступна');
  await expect(recipient.locator('[data-action="public-reset"]')).toBeEnabled();
  await recipient.screenshot({ path: 'test-results/final-m5-shared.png' });
  const invalid = await recipientContext.newPage(); await invalid.goto('/#pot=v99.abc'); await expect(invalid.locator('h1')).toHaveText('Не удалось открыть сосуд', { timeout: 15000 });
  await expect(invalid.getByRole('button', { name: 'В мастерскую' })).toBeVisible(); expect(errors).toEqual([]);
  await recipient.goto('/#pot=v99.abc'); await expect(recipient.locator('h1')).toHaveText('Не удалось открыть сосуд', { timeout: 15000 });
  await recipientContext.close();
});

test('M5 a decorated bounded link displays without visiting the workshop or touching the shelf', async ({ page }) => {
  const unexpected: string[] = [];
  page.on('request', r => { if (/hand_landmarker|mediapipe|handTracker/.test(r.url())) unexpected.push(r.url()); });
  page.on('pageerror', e => unexpected.push(e.message));
  await page.addInitScript(() => {
    // Windows WebKit may not expose mediaDevices. The camera-free route must work
    // there too, so install the same rejecting probe without assuming the API exists.
    const media = navigator.mediaDevices ?? {};
    Object.defineProperty(media, 'getUserMedia', { configurable: true, value: async () => {
      document.documentElement.dataset.cameraRequested = 'true';
      throw new Error('Viewer must not request a camera');
    } });
    if (!navigator.mediaDevices) Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: media });
  });
  const customization = emptyCustomization();
  customization.attachments.push({ id: 'a', kind: 'cone', anchor: { point: { x: 0, y: .6, z: 1 }, normal: { x: 0, y: 0, z: 1 } }, length: .3, width: .2, rotation: .2, tilt: .1, material: 'chalk' });
  const hash = await encodeShare({ clay: createClay(), glazeId: 'cobalt', customization });
  await page.goto('/' + hash); await expect(page.locator('.public-viewer h2')).toContainText('сосуд по ссылке', { timeout: 15000 });
  await expect(page.getByTestId('pot-canvas')).toBeVisible();
  expect(unexpected).toEqual([]);
  expect(await page.locator('html').getAttribute('data-camera-requested')).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('kiln.gallery.v1'))).toBeNull();
  const canvas = page.getByTestId('pot-canvas');
  await expect(canvas).toHaveAttribute('data-view', /,/);
  const desktopZ = Number((await canvas.getAttribute('data-view'))!.split(',')[2]);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(async () => Number((await canvas.getAttribute('data-view'))!.split(',')[2])).toBeCloseTo(desktopZ / (390 / 844), 1);
  await page.screenshot({ path: 'test-results/final-m5-phone.png' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect.poll(async () => Number((await canvas.getAttribute('data-view'))!.split(',')[2])).toBeCloseTo(desktopZ, 1);
  await page.getByTestId('pot-canvas').dispatchEvent('webglcontextlost');
  await expect(page.locator('.public-viewer')).toContainText('3D недоступно'); await expect(page.getByTestId('pot-fallback')).toBeVisible();
  await expect(page.locator('[data-action="public-top"]')).toBeDisabled();
});

test('M3 M4 places an attachment and stamp by hand, finalizes once and round-trips customization', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/?dev=1&mock=1'); await expect(page.getByTestId('mock-badge')).toBeVisible(); await page.keyboard.press('h');
  await page.locator('[data-action="free"]').hover(); await page.locator('[data-action="done"]').hover();
  await expect(page.locator('.workshop')).toHaveAttribute('data-phase', 'glaze');
  await continueWithoutHandles(page);
  await page.locator('[data-action="decoration"]').hover();
  await expect(page.locator('.decoration-editor')).toBeVisible();
  const choose = async (id: string) => {
    await page.mouse.move(0, 0); await page.waitForTimeout(350);
    const button = page.locator(`[data-action="decor-${id}"]`), element = await button.elementHandle(); await button.hover();
    await expect.poll(() => element!.evaluate(el => !el.isConnected || parseFloat((el as HTMLElement).style.getPropertyValue('--dwell')) >= 100)).toBe(true);
  };
  await choose('add'); await choose('sphere');
  await page.mouse.move(720, 450); await page.waitForTimeout(650); await page.keyboard.press('q');
  await expect(page.locator('.decoration-editor')).toHaveAttribute('data-grab', /dragging|idle/);
  await expect(page.locator('.decoration-editor h2')).toContainText('изменение');
  await page.keyboard.press('q'); await choose('longer'); await choose('apply');
  await expect(page.locator('[data-action="decor-list"]')).toContainText('1');
  await choose('stamp'); await choose('star');
  await page.mouse.move(755, 450); await page.waitForTimeout(650); await page.keyboard.press('q');
  await expect(page.locator('.decoration-editor h2')).toContainText('изменение');
  await page.keyboard.press('q'); await choose('color'); await choose('apply');
  await expect(page.locator('[data-action="decor-list"]')).toContainText('2');
  await page.screenshot({ path: 'test-results/final-m3-decoration.png' });
  await choose('close'); await expect(page.locator('.decoration-editor')).toBeHidden();
  await page.mouse.move(0, 0); await page.waitForTimeout(350); await page.locator('[data-action="glazepage-next"]').hover();
  await expect(page.locator('[data-action="glaze-cobalt"]')).toBeVisible();
  await page.mouse.move(0, 0); await page.waitForTimeout(350);
  await page.locator('[data-action="glaze-cobalt"]').hover();
  await expect(page.locator('[data-action="glaze-cobalt"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-action="fire"]').hover(); await expect(page.locator('.workshop')).toHaveAttribute('data-phase', 'result', { timeout: 10000 });
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('kiln.gallery.v1')!).pots);
  expect(stored).toHaveLength(1); expect(stored[0].schemaVersion).toBe(4); expect(stored[0].glazeId).toBe('cobalt');
  expect(stored[0].customization.attachments).toHaveLength(1); expect(stored[0].customization.stamps).toHaveLength(1);
  expect(stored[0].customization.attachments[0].length).toBe(.34);
  await page.reload(); await expect(page.getByTestId('mock-badge')).toBeVisible(); await page.keyboard.press('h');
  await page.locator('[data-action="gallery"]').hover(); await page.locator('[data-action="shelf-open-0"]').hover();
  await expect(page.locator('.inspection h2')).toContainText('с полки');
  const savedView = await page.getByTestId('pot-canvas').getAttribute('data-view');
  const savedGallery = await page.evaluate(() => localStorage.getItem('kiln.gallery.v1'));
  const download = page.waitForEvent('download');
  await page.mouse.move(0, 0); await page.waitForTimeout(350); await page.locator('[data-action="view-download"]').hover();
  const png = await download; await png.saveAs('test-results/final-decorated.png');
  expect(await page.getByTestId('pot-canvas').getAttribute('data-view')).toBe(savedView);
  expect(await page.evaluate(() => localStorage.getItem('kiln.gallery.v1'))).toBe(savedGallery);
  await page.screenshot({ path: 'test-results/final-m4-reopened.png' }); expect(errors).toEqual([]);
});

test('M2 hand pinch drag rotates continuously; shelf viewer leaves the stored work unchanged', async ({ page }) => {
  await page.goto('/?dev=1&mock=1'); await expect(page.getByTestId('mock-badge')).toBeVisible(); await page.keyboard.press('h');
  await page.locator('[data-action="free"]').hover();
  await page.locator('[data-action="inspect"]').hover();
  await expect(page.locator('.inspection')).toBeVisible();
  await page.mouse.move(700, 330); await page.waitForTimeout(150);
  const canvas = page.getByTestId('pot-canvas'); await expect(canvas).toHaveAttribute('data-view', /,/); const before = await canvas.getAttribute('data-view');
  await page.keyboard.press('q'); await expect(page.locator('.inspection')).toHaveAttribute('data-grab', 'dragging');
  await page.mouse.move(820, 390, { steps: 15 });
  await expect(canvas).not.toHaveAttribute('data-view', before!);
  await page.keyboard.press('q'); await page.mouse.move(0, 0); await page.waitForTimeout(150);
  await page.locator('[data-action="view-close"]').hover();
  await expect(page.locator('.inspection')).toBeHidden();
  await page.keyboard.press('8'); await expect(page.locator('.workshop')).toHaveAttribute('data-phase', 'result');
  await page.locator('[data-action="gallery"]').hover();
  const saved = await page.evaluate(() => localStorage.getItem('kiln.gallery.v1'));
  await page.locator('[data-action="shelf-open-0"]').hover();
  await expect(page.locator('.inspection h2')).toContainText('с полки');
  await page.mouse.move(0, 0); await page.waitForTimeout(150);
  await page.locator('[data-action="view-bottom"]').hover();
  await page.screenshot({ path: 'test-results/final-m2-shelf.png' });
  await page.mouse.move(0, 0); await page.waitForTimeout(150);
  await page.locator('[data-action="view-close"]').hover();
  await expect(page.locator('.workshop')).toHaveAttribute('data-phase', 'gallery');
  expect(await page.evaluate(() => localStorage.getItem('kiln.gallery.v1'))).toBe(saved);
});

test('a share link pasted into a tab that already has the workshop open opens the viewer', async ({ page }) => {
  const hash = await encodeShare({ clay: createClay(), glazeId: 'jade', customization: emptyCustomization() });
  await page.goto('/?dev=1&mock=1'); await expect(page.getByTestId('mock-badge')).toBeVisible();
  await page.evaluate((h) => { location.hash = h; }, hash);
  await expect(page.locator('.public-viewer h2')).toContainText('сосуд по ссылке', { timeout: 15000 });
});
