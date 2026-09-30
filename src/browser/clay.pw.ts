import { test, expect } from '@playwright/test';

test('clay surface visibly travels while the silhouette stays fixed and reduced motion stops it', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', message => {
    if (message.type() === 'error' || (message.type() === 'warning' && message.text().startsWith('THREE.'))) errors.push(message.text());
  });
  await page.goto('/?dev=1&mock=1');
  await page.locator('[data-action="free"]').click(); await page.mouse.move(0, 0);
  const canvas = page.getByTestId('pot-canvas'); await expect(canvas).toBeVisible();
  const sample = () => canvas.evaluate((source: HTMLCanvasElement) => new Promise<number[]>(resolve => requestAnimationFrame(() => {
    const copy = document.createElement('canvas'); copy.width = 48; copy.height = 48;
    const ctx = copy.getContext('2d')!;
    // Only the middle of the front wall: exclude wheel, silhouette, hands and UI.
    ctx.drawImage(source, source.width * .513, source.height * .605, source.width * .094, source.height * .12, 0, 0, 48, 48);
    resolve(Array.from(ctx.getImageData(0, 0, 48, 48).data));
  })));
  const moving = await sample();
  expect(moving.filter((_, i) => i % 4 === 3).every(v => v > 0)).toBe(true);
  const difference = (a: number[], b: number[]) => a.reduce((total, v, i) => total + (i % 4 === 3 ? 0 : Math.abs(v - b[i])), 0) / (a.length * .75);
  await page.screenshot({ path: 'test-results/clay-turn-a.png' });
  await expect.poll(async () => difference(moving, await sample())).toBeGreaterThan(4);
  await page.screenshot({ path: 'test-results/clay-turn-b.png' });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(canvas).toHaveAttribute('data-spinning', 'false');
  const stopped = await sample();
  for (let i = 0; i < 3; i++) expect(difference(stopped, await sample())).toBeLessThan(.1);
  await page.keyboard.press('i'); await page.keyboard.press('o'); await page.keyboard.press('Escape');
  await page.locator('[data-action="inspect"]').click();
  await page.screenshot({ path: 'test-results/clay-cavity.png' });
  await page.keyboard.press('Escape'); await page.keyboard.press('6');
  await page.locator('[data-action="glaze-jade"]').click();
  await page.screenshot({ path: 'test-results/clay-jade.png' });
  expect(errors).toEqual([]);
});
