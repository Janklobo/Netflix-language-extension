import { test, expect, chromium } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

test('options page loads successfully', async () => {
  const extensionPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../dist');

  // Extensions only run in headful Chromium mode
  const browserContext = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });

  let [background] = browserContext.serviceWorkers();
  if (!background) {
    background = await browserContext.waitForEvent('serviceworker');
  }

  const extensionId = background.url().split('/')[2];
  expect(extensionId).toBeDefined();

  const page = await browserContext.newPage();
  await page.goto(`chrome-extension://${extensionId}/src/options/index.html`);

  // Verify the header is present and displays branding
  const title = page.locator('h1');
  await expect(title).toHaveText('LinguaFlix');

  // Verify settings subtitle
  const subtitle = page.locator('header p');
  await expect(subtitle).toHaveText('Extension Settings');

  // Verify sections are visible
  const headings = page.locator('h2');
  await expect(headings.nth(0)).toHaveText('Subtitle Display');
  await expect(headings.nth(1)).toHaveText('Language Pair');

  await browserContext.close();
});
