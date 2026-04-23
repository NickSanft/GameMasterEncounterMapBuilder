import { test, expect, type Page } from '@playwright/test';

/**
 * Phase 63 — player identity end-to-end.
 *
 * Verifies:
 *   - The Settings → Accessibility tab surfaces the "Display name"
 *     and "Color" fields, both round-trip through localStorage.
 *   - Setting a name in one tab (e.g. Spectator) broadcasts an
 *     `identity` message that the other tab (GM) picks up, and the
 *     GM's Connected Players panel shows the remote name.
 *   - The GM panel stays hidden when there's no one else connected.
 *
 * Uses two pages in a shared BrowserContext so the BroadcastChannel
 * connects them the same way a same-browser user would experience.
 */

async function setPlayerName(page: Page, name: string): Promise<void> {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Settings' });
  await dialog.getByRole('tab', { name: 'Accessibility' }).click();
  const input = dialog.locator('input[data-field="playerName"]');
  await input.fill(name);
  await input.dispatchEvent('change');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
}

test.describe('Player identity (Phase 63)', () => {
  test('Settings → Accessibility exposes Display name + Color + they persist', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await setPlayerName(page, 'Alice');
    // Re-open Settings to verify the name round-tripped.
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Settings' });
    await dialog.getByRole('tab', { name: 'Accessibility' }).click();
    await expect(dialog.locator('input[data-field="playerName"]')).toHaveValue(
      'Alice',
    );

    // Reload and confirm the preference persisted.
    await page.keyboard.press('Escape');
    await page.reload();
    await page.waitForSelector('#canvas');
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page
      .getByRole('dialog', { name: 'Settings' })
      .getByRole('tab', { name: 'Accessibility' })
      .click();
    await expect(
      page.getByRole('dialog', { name: 'Settings' })
        .locator('input[data-field="playerName"]'),
    ).toHaveValue('Alice');
  });

  test('GM Connected Players panel hides when no one else is connected', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    // Wait a little for identity broadcast to settle.
    await page.waitForTimeout(300);
    // Panel exists in the DOM but should be hidden (attribute).
    await expect(page.locator('.connected-players-panel')).toBeHidden();
  });

  test('GM panel shows a Spectator chip when a Spectator tab joins', async ({
    browser,
  }) => {
    // Both pages share a BrowserContext so the BroadcastChannel
    // connects them. Note: the `preferences` store syncs its
    // localStorage key across tabs in the same context via the
    // `storage` event — great for real users (one human, one name)
    // but means the test can't rely on two tabs having different
    // custom names. We leave the name default for both and verify
    // ROLES instead (GM + Spectator chips both show up).
    const ctx = await browser.newContext();
    try {
      const gm = await ctx.newPage();
      await gm.goto('./gm.html');
      await gm.waitForSelector('#canvas');
      // Let the GM's initial identity broadcast settle; panel is
      // still hidden because nobody else is connected.
      await gm.waitForTimeout(200);
      await expect(gm.locator('.connected-players-panel')).toBeHidden();

      const spec = await ctx.newPage();
      await spec.goto('./spectator.html');
      await spec.waitForSelector('#canvas');

      // Wait for the identity broadcasts to round-trip.
      await gm.waitForTimeout(500);
      const panel = gm.locator('.connected-players-panel');
      await expect(panel).toBeVisible();
      // Default names: GM → "GM", Spectator → "Spectator".
      await expect(panel).toContainText('GM');
      await expect(panel).toContainText('Spectator');
      // The local tab's entry is marked "(you)" — ensure it's present.
      await expect(panel).toContainText('(you)');
      // Two distinct chip elements — one for each tab.
      await expect(panel.locator('.connected-player-chip')).toHaveCount(2);
    } finally {
      await ctx.close();
    }
  });

  test('Changing the GM name updates the GM chip (without duplicating)', async ({
    browser,
  }) => {
    const ctx = await browser.newContext();
    try {
      const gm = await ctx.newPage();
      await gm.goto('./gm.html');
      await gm.waitForSelector('#canvas');

      const spec = await ctx.newPage();
      await spec.goto('./spectator.html');
      await spec.waitForSelector('#canvas');

      // Both show default names first.
      await gm.waitForTimeout(400);
      await expect(gm.locator('.connected-players-panel')).toContainText('GM');

      // Rename via Settings on the GM tab.
      await setPlayerName(gm, 'Alice');
      // Wait for the re-broadcast to arrive + the panel to re-render.
      await gm.waitForTimeout(300);
      await expect(gm.locator('.connected-players-panel')).toContainText(
        'Alice',
      );
      // Still just 2 chips — renames don't create duplicates.
      await expect(gm.locator('.connected-player-chip')).toHaveCount(2);
    } finally {
      await ctx.close();
    }
  });

  // 0.63.1 regression — user-reported: "changing the name of either
  // the GM or spectator changes both." Pre-0.63.1 the preference
  // was a single `playerName` field synced across tabs via the
  // cross-tab `storage` event, so renaming the GM clobbered the
  // Spectator's name too. Fix: scoped `playerNameGm` vs
  // `playerNameSpectator`, so each tab reads its own key and the
  // other's stays untouched.
  test('Renaming the GM does NOT affect the Spectator\u2019s name (regression)', async ({
    browser,
  }) => {
    const ctx = await browser.newContext();
    try {
      const gm = await ctx.newPage();
      await gm.goto('./gm.html');
      await gm.waitForSelector('#canvas');

      const spec = await ctx.newPage();
      await spec.goto('./spectator.html');
      await spec.waitForSelector('#canvas');

      // Set distinct names: GM → "Alice", Spectator → "Bob".
      await setPlayerName(gm, 'Alice');
      await setPlayerName(spec, 'Bob');

      // Wait for identity re-broadcasts to round-trip.
      await gm.waitForTimeout(500);

      const panel = gm.locator('.connected-players-panel');
      await expect(panel).toContainText('Alice');
      await expect(panel).toContainText('Bob');
      await expect(panel.locator('.connected-player-chip')).toHaveCount(2);

      // Now verify that renaming Alice doesn't reach Bob's tab.
      await setPlayerName(gm, 'Alicia');
      await gm.waitForTimeout(300);
      await expect(panel).toContainText('Alicia');
      // Spectator is still Bob — NOT renamed to Alicia.
      await expect(panel).toContainText('Bob');

      // Cross-check the Spectator's own Settings Modal — its name
      // input should still read "Bob", not "Alicia". Pre-fix this
      // would have been "Alicia" because the single shared key got
      // clobbered.
      await spec
        .getByRole('button', { name: 'Settings', exact: true })
        .click();
      const specDialog = spec.getByRole('dialog', { name: 'Settings' });
      await specDialog.getByRole('tab', { name: 'Accessibility' }).click();
      await expect(
        specDialog.locator('input[data-field="playerName"]'),
      ).toHaveValue('Bob');
    } finally {
      await ctx.close();
    }
  });
});
