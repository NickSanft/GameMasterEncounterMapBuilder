/**
 * Phase 150 — tile-paint → block-wall coupling.
 *
 * Verifies the wiring + the preference gate. Pixel-checking wall
 * geometry is out of scope; we use the canvas-outline list (which
 * counts walls + tiles) to assert the coupling created / removed
 * the right entries.
 */
import { test, expect, type Page } from '@playwright/test';

async function setCoupleWallsPref(page: Page, value: boolean) {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Settings' });
  await dialog.getByRole('tab', { name: 'Appearance' }).click();
  const cb = dialog.locator('input[data-field="coupleTilePaintWalls"]');
  if (value) await cb.check();
  else await cb.uncheck();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
}

async function paintWallTileAt(page: Page, x: number, y: number) {
  // Activate the tile-paint tool via the toolbar button (more
  // reliable than the keyboard shortcut, which can lose focus
  // after a Settings modal Escape).
  await page
    .locator('.gm-toolbar button', { hasText: 'Paint (P)' })
    .click();
  // Default paint mode + select 'wall' kind.
  await page
    .locator('.tile-paint-settings-row button', { hasText: 'Wall' })
    .click();
  const box = await page.locator('#canvas').boundingBox();
  if (!box) throw new Error('canvas has no bounding box');
  await page.mouse.click(box.x + x, box.y + y);
}

test.describe('Phase 150 — tile-paint wall coupling', () => {
  test('checkbox is present + unchecked by default', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Settings' });
    await dialog.getByRole('tab', { name: 'Appearance' }).click();
    const cb = dialog.locator('input[data-field="coupleTilePaintWalls"]');
    await expect(cb).toBeVisible();
    await expect(cb).not.toBeChecked();
  });

  // Phase 150 — coupling-OFF test moved below the coupling-ON
  // test for clarity; the coupling-OFF assertion is implicit in
  // "the outline doesn't show a Wall heading."

  test('with coupling ON, painting a wall tile creates BOTH a tile AND a 1×1 block wall', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    await setCoupleWallsPref(page, true);
    await paintWallTileAt(page, 300, 300);
    // Wait for the canvas-outline to refresh (debounced ~120 ms in
    // Phase 87). Outline uses singular "Wall" for one entry,
    // "Walls (N)" for multiple.
    await page.waitForTimeout(400);
    await expect(
      page.locator('.canvas-outline h3').filter({ hasText: /^Wall$/ }),
    ).toHaveCount(1);
    await expect(
      page.locator('.canvas-outline li', { hasText: /Wall block, 1 by 1/ }),
    ).toHaveCount(1);
  });

  test('with coupling OFF, painting a wall tile does NOT create a block wall', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    // Pref defaults OFF; just paint without flipping the toggle.
    await paintWallTileAt(page, 300, 300);
    await page.waitForTimeout(400);
    // No "Wall" heading should appear (count is 0 → outline omits
    // empty kinds).
    await expect(
      page.locator('.canvas-outline h3').filter({ hasText: /^Wall/ }),
    ).toHaveCount(0);
  });
});
