import { test, expect } from '@playwright/test';

test.describe('PWA — manifest + service worker', () => {
  test('manifest.webmanifest is served and has expected fields', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    const href = await page
      .locator('link[rel="manifest"]')
      .getAttribute('href');
    expect(href).toBeTruthy();

    // Resolve relative to the current URL so Playwright can fetch it.
    const manifestUrl = new URL(href!, page.url()).toString();
    const response = await page.request.get(manifestUrl);
    expect(response.ok()).toBe(true);
    expect(response.headers()['content-type']).toMatch(/manifest|json/i);
    const manifest = (await response.json()) as Record<string, unknown>;
    expect(manifest.name).toBe('GM Encounter Maps');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('./gm.html');
    expect(Array.isArray(manifest.icons)).toBe(true);
  });

  test('sw.js is served and includes the app-version constant', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    const swUrl = new URL('./sw.js', page.url()).toString();
    const response = await page.request.get(swUrl);
    expect(response.ok()).toBe(true);
    const body = await response.text();
    // Version format matches `APP_VERSION = '...'` — keep the expect
    // loose so future bumps don't require e2e updates.
    expect(body).toMatch(/APP_VERSION\s*=\s*['"]\d+\.\d+\.\d+['"]/);
    // Core SW lifecycle hooks are wired.
    expect(body).toContain("addEventListener('install'");
    expect(body).toContain("addEventListener('activate'");
    expect(body).toContain("addEventListener('fetch'");
  });

  test('service worker registers on gm.html load', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    // Wait for the browser to finish registration. The registration
    // promise resolves via navigator.serviceWorker.ready.
    const registered = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      const reg = await navigator.serviceWorker.ready;
      return !!reg && !!reg.scope;
    });
    expect(registered).toBe(true);
  });

  test('gm.html declares apple-touch-icon + theme-color meta', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    const themeColor = await page
      .locator('meta[name="theme-color"]')
      .getAttribute('content');
    expect(themeColor).toBe('#1b1d22');

    const appleIcon = await page
      .locator('link[rel="apple-touch-icon"]')
      .getAttribute('href');
    expect(appleIcon).toBeTruthy();
  });
});
