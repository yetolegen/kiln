import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type TestInfo } from '@playwright/test';

// UI-only fixtures: no engine imports, landmark injection, physics assertions or
// persistent records. Existing browser suites retain responsibility for gestures.
test.use({ reducedMotion: 'reduce', locale: 'ru-RU', timezoneId: 'UTC' });

async function checkAccessibility(page: Page, info: TestInfo) {
  await page.evaluate(() => document.fonts.ready);
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  await info.attach('accessibility', { body: JSON.stringify(result, null, 2), contentType: 'application/json' });
  expect.soft(result.violations.map(({ id, impact, help, nodes }) => ({
    id, impact, help, nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })),
  })), 'No automatically detected WCAG A/AA violations').toEqual([]);
}

async function checkScreenshot(page: Page, name: string) {
  await page.mouse.move(0, 0);
  await expect(page).toHaveScreenshot(`${name}.png`, {
    animations: 'disabled', caret: 'hide', scale: 'css', maxDiffPixels: 100,
    // Snapshot the frontend layout, artwork, instructions and controls. These
    // surfaces are covered by separate render/gesture tests and vary by GPU/time.
    // This styling applies only to screenshot capture, never to the axe scan.
    stylePath: `${test.info().project.testDir}/frontend.screenshot.css`,
  });
}

const screens = ['menu', 'lesson', 'damage', 'glaze', 'decoration', 'invalid-share'] as const;
for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test.describe(`frontend ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport });
    for (const screen of screens) test(`${screen}: accessibility and visual baseline`, async ({ page }, info) => {
      if (screen === 'invalid-share') {
        await page.goto('/#pot=v99.abc');
        await expect(page.getByRole('heading', { name: 'Не удалось открыть сосуд' })).toBeVisible();
      } else {
        await page.goto('/?dev=1&mock=1');
        await expect(page.getByTestId('mock-badge')).toBeVisible();
        // One neutral fixture hand avoids a stationary support palm selecting UI.
        await page.keyboard.press('j'); await page.keyboard.press('h'); await page.mouse.move(0, 0);
        if (screen === 'lesson') {
          await page.locator('[data-action="tutorial"]').click();
          await expect(page.locator('.tutorial-card')).toBeVisible();
        } else if (screen === 'damage') {
          await page.locator('[data-action="free"]').click(); await page.mouse.move(0, 0);
          await page.keyboard.press('b');
          const dialog = page.getByRole('dialog', { name: 'Дно пробито' });
          await expect(dialog).toBeVisible(); await expect(dialog).toContainText('Дно пробито');
        } else if (screen === 'glaze' || screen === 'decoration') {
          await page.keyboard.press('6'); await expect(page.locator('.glaze-jar')).toHaveCount(3);
          if (screen === 'decoration') {
            await page.locator('[data-action="decoration"]').click();
            await page.locator('[data-action="decor-add"]').click();
            await expect(page.getByRole('heading', { name: 'Выберите объёмную деталь' })).toBeVisible();
          }
        }
        await page.mouse.move(0, 0);
        await page.evaluate(() => new Promise<void>((resolve, reject) => {
          const art = new Image(); art.onload = () => resolve(); art.onerror = () => reject(new Error('Workshop artwork missing'));
          art.src = '/workshop-dusk.png';
        }));
      }
      await checkAccessibility(page, info);
      await checkScreenshot(page, `${screen}-${viewport.width}x${viewport.height}`);
    });
  });
}
