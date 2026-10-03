import { expect, type Page } from '@playwright/test';

/** Navigate the new optional step using the same fixture palm as the existing regression. */
export async function continueWithoutHandles(page: Page) {
  for (const id of ['decor-handle-done', 'decor-close']) {
    await page.mouse.move(0, 0); await page.waitForTimeout(350);
    const button = page.locator(`[data-action="${id}"]`);
    await expect(button).toBeVisible(); const element = await button.elementHandle(); await button.hover();
    await expect.poll(() => element!.evaluate(el => !el.isConnected)).toBe(true);
  }
  await expect(page.locator('.decoration-editor')).toBeHidden();
  await page.mouse.move(0, 0); await page.waitForTimeout(350);
}
