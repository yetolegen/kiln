import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5174', '--strictPort'], { cwd: root, windowsHide: true, stdio: 'ignore' });
let browser;
try {
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch('http://127.0.0.1:5174')).ok) break; } catch { /* Starting the owned dev server. */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  await mkdir(new URL('../../test-results/demo/', import.meta.url), { recursive: true });
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 960, height: 720 }, deviceScaleFactor: 1 });
  await page.goto('http://127.0.0.1:5174/?dev=1&mock=1');
  await page.getByTestId('mock-badge').waitFor();
  await page.getByTestId('mock-badge').evaluate((element) => { element.textContent = 'DEVELOPMENT PREVIEW · SYNTHETIC INPUT · Not a real-hand recording'; });
  let frame = 0;
  const capture = async () => { await page.waitForTimeout(200); await page.screenshot({ path: fileURLToPath(new URL(`../../test-results/demo/${String(frame++).padStart(2, '0')}.png`, import.meta.url)) }); };
  await capture();
  await page.locator('[data-action="commission"]').click(); await page.mouse.move(0, 0); await capture();
  await page.keyboard.press('s'); await page.keyboard.press('ArrowLeft'); await capture();
  await page.keyboard.press('u'); await capture();
  await page.keyboard.press('u'); await capture();
  await page.keyboard.press('w'); await capture();
  await page.keyboard.press('w'); await page.keyboard.press('f'); await capture();
  await page.locator('[data-action="glaze-jade"]').click(); await page.mouse.move(0, 0); await capture();
  await page.locator('[data-action="fire"]').click(); await page.mouse.move(0, 0);
  for (let i = 0; i < 4; i++) { await page.waitForTimeout(700); await capture(); }
  await page.locator('.result-summary').waitFor(); await capture(); await capture();
  await page.locator('[data-action="gallery"]').click(); await capture();
  console.log(`Captured ${frame} labelled development frames.`);
} finally { await browser?.close(); server.kill(); }
