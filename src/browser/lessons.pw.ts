import { expect, test, type Page } from '@playwright/test';

const completionTimeout = 10_000; // Includes the 2.5s success-message delay and palm dwell.

async function dwell(page: Page, id: string) {
  await page.mouse.move(0, 0); await page.waitForTimeout(350);
  const button = page.locator(`[data-action="${id}"]`), element = await button.elementHandle();
  await button.hover();
  await expect.poll(() => element!.evaluate(el => {
    const progress = parseFloat((el as HTMLElement).style.getPropertyValue('--dwell')) || 0;
    return {
      activated: !el.isConnected || !!el.closest('[hidden],[inert]') || getComputedStyle(el).visibility === 'hidden' ||
        progress >= 100 || (!el.closest('.work-modal') && !!document.querySelector('.work-modal:not([hidden])')),
      progress,
    };
  }), { message: `Palm activates ${id}`, timeout: 10_000 }).toMatchObject({ activated: true });
}
const modal = (page: Page) => page.locator('.work-modal:not(.share-panel)');
for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) test(`M6 lesson controls remain reachable at ${viewport.width}x${viewport.height}`, async ({ page }) => {
  await page.setViewportSize(viewport); await start(page, 'attachment');
  for (const id of ['decoration', 'tool-repeat', 'tool-skip', 'glaze-amber', 'inspect']) {
    const button = page.locator(`[data-action="${id}"]`);
    expect(await button.evaluate(el => {
      const r = el.getBoundingClientRect(), x = r.x + r.width / 2, y = r.y + r.height / 2;
      return r.x >= 0 && r.y >= 0 && r.right <= innerWidth && r.bottom <= innerHeight && el.contains(document.elementFromPoint(x, y));
    }), id).toBe(true);
  }
  await page.screenshot({ path: `test-results/final-lesson-${viewport.width}.png` });
  await dwell(page, 'decoration'); await expect(page.locator('.decoration-editor')).toBeVisible();
});
async function start(page: Page, module: string) {
  await page.goto('/?dev=1&mock=1'); await expect(page.getByTestId('mock-badge')).toBeVisible();
  await page.keyboard.press('j'); // Keep the fixed support palm from selecting unrelated controls.
  await page.keyboard.press('h');
  await dwell(page, 'new-lessons'); await dwell(page, `modal-lesson-${module}`);
  await expect(page.locator('.tool-lesson')).toHaveAttribute('data-module', module);
  await expect(modal(page)).toBeHidden();
}
async function place(page: Page, kind: string) {
  await dwell(page, 'decoration'); await dwell(page, kind === 'star' ? 'decor-stamp' : 'decor-add'); await dwell(page, `decor-${kind}`);
  // wait for the preview to land on the wall, not a fixed time: slow renderers need more frames
  await page.mouse.move(720, 450); await expect(page.locator('.decoration-editor')).toContainText('Место подходит'); await page.keyboard.press('q');
  await expect(page.locator('.decoration-editor h2')).toContainText('изменение'); await page.keyboard.press('q');
  await dwell(page, 'decor-apply');
}

test('M6 rotation lesson requires real drag, supports repeat then skip without success', async ({ page }) => {
  await start(page, 'rotation'); await dwell(page, 'inspect');
  await page.mouse.move(650, 350); await page.waitForTimeout(150); await page.keyboard.press('q');
  await expect(page.locator('.inspection')).toHaveAttribute('data-grab', 'dragging');
  await expect(modal(page)).toBeHidden(); // a pose without movement is insufficient
  await page.mouse.move(860, 430, { steps: 30 });
  await expect(modal(page)).toContainText('Вы справились', { timeout: completionTimeout }); await page.keyboard.press('q');
  await dwell(page, 'modal-again'); await expect(page.locator('.inspection')).toBeHidden();
  await expect(page.locator('.tool-lesson')).toHaveAttribute('data-complete', 'false');
  await dwell(page, 'tool-skip'); await expect(page.locator('.workshop')).toHaveAttribute('data-phase', 'menu');
  await expect(modal(page)).toBeHidden();
});

test('M6 attachment lesson requires committed addition then deletion; cancelled edits do not pass', async ({ page }) => {
  test.setTimeout(100000); await start(page, 'attachment'); await place(page, 'cylinder');
  await expect(modal(page)).toBeHidden(); await dwell(page, 'decor-list'); await dwell(page, 'decor-select-0');
  await dwell(page, 'decor-longer'); await dwell(page, 'decor-cancel');
  await expect(page.locator('[data-action="decor-list"]')).toContainText('1');
  await dwell(page, 'decor-list'); await dwell(page, 'decor-select-0'); await dwell(page, 'decor-delete');
  await expect(modal(page)).toContainText('Вы справились', { timeout: completionTimeout }); await dwell(page, 'modal-menu');
  await expect(page.locator('.decoration-editor')).toBeHidden();
  expect(await page.evaluate(() => localStorage.getItem('kiln.gallery.v1'))).toBeNull();
});

test('M6 stamp and glaze require both results; sharing lesson fires into an isolated shelf', async ({ page }) => {
  test.setTimeout(120000); await start(page, 'stamp'); await place(page, 'star');
  await expect(modal(page)).toBeHidden(); await dwell(page, 'decor-close'); await dwell(page, 'glaze-jade');
  await expect(modal(page)).toContainText('Вы справились', { timeout: completionTimeout }); await dwell(page, 'modal-next');
  await dwell(page, 'modal-lesson-sharing'); await dwell(page, 'glaze-amber'); await dwell(page, 'fire');
  await expect(page.locator('.workshop')).toHaveAttribute('data-phase', 'firing');
  await expect(page.locator('[data-action="tool-skip"]')).toBeDisabled();
  await expect(page.locator('.workshop')).toHaveAttribute('data-phase', 'result', { timeout: 10000 });
  await dwell(page, 'gallery'); await dwell(page, 'shelf-open-0'); await expect(modal(page)).toBeHidden();
  await dwell(page, 'view-share'); await expect(page.locator('.share-url')).toHaveAttribute('href', /#pot=v1\./);
  await dwell(page, 'share-close'); await expect(modal(page)).toContainText('Вы справились', { timeout: completionTimeout }); await dwell(page, 'modal-menu');
  expect(await page.evaluate(() => localStorage.getItem('kiln.gallery.v1'))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('kiln.checkpoint.v1'))).toBeNull();
});

test('M6 Продолжить здесь keeps the completed lesson and decoration tools usable', async ({ page }) => {
  test.setTimeout(120_000);
  await start(page, 'stamp'); await place(page, 'star');
  await dwell(page, 'decor-close'); await dwell(page, 'glaze-jade');
  await expect(page.locator('.tool-lesson')).toHaveAttribute('data-complete', 'true');
  await expect(modal(page)).toContainText('Вы справились', { timeout: completionTimeout });
  await expect(page.locator('[data-action="modal-stay"]')).toHaveText('Продолжить здесь');
  await dwell(page, 'modal-stay');
  await expect(modal(page)).toBeHidden();
  await expect(page.locator('.tool-lesson')).toBeVisible();
  await expect(page.locator('.tool-lesson')).toHaveAttribute('data-module', 'stamp');
  await expect(page.locator('.tool-lesson')).toHaveAttribute('data-complete', 'true');
  await expect(page.locator('.workshop')).toHaveAttribute('data-phase', 'glaze');

  // Commit both kinds of decoration after staying; enabled buttons alone are insufficient.
  await place(page, 'cylinder');
  await expect(page.locator('[data-action="decor-list"]')).toContainText('2');
  await dwell(page, 'decor-close'); await place(page, 'star');
  await expect(page.locator('[data-action="decor-list"]')).toContainText('3');
  await dwell(page, 'decor-close');
  await expect(page.locator('.tool-lesson')).toBeVisible();
  await expect(modal(page)).toBeHidden();
});
