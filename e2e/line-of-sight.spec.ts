import { test, expect, type Page } from '@playwright/test';

/**
 * Phase 55 LoS coverage.
 *
 * The actual fog-clip behavior is canvas-pixel-level and would require
 * visual-regression baselines to assert robustly (Phase 51 territory).
 * What we CAN assert deterministically in this spec:
 *
 *  - The preference lives in Settings → Grid, flips on + persists.
 *  - The token editor exposes a Sight fieldset with a working "viewer"
 *    toggle + radius input.
 *  - Toggling the pref on doesn't crash the boot path (no console
 *    errors specifically about line-of-sight / polygons).
 *
 * Deeper visual assertions (fog shrinks when a wall blocks a viewer)
 * are deferred to a follow-up visual-regression snapshot.
 */

async function enableLoSPreference(page: Page) {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Settings' });
  await dialog.getByRole('tab', { name: 'Grid' }).click();
  await dialog.locator('input[data-field="losMode"]').check();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
}

async function placeAndOpenFirstToken(page: Page) {
  await page.keyboard.press('t');
  const box = await page.locator('#canvas').boundingBox();
  if (!box) throw new Error('canvas has no bounding box');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.keyboard.press('s');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.keyboard.press('e');
}

test.describe('Line of sight (Phase 55)', () => {
  test('Dynamic LoS checkbox lives on the Grid tab and persists across reload', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Settings' });
    await dialog.getByRole('tab', { name: 'Grid' }).click();

    const losCheckbox = dialog.locator('input[data-field="losMode"]');
    await expect(losCheckbox).not.toBeChecked();
    await losCheckbox.check();
    await page.keyboard.press('Escape');

    await page.reload();
    await page.waitForSelector('#canvas');
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('dialog', { name: 'Settings' }).getByRole('tab', { name: 'Grid' }).click();
    await expect(
      page.getByRole('dialog', { name: 'Settings' }).locator('input[data-field="losMode"]'),
    ).toBeChecked();
  });

  test('Token editor exposes a Sight fieldset with radius gating', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await placeAndOpenFirstToken(page);
    const dialog = page.getByRole('dialog', { name: 'Edit Token' });
    await expect(dialog).toBeVisible();

    // Sight fieldset is rendered.
    await expect(dialog.locator('.sight-block')).toBeVisible();

    const viewerToggle = dialog.locator('input[data-field="hasSight"]');
    const radiusInput = dialog.locator('input[data-field="losRadiusFeet"]');
    const details = dialog.locator('[data-field="sight-details"]');

    // Starts non-viewer, radius details collapsed.
    await expect(viewerToggle).not.toBeChecked();
    await expect(details).toBeHidden();

    await viewerToggle.check();
    await expect(details).toBeVisible();
    // Default radius is 30 ft per the editor wiring.
    await expect(radiusInput).toHaveValue('30');

    // Typing a new radius persists — re-open the editor to verify.
    await radiusInput.fill('60');
    await radiusInput.dispatchEvent('change');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    await page.keyboard.press('e');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('input[data-field="hasSight"]')).toBeChecked();
    await expect(dialog.locator('input[data-field="losRadiusFeet"]')).toHaveValue('60');
  });

  test('Enabling LoS + placing a viewer token does not throw console errors', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(String(err)));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    await enableLoSPreference(page);

    // Place a token + enable viewer on it.
    await placeAndOpenFirstToken(page);
    const dialog = page.getByRole('dialog', { name: 'Edit Token' });
    await dialog.locator('input[data-field="hasSight"]').check();
    await page.keyboard.press('Escape');

    // Draw a short wall with the Walls tool so LoS has something to
    // occlude against.
    await page.keyboard.press('w');
    const box = await page.locator('#canvas').boundingBox();
    if (!box) throw new Error('canvas has no bounding box');
    await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.4);
    await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.6);
    await page.keyboard.press('Escape');

    // Allow the fog worker a tick to respond.
    await page.waitForTimeout(300);

    const losErrors = errors.filter((e) => /line.of.sight|polygon|los|fog-worker/i.test(e));
    expect(losErrors).toEqual([]);
  });
});
