import { test, expect } from '@playwright/test';

/**
 * Phase 82 — per-Spectator permissions.
 *
 * The GM opens the Permissions modal from the session menu. Empty
 * state when no Spectators are connected. Spectator side respects
 * the GM-pushed permissions (best-tested in a dual-context flow).
 */
test.describe('Spectator permissions', () => {
  test('GM session menu exposes a "Permissions…" entry', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    await expect(
      page.getByRole('button', { name: /^Permissions/ }),
    ).toBeVisible();
  });

  test('Spectator session menu does NOT expose Permissions', async ({
    page,
  }) => {
    await page.goto('./spectator.html');
    await page.waitForSelector('#canvas');
    await expect(
      page.getByRole('button', { name: /^Permissions/ }),
    ).toHaveCount(0);
  });

  test('opening the modal with no Spectators connected shows the empty state', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    await page.getByRole('button', { name: /^Permissions/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Spectator permissions' });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('.permissions-empty')).toBeVisible();
    await expect(dialog.locator('.permissions-row')).toHaveCount(0);
  });

  test('GM + Spectator handshake — modal lists the connected Spectator + canRoll toggle works end-to-end', async ({
    browser,
  }) => {
    const context = await browser.newContext();
    try {
      // Open GM first, wait for the channel to be ready.
      const gm = await context.newPage();
      await gm.goto('./gm.html');
      await gm.waitForSelector('#canvas');

      // Open the Spectator in the same context (BroadcastChannel
      // delivers within the same origin / context).
      const spec = await context.newPage();
      await spec.goto('./spectator.html');
      await spec.waitForSelector('#canvas');
      // Wait long enough for the identity broadcast handshake.
      await spec.waitForTimeout(500);

      // GM opens the permissions modal — should see the Spectator.
      await gm.getByRole('button', { name: /^Permissions/ }).click();
      const dialog = gm.getByRole('dialog', {
        name: 'Spectator permissions',
      });
      await expect(dialog).toBeVisible();
      const row = dialog.locator('.permissions-row');
      await expect(row).toHaveCount(1);

      // Toggle canRoll off.
      const cb = row.locator('input[type="checkbox"]').first();
      await expect(cb).toBeChecked();
      await cb.uncheck();
      // Reset link should appear (row is now overridden).
      await expect(row.locator('.permissions-reset')).toBeVisible();
      // Give the BroadcastChannel a moment to propagate the
      // permissions message to the Spectator tab.
      await spec.waitForTimeout(400);

      // Spectator tries to roll — should get an inline restriction
      // message via the slash-command input.
      await spec.keyboard.press('/');
      await spec.locator('.slash-input-field').fill('d20');
      await spec.keyboard.press('Enter');
      await expect(spec.locator('.slash-input-error.visible')).toBeVisible({
        timeout: 5000,
      });
      await expect(spec.locator('.slash-input-error')).toContainText(
        /restricted/i,
      );
      // Dismiss the slash input before the next interaction.
      await spec.keyboard.press('Escape');
    } finally {
      await context.close();
    }
  });
});
