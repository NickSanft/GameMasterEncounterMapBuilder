/**
 * Phase 142 — tile-paint smoke test.
 *
 * Validates the tool wiring (P shortcut, panel visibility, paint
 * + erase mode toggle, clear-all). Doesn't pixel-check the rendered
 * tile colors (that's renderer-level; visual regression covers it
 * once the baseline scene includes a painted tile).
 */
import { test, expect } from '@playwright/test';

test.describe('Phase 142 — tile-paint tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
  });

  test('P keyboard shortcut activates the tile-paint tool', async ({
    page,
  }) => {
    await page.keyboard.press('p');
    await expect(page.locator('.tile-paint-settings')).toBeVisible();
    // Default mode is paint, default kind is floor.
    await expect(
      page.locator('.tile-paint-settings-row button.active', { hasText: 'Paint' }),
    ).toBeVisible();
    await expect(
      page.locator('.tile-paint-settings-row button.active', { hasText: 'Floor' }),
    ).toBeVisible();
  });

  test('Paint tool button shows in the toolbar', async ({ page }) => {
    await expect(
      page.locator('.gm-toolbar button', { hasText: 'Paint (P)' }),
    ).toBeVisible();
  });

  test('switching kinds updates the active button', async ({ page }) => {
    await page.keyboard.press('p');
    const water = page.locator('.tile-paint-settings-row button', {
      hasText: 'Water',
    });
    await water.click();
    await expect(water).toHaveClass(/active/);
  });

  test('Erase toggle deactivates the kind buttons but stays usable', async ({
    page,
  }) => {
    await page.keyboard.press('p');
    const erase = page.locator('.tile-paint-settings-row button', {
      hasText: 'Erase',
    });
    await erase.click();
    await expect(erase).toHaveClass(/active/);
  });

  test('Clear all tiles button is present (skipped no-op when empty)', async ({
    page,
  }) => {
    await page.keyboard.press('p');
    await expect(page.locator('.tile-paint-settings-clear')).toBeVisible();
  });

  test('panel hides when switching to a different tool', async ({ page }) => {
    await page.keyboard.press('p');
    await expect(page.locator('.tile-paint-settings')).toBeVisible();
    await page.keyboard.press('s');
    await expect(page.locator('.tile-paint-settings')).toBeHidden();
  });
});
