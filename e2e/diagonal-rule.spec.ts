/**
 * Phase 115 — diagonal movement rules.
 *
 * Phase 0.61 already supported `chebyshev` + `alternating` end-to-end
 * (preference, ruler, movement-remaining indicator). Phase 115 adds
 * the third rule, `euclidean`, and exposes it as a Settings radio.
 *
 * Validates:
 *   - The Settings modal exposes a third radio for the Euclidean rule.
 *   - Picking it persists to preferences (the radio stays checked
 *     across modal close + re-open).
 */
import { test, expect } from '@playwright/test';

test.describe('Phase 115 — Euclidean diagonal rule', () => {
  test('Settings modal exposes the Euclidean radio + selecting it persists', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    // Open Settings + switch to the Appearance tab (the diagonal-rule
    // fieldset lives in the Distance subgroup of the Appearance pane).
    await page.getByRole('button', { name: 'Settings' }).click();
    const dialog = page.getByRole('dialog', { name: /settings/i });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('tab', { name: 'Appearance' }).click();

    const radios = dialog.locator('input[name="settings-diagonal-rule"]');
    await expect(radios).toHaveCount(3);
    const euclideanRadio = dialog.locator(
      'input[name="settings-diagonal-rule"][value="euclidean"]',
    );
    await expect(euclideanRadio).toBeVisible();
    await expect(euclideanRadio).not.toBeChecked();

    // Default is chebyshev.
    await expect(
      dialog.locator('input[name="settings-diagonal-rule"][value="chebyshev"]'),
    ).toBeChecked();

    // Pick Euclidean.
    await euclideanRadio.check();
    await expect(euclideanRadio).toBeChecked();

    // Close modal + re-open — still selected.
    await dialog.locator('.modal-close').click();
    await expect(dialog).toBeHidden();

    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole('tab', { name: 'Appearance' }).click();
    await expect(
      dialog.locator('input[name="settings-diagonal-rule"][value="euclidean"]'),
    ).toBeChecked();
  });
});
