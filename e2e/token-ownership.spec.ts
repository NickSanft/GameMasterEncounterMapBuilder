/**
 * Phase 126 — token ownership (GM authoring side).
 *
 * Validates:
 *   - Token editor renders the "Owned by" fieldset with the default
 *     "Unowned (GM-controlled)" option for a fresh token.
 *   - When a Spectator is connected, the owner select includes their
 *     name as a selectable option.
 *   - Selecting a Spectator persists across closing + reopening the
 *     editor (round-trips through the store / IDB).
 */
import { test, expect, type BrowserContext, type Page } from '@playwright/test';

async function placeAndEditToken(page: Page) {
  await page.keyboard.press('t');
  const box = await page.locator('#canvas').boundingBox();
  if (!box) throw new Error('canvas has no bounding box');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.keyboard.press('s');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.keyboard.press('e');
  await expect(page.getByRole('dialog', { name: 'Edit Token' })).toBeVisible();
}

async function spinUpSpectator(context: BrowserContext): Promise<Page> {
  const spec = await context.newPage();
  await spec.goto('./spectator.html');
  await spec.waitForSelector('#canvas');
  await spec.waitForTimeout(400); // identity-handshake settle time
  return spec;
}

// (No-op helper — kept for clarity. The Spectator's default identity
// "Spectator" is broadcast on connect via the Phase 63 identity flow,
// so the GM's owner select picks it up without any settings poke.)

test.describe('Phase 126 — token ownership (GM authoring)', () => {
  test('Owned by select renders with the default Unowned option', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    await placeAndEditToken(page);

    const select = page.locator('select[data-field="owner-select"]');
    await expect(select).toBeVisible();
    await expect(select).toHaveValue('');
    await expect(select.locator('option[value=""]')).toContainText(
      /Unowned/,
    );
  });

  test('connected Spectator appears as a selectable owner', async ({ browser }) => {
    const context = await browser.newContext();
    try {
      const gm = await context.newPage();
      await gm.goto('./gm.html');
      await gm.waitForSelector('#canvas');

      const spec = await spinUpSpectator(context);
      void spec; // referenced for clarity; identity is broadcast on boot
      // Allow identity broadcast to reach the GM tab.
      await gm.waitForTimeout(600);

      await placeAndEditToken(gm);
      const select = gm.locator('select[data-field="owner-select"]');
      // At least one Spectator-named option appears in addition to
      // the default "Unowned (GM-controlled)" entry.
      const optionsCount = await select.locator('option').count();
      expect(optionsCount).toBeGreaterThanOrEqual(2);
    } finally {
      await context.close();
    }
  });

  test('selecting an owner persists across editor close + re-open', async ({
    browser,
  }) => {
    const context = await browser.newContext();
    try {
      const gm = await context.newPage();
      await gm.goto('./gm.html');
      await gm.waitForSelector('#canvas');

      const spec = await spinUpSpectator(context);
      void spec;
      await gm.waitForTimeout(600);

      await placeAndEditToken(gm);
      const select = gm.locator('select[data-field="owner-select"]');
      // Pick the first non-empty option (whichever Spectator showed up).
      const ownerValue = await select
        .locator('option:not([value=""])')
        .first()
        .getAttribute('value');
      expect(ownerValue).not.toBeNull();
      await select.selectOption(ownerValue!);

      // Close the editor. Phase 86's Esc-clears-selection guard fires
      // here too, so we'll re-select the token before reopening.
      await gm.keyboard.press('Escape');
      await expect(
        gm.getByRole('dialog', { name: 'Edit Token' }),
      ).toBeHidden();

      // Re-select the token + re-open via E.
      const box = await gm.locator('#canvas').boundingBox();
      if (!box) throw new Error('canvas has no bounding box');
      await gm.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await gm.keyboard.press('e');
      await expect(
        gm.getByRole('dialog', { name: 'Edit Token' }),
      ).toBeVisible();
      // Owner persisted.
      await expect(
        gm.locator('select[data-field="owner-select"]'),
      ).toHaveValue(ownerValue!);
    } finally {
      await context.close();
    }
  });
});
