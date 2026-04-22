import { test, expect, type Page } from '@playwright/test';

/**
 * Phase 57 — token lighting (bright/dim radii + presets).
 *
 * Same testing strategy as the LoS spec: canvas pixel state isn't
 * directly observable in DOM, so we assert what IS — the editor
 * exposes a Light fieldset with working presets + bright/dim feet
 * inputs, the values persist round-trip, and enabling lighting on
 * a token doesn't throw any worker / polygon errors at boot.
 *
 * Visual assertions (light halo paints + walls cast shadow) are
 * deferred to a follow-up visual-regression snapshot.
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

test.describe('Token lighting (Phase 57)', () => {
  test('Token editor exposes a Light fieldset with preset + bright/dim gating', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await placeAndOpenFirstToken(page);
    const dialog = page.getByRole('dialog', { name: 'Edit Token' });
    await expect(dialog).toBeVisible();

    // Light fieldset is present.
    await expect(dialog.locator('.light-block')).toBeVisible();

    const toggle = dialog.locator('input[data-field="hasLight"]');
    const details = dialog.locator('[data-field="light-details"]');
    const brightInput = dialog.locator('input[data-field="lightBrightFeet"]');
    const dimInput = dialog.locator('input[data-field="lightDimFeet"]');

    // Starts off, details hidden.
    await expect(toggle).not.toBeChecked();
    await expect(details).toBeHidden();

    // Enable: Torch preset (20/20) is the default per the editor.
    await toggle.check();
    await expect(details).toBeVisible();
    await expect(brightInput).toHaveValue('20');
    await expect(dimInput).toHaveValue('20');

    // Click the Lantern preset → 30/30.
    await dialog.locator('[data-light-preset="lantern"]').click();
    await expect(brightInput).toHaveValue('30');
    await expect(dimInput).toHaveValue('30');

    // Daylight preset → 60/60.
    await dialog.locator('[data-light-preset="daylight"]').click();
    await expect(brightInput).toHaveValue('60');
    await expect(dimInput).toHaveValue('60');
  });

  test('Light values round-trip through close + reopen', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await placeAndOpenFirstToken(page);
    const dialog = page.getByRole('dialog', { name: 'Edit Token' });

    await dialog.locator('input[data-field="hasLight"]').check();
    // Pick lantern (30/30), then customize bright down to 15.
    await dialog.locator('[data-light-preset="lantern"]').click();
    const brightInput = dialog.locator('input[data-field="lightBrightFeet"]');
    await brightInput.fill('15');
    await brightInput.dispatchEvent('change');

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    // Re-open and verify the values stuck.
    await page.keyboard.press('e');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('input[data-field="hasLight"]')).toBeChecked();
    await expect(dialog.locator('input[data-field="lightBrightFeet"]')).toHaveValue(
      '15',
    );
    await expect(dialog.locator('input[data-field="lightDimFeet"]')).toHaveValue(
      '30',
    );
  });

  test('Enabling LoS + placing a torch token + a wall does not throw', async ({
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

    // Place a token + give it both sight (so it's a viewer) + a torch
    // light. With LoS on + lights configured the spectator fog mask
    // composes viewer ∩ light, which exercises the new code path.
    await placeAndOpenFirstToken(page);
    const dialog = page.getByRole('dialog', { name: 'Edit Token' });
    await dialog.locator('input[data-field="hasSight"]').check();
    await dialog.locator('input[data-field="hasLight"]').check();
    await dialog.locator('[data-light-preset="torch"]').click();
    await page.keyboard.press('Escape');

    // Drop a short sight-blocking wall so the worker actually has
    // geometry to ray-cast against.
    await page.keyboard.press('w');
    const box = await page.locator('#canvas').boundingBox();
    if (!box) throw new Error('canvas has no bounding box');
    await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.4);
    await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.6);
    await page.keyboard.press('Escape');

    // Allow the fog worker a tick to respond.
    await page.waitForTimeout(300);

    const lightErrors = errors.filter((e) =>
      /light|polygon|los|fog-worker/i.test(e),
    );
    expect(lightErrors).toEqual([]);
  });
});
