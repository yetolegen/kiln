import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

test.use({ reducedMotion: 'reduce', locale: 'ru-RU' });
async function openWorkshop(page: Page) {
  await page.goto('/?dev=1&mock=1'); await expect(page.getByTestId('mock-badge')).toBeVisible();
  await page.keyboard.press('j'); await page.keyboard.press('h'); await page.mouse.move(0, 0);
}

async function reachable(page: Page) {
  const issues = await page.evaluate(() => {
    const errors: string[] = [];
    const buttons = [...document.querySelectorAll<HTMLButtonElement>('button')].filter(b =>
      !b.closest('[hidden], [inert]') && getComputedStyle(b).visibility !== 'hidden' && b.getClientRects().length);
    for (const b of buttons) {
      const r = b.getBoundingClientRect(), name = b.dataset.action ?? b.textContent;
      if (r.width < 44 || r.height < 44) errors.push(`${name}: target ${r.width}×${r.height}`);
      if (r.left < 0 || r.top < 0 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1) errors.push(`${name}: outside viewport`);
      if (!b.disabled && !b.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2))) errors.push(`${name}: covered`);
    }
    return errors;
  });
  expect(issues).toEqual([]);
}

for (const viewport of [{width:1440,height:900},{width:1366,height:768},{width:390,height:844},{width:430,height:932},{width:844,height:390}]) {
  test(`polish reachable controls at ${viewport.width}x${viewport.height}`, async ({ page }, info) => {
    await page.setViewportSize(viewport); await openWorkshop(page);
    for (const [key, phase] of [['3','menu'],['4','tutorial'],['5','studio'],['6','glaze'],['8','result'],['9','gallery']]) {
      await page.keyboard.press(key); await page.mouse.move(0,0);
      await expect(page.locator('.workshop')).toHaveAttribute('data-phase', phase);
      await reachable(page);
      await page.screenshot({path:info.outputPath(`${phase}.png`)});
    }
    await page.locator('[data-action="shelf-open-0"]').click(); await page.mouse.move(0,0);
    await reachable(page); await page.screenshot({path:info.outputPath('inspection.png')});
    await page.locator('[data-action="view-close"]').click();
    await page.keyboard.press('6'); await page.locator('[data-action="decoration"]').click();
    await reachable(page); await page.locator('[data-action="decor-add"]').click();
    await reachable(page); await page.screenshot({path:info.outputPath('decoration.png')});
    await page.locator('[data-action="decor-sphere"]').click();
    // wait for the preview to land on the wall, not a fixed time: slow renderers need more frames
    await page.mouse.move(viewport.width/2, viewport.height/2); await expect(page.locator('.decoration-editor')).toContainText('Место подходит'); await page.keyboard.press('q');
    await expect(page.locator('.decoration-editor h2')).toContainText('изменение'); await page.keyboard.press('q'); await page.mouse.move(0,0);
    await reachable(page); await page.screenshot({path:info.outputPath('decoration-edit.png')});
    await page.locator('[data-action="decor-cancel"]').click(); await page.locator('[data-action="decor-close"]').click();
    await page.keyboard.press('5'); await page.mouse.move(0,0); await page.keyboard.press('b');
    await expect(page.getByRole('dialog',{name:'Дно пробито'})).toBeVisible();
    await reachable(page); await page.screenshot({path:info.outputPath('damage.png')});
  });
}

test('polish dialogs isolate keyboard and mouse, explain damage and preserve recovery', async ({page}) => {
  await openWorkshop(page); await page.locator('[data-action="free"]').click(); await page.mouse.move(0,0);
  await expect(page.locator('.checkpoint-status')).toContainText('Точка не сохранена');
  await page.locator('[data-action="checkpoint-save"]').click(); await page.mouse.move(0,0);
  await expect(page.locator('.checkpoint-status')).toHaveAttribute('data-tone','success');
  await page.keyboard.press('b');
  const dialog = page.getByRole('dialog', {name:'Дно пробито'});
  await expect(dialog).toBeVisible(); await expect(dialog.locator('.work-modal__correction')).toContainText('безопасной отметки');
  await expect(page.locator('.hud__hint')).toBeHidden();
  for (let i=0;i<5;i++) { await page.keyboard.press('Tab'); expect(await dialog.evaluate(el=>el.contains(document.activeElement))).toBe(true); }
  await page.keyboard.press('Shift+Tab'); expect(await dialog.evaluate(el=>el.contains(document.activeElement))).toBe(true);
  await page.locator('[data-action="done"]').evaluate(el=>(el as HTMLButtonElement).click());
  await expect(page.locator('.workshop')).toHaveAttribute('data-phase','studio');
  const result = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze();
  expect(result.violations).toEqual([]);
  await page.locator('[data-action="modal-restore"]').click(); await page.mouse.move(0,0);
  await expect(dialog).toBeHidden(); await expect(page.locator('.checkpoint-status')).toContainText('сохранённой версии');
  await expect(page.locator('[data-action="done"]')).toBeEnabled();
  await page.locator('[data-action="done"]').click(); await page.mouse.move(0,0);
  await page.locator('[data-action="decor-handle-done"]').click(); await page.locator('[data-action="decor-close"]').click();
  await page.locator('[data-action="checkpoint-restore"]').click(); await page.locator('[data-action="modal-restore"]').click();
  await expect(page.locator('.workshop')).toHaveAttribute('data-phase','studio');
  await expect(page.locator('.checkpoint-status')).toContainText('сохранённой версии');
});

test('polish animated recovery does not activate beneath a stationary palm', async ({page}) => {
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto('/?dev=1&mock=1'); await expect(page.getByTestId('mock-badge')).toBeVisible();
  // Keep both mock palms: the resting support hand sits at the lower button's edge.
  await page.locator('[data-action="free"]').hover();
  await expect(page.locator('.workshop')).toHaveAttribute('data-phase','studio');
  await page.mouse.move(0,0); await page.keyboard.press('i'); await page.keyboard.press('e');
  await expect(page.locator('.hud__hint')).toContainText('слишком долго');
  await page.keyboard.press('e'); await page.keyboard.press('b');
  const dialog=page.getByRole('dialog',{name:'Дно пробито'});
  await expect(dialog).toBeVisible();
  await page.waitForTimeout(1600); // Beyond both the entrance and a complete dwell interval.
  await expect(dialog).toBeVisible();
  await expect(page.locator('.workshop')).toHaveAttribute('data-phase','studio');
  await page.keyboard.press('h'); await page.mouse.move(0,0); await page.waitForTimeout(130);
  await page.locator('[data-action="modal-restart"]').hover();
  await expect(dialog).toBeHidden();
  await expect(page.locator('.hud__hint')).not.toContainText('продавили');
});

test('polish result, collection, inspector and shared viewer accessibility', async ({page}) => {
  await openWorkshop(page); await page.keyboard.press('8'); await expect(page.locator('.result-summary')).toBeVisible();
  const scan = async () => { const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']).analyze(); expect(result.violations).toEqual([]); };
  await scan(); await page.locator('[data-action="gallery"]').click(); await page.mouse.move(0,0); await scan();
  await expect(page.locator('.gallery-card__glaze')).toContainText('Глазурь');
  await page.keyboard.press('j'); // Keep the resting support palm when the asynchronous share controls appear.
  await page.locator('[data-action="shelf-open-0"]').click(); await page.mouse.move(0,0); await scan();
  await page.locator('[data-action="view-share"]').click(); await page.mouse.move(0,0);
  await expect(page.locator('.share-url')).toHaveAttribute('href', /#pot=v1\./); await page.waitForTimeout(1600);
  await expect(page.locator('.share-panel')).toBeVisible();
  await expect(page.locator('.share-panel [role="status"]')).toContainText('Ссылка содержит форму'); await scan();
  const url=await page.locator('.share-url').getAttribute('href');
  await page.locator('[data-action="share-close"]').hover(); await expect(page.locator('.share-panel')).toBeHidden();
  await page.goto(url!); await expect(page.locator('.public-viewer')).toContainText('Камера выключена'); await scan(); await reachable(page);
});
