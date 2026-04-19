import { test, expect } from '@playwright/test';

test.describe('Landing page', () => {
  test('renders title, copy, and view links', async ({ page }) => {
    await page.goto('./');

    await expect(page.locator('h1')).toHaveText(/GM Encounter Maps/);
    await expect(page.getByRole('link', { name: /Open GM View/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Open Spectator View/i })).toBeVisible();

    // Both view links should point at the bundled HTML files (preserving the
    // GitHub Pages base path that vite is configured with).
    const gmHref = await page.getByRole('link', { name: /Open GM View/i }).getAttribute('href');
    const spectatorHref = await page.getByRole('link', { name: /Open Spectator View/i }).getAttribute('href');
    expect(gmHref).toContain('gm.html');
    expect(spectatorHref).toContain('spectator.html');
  });
});
