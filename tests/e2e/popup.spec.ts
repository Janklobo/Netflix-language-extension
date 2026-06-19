import { test, expect, chromium } from '@playwright/test';
import path from 'path';

test('popup loads successfully', async () => {
  const extensionPath = path.resolve(__dirname, '../../dist');

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
  await page.goto(`chrome-extension://${extensionId}/src/popup/index.html`);

  // Verify the header is present and displays branding
  const title = page.locator('h1');
  await expect(title).toHaveText('LinguaFlix');

  await browserContext.close();
});
