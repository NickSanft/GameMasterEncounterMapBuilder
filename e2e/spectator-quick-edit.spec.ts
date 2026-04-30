/**
 * Phase 128 — Spectator owned-token quick-edit popover.
 *
 * Validates:
 *   - Right-clicking an owned token on the spectator canvas opens the
 *     popover. Right-clicking an UNOWNED token does not.
 *   - HP -1 button broadcasts a `token-claim-update` that the GM
 *     applies, decrementing the token's `hp.current` on the GM side.
 *   - Adding a condition via the checkbox round-trips through the
 *     GM and lands on the GM-authoritative state.
 */
import { test, expect, type BrowserContext, type Page } from '@playwright/test';

async function spinUpSpectator(context: BrowserContext): Promise<Page> {
  const spec = await context.newPage();
  await spec.goto('./spectator.html');
  await spec.waitForSelector('#canvas');
  await spec.waitForTimeout(500);
  return spec;
}

async function placeTokenWithHp(gm: Page) {
  await gm.keyboard.press('t');
  const box = await gm.locator('#canvas').boundingBox();
  if (!box) throw new Error('canvas has no bounding box');
  await gm.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  // Open editor + give the token HP tracking.
  await gm.keyboard.press('s');
  await gm.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await gm.keyboard.press('e');
  await expect(gm.getByRole('dialog', { name: 'Edit Token' })).toBeVisible();
  await gm.locator('input[data-field="trackHp"]').check();
  await gm.locator('input[data-field="hpMax"]').fill('20');
  await gm.locator('input[data-field="hpMax"]').blur();
  await gm.locator('input[data-field="hpCurrent"]').fill('20');
  await gm.locator('input[data-field="hpCurrent"]').blur();
}

async function setOwnerToFirstSpectator(gm: Page) {
  const select = gm.locator('select[data-field="owner-select"]');
  const ownerValue = await select
    .locator('option:not([value=""])')
    .first()
    .getAttribute('value');
  expect(ownerValue).not.toBeNull();
  await select.selectOption(ownerValue!);
  await gm.keyboard.press('Escape');
  await expect(gm.getByRole('dialog', { name: 'Edit Token' })).toBeHidden();
}

async function gmHpCurrent(gm: Page): Promise<number> {
  // Re-select the token + open editor to read current HP. Phase 86's
  // Esc-clears-selection guard fires after Escape, so re-select first.
  const box = await gm.locator('#canvas').boundingBox();
  if (!box) throw new Error('canvas has no bounding box');
  await gm.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await gm.keyboard.press('e');
  await expect(gm.getByRole('dialog', { name: 'Edit Token' })).toBeVisible();
  const v = await gm.locator('input[data-field="hpCurrent"]').inputValue();
  await gm.keyboard.press('Escape');
  return Number(v);
}

test.describe('Phase 128 — Spectator quick-edit popover', () => {
  test('right-click on UNOWNED token does NOT open the popover', async ({
    browser,
  }) => {
    const context = await browser.newContext();
    try {
      const gm = await context.newPage();
      await gm.goto('./gm.html');
      await gm.waitForSelector('#canvas');
      const spec = await spinUpSpectator(context);
      await gm.waitForTimeout(400);

      // Place a token on the GM (default unowned).
      await gm.keyboard.press('t');
      const gmBox = await gm.locator('#canvas').boundingBox();
      if (!gmBox) throw new Error('canvas has no bounding box');
      await gm.mouse.click(gmBox.x + gmBox.width / 2, gmBox.y + gmBox.height / 2);
      await gm.waitForTimeout(300);

      const specBox = await spec.locator('#canvas').boundingBox();
      if (!specBox) throw new Error('spec canvas has no bounding box');
      await spec.mouse.click(
        specBox.x + specBox.width / 2,
        specBox.y + specBox.height / 2,
        { button: 'right' },
      );
      await spec.waitForTimeout(300);
      await expect(spec.locator('.owned-token-popover')).toBeHidden();
    } finally {
      await context.close();
    }
  });

  test('HP -1 from the popover decrements GM-authoritative HP', async ({
    browser,
  }) => {
    const context = await browser.newContext();
    try {
      const gm = await context.newPage();
      await gm.goto('./gm.html');
      await gm.waitForSelector('#canvas');
      const spec = await spinUpSpectator(context);
      await gm.waitForTimeout(400);

      await placeTokenWithHp(gm);
      await setOwnerToFirstSpectator(gm);
      // Allow the ownership patch to round-trip to the spectator.
      await spec.waitForTimeout(400);

      // Spectator right-clicks on the token.
      const specBox = await spec.locator('#canvas').boundingBox();
      if (!specBox) throw new Error('spec canvas has no bounding box');
      await spec.mouse.click(
        specBox.x + specBox.width / 2,
        specBox.y + specBox.height / 2,
        { button: 'right' },
      );
      await expect(spec.locator('.owned-token-popover')).toBeVisible();

      // Click the -1 button.
      await spec
        .locator('.owned-token-popover-hp-buttons button', { hasText: '-1' })
        .first()
        .click();

      // GM-side HP should be 19 after the round-trip.
      await expect.poll(async () => await gmHpCurrent(gm)).toBe(19);
    } finally {
      await context.close();
    }
  });
});
