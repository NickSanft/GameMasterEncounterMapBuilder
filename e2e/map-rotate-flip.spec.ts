/**
 * Phase 140 — map rotate / flip H/V context-menu items.
 *
 * Validates the wiring of the four new menu items in the Map-tool
 * right-click menu. Doesn't assert pixel rotation (would need visual
 * regression — the Phase 140 unit tests + the deserializer round-trip
 * cover the data path; this e2e proves the menu hooks exist).
 */
import { test, expect, type Page } from '@playwright/test';

async function placeBackgroundViaPresets(page: Page) {
  // Use the bundled preset map (smaller than uploading a fresh image
  // and doesn't depend on file-input plumbing).
  await page.getByRole('button', { name: 'Preset Maps', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: /Choose Preset Map/i });
  await expect(dialog).toBeVisible();
  // Click the first preset card.
  await dialog.locator('.preset-card').first().click();
  // Modal closes on selection.
  await expect(dialog).toBeHidden();
  // The background-update patch lands asynchronously (the IDB write
  // for the bundled image data resolves on a microtask). Wait for the
  // canvas's aria-label to flip from "no map" to a labeled map state.
  await page.waitForTimeout(500);
}

test.describe('Phase 140 — map rotate / flip context menu', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
  });

  test('menu shows the orientation items only when a background is set', async ({
    page,
  }) => {
    // Right-click on empty map first — no background, no orientation
    // items in the menu.
    const box = await page.locator('#canvas').boundingBox();
    if (!box) throw new Error('canvas has no bounding box');
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.click(cx, cy, { button: 'right' });
    let menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    await expect(menu.getByText('Rotate map 90°')).toHaveCount(0);
    // Dismiss + place a background.
    await page.keyboard.press('Escape');
    await placeBackgroundViaPresets(page);

    // Right-click again — orientation items present.
    await page.mouse.click(cx, cy, { button: 'right' });
    menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    await expect(menu.getByText('Rotate map 90°')).toBeVisible();
    await expect(menu.getByText('Flip horizontal')).toBeVisible();
    await expect(menu.getByText('Flip vertical')).toBeVisible();
    await expect(menu.getByText('Reset orientation')).toBeVisible();
  });

  test('Reset orientation is disabled when nothing is rotated/flipped', async ({
    page,
  }) => {
    await placeBackgroundViaPresets(page);
    const box = await page.locator('#canvas').boundingBox();
    if (!box) throw new Error('canvas has no bounding box');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, {
      button: 'right',
    });
    const menu = page.getByRole('menu');
    const resetItem = menu.getByRole('menuitem', { name: /Reset orientation/i });
    await expect(resetItem).toBeVisible();
    await expect(resetItem).toBeDisabled();
  });

  test('clicking Rotate map 90° enables Reset orientation on the next open', async ({
    page,
  }) => {
    await placeBackgroundViaPresets(page);
    const box = await page.locator('#canvas').boundingBox();
    if (!box) throw new Error('canvas has no bounding box');
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.click(cx, cy, { button: 'right' });
    await page.getByRole('menuitem', { name: /Rotate map 90°/i }).click();
    // Re-open the menu — Reset is now enabled.
    await page.mouse.click(cx, cy, { button: 'right' });
    const reset = page
      .getByRole('menu')
      .getByRole('menuitem', { name: /Reset orientation/i });
    await expect(reset).toBeEnabled();
  });
});
