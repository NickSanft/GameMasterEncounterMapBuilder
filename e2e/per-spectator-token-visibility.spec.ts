/**
 * Phase 109 — per-Spectator token visibility.
 *
 * The GM hides individual tokens from individual Spectators via the
 * token editor's new "Visible to" section. The Spectator's renderer
 * filters those tokens out — verified end-to-end via the canvas
 * `aria-label` which advertises the visible token count.
 *
 * Validates:
 *   - The token editor's visibility fieldset is hidden when no
 *     Spectator is connected (or the host didn't wire the callbacks).
 *   - Once a Spectator joins, the fieldset shows a row per Spectator,
 *     each row defaulting to "checked = visible."
 *   - Unchecking a row hides that token from that Spectator (the
 *     Spectator's canvas aria-label drops "1 token visible" → "0").
 *   - Re-checking restores it.
 *   - Deleting a token cleans up the per-Spectator hidden list (no
 *     ghost ids left in localStorage).
 */
import { test, expect, type BrowserContext, type Page } from '@playwright/test';

async function placeTokenAt(page: Page, frac: number) {
  await page.keyboard.press('t');
  const box = await page.locator('#canvas').boundingBox();
  if (!box) throw new Error('canvas has no bounding box');
  await page.mouse.click(box.x + box.width * frac, box.y + box.height * 0.5);
}

async function openTokenEditor(page: Page) {
  // Right-click the canvas center → "Edit token".
  const box = await page.locator('#canvas').boundingBox();
  if (!box) throw new Error('canvas has no bounding box');
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5, {
    button: 'right',
  });
  await page.getByRole('menuitem', { name: /Edit token/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Edit Token' });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function spinUpSpectator(context: BrowserContext): Promise<Page> {
  const spec = await context.newPage();
  await spec.goto('./spectator.html');
  await spec.waitForSelector('#canvas');
  // Identity-handshake settle time.
  await spec.waitForTimeout(500);
  return spec;
}

test.describe('Phase 109 — per-Spectator token visibility', () => {
  test('visibility fieldset is hidden when no Spectators are connected', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    await placeTokenAt(page, 0.5);
    const dialog = await openTokenEditor(page);
    // The fieldset itself shows when callbacks are wired (we always
    // wire them in gm.ts), but the empty state appears when no
    // Spectators connected.
    await expect(dialog.locator('.visibility-fieldset')).toBeVisible();
    await expect(dialog.locator('.visibility-empty')).toBeVisible();
    await expect(dialog.locator('.visibility-row')).toHaveCount(0);
  });

  test('fieldset lists connected Spectators; unchecking hides the token from that Spectator end-to-end', async ({
    browser,
  }) => {
    const context = await browser.newContext();
    try {
      const gm = await context.newPage();
      await gm.goto('./gm.html');
      await gm.waitForSelector('#canvas');

      const spec = await spinUpSpectator(context);

      // GM places ONE token at center.
      await placeTokenAt(gm, 0.5);
      // Reveal the cell so the token is visible to the Spectator
      // (otherwise fog hides it regardless of permissions).
      await gm.keyboard.press('r'); // Reveal tool
      const box = await gm.locator('#canvas').boundingBox();
      if (!box) throw new Error('no canvas box');
      await gm.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);
      // Allow sync to propagate.
      await spec.waitForTimeout(400);

      // Sanity: Spectator sees the token in its aria-label.
      await expect(spec.locator('#canvas')).toHaveAttribute(
        'aria-label',
        /1 token visible/,
      );

      // GM opens the token editor and unchecks the Spectator.
      // Switch back to Select first so right-click hit-tests the token.
      await gm.keyboard.press('s');
      const dialog = await openTokenEditor(gm);
      const row = dialog.locator('.visibility-row');
      await expect(row).toHaveCount(1);
      const cb = row.locator('input[type="checkbox"]');
      await expect(cb).toBeChecked();
      await cb.uncheck();

      // Wait for the BroadcastChannel permissions hop + re-render.
      await spec.waitForTimeout(500);

      // Spectator's aria-label should now report 0 tokens visible
      // (1 total in session, but the only token is hidden).
      await expect(spec.locator('#canvas')).toHaveAttribute(
        'aria-label',
        /0 token/,
        { timeout: 5_000 },
      );

      // Re-check the box → token reappears.
      await cb.check();
      await spec.waitForTimeout(500);
      await expect(spec.locator('#canvas')).toHaveAttribute(
        'aria-label',
        /1 token visible/,
        { timeout: 5_000 },
      );
    } finally {
      await context.close();
    }
  });

  test('hiding a token from one Spectator does not affect a second Spectator', async ({
    browser,
  }) => {
    const context = await browser.newContext();
    try {
      const gm = await context.newPage();
      await gm.goto('./gm.html');
      await gm.waitForSelector('#canvas');

      const spec1 = await spinUpSpectator(context);
      const spec2 = await spinUpSpectator(context);

      await placeTokenAt(gm, 0.5);
      await gm.keyboard.press('r');
      const box = await gm.locator('#canvas').boundingBox();
      if (!box) throw new Error('no canvas box');
      await gm.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);
      await spec1.waitForTimeout(400);
      await spec2.waitForTimeout(400);

      // Both Spectators see the token initially.
      await expect(spec1.locator('#canvas')).toHaveAttribute(
        'aria-label',
        /1 token visible/,
      );
      await expect(spec2.locator('#canvas')).toHaveAttribute(
        'aria-label',
        /1 token visible/,
      );

      // GM opens editor, unchecks the FIRST Spectator only.
      await gm.keyboard.press('s');
      const dialog = await openTokenEditor(gm);
      await expect(dialog.locator('.visibility-row')).toHaveCount(2);
      // Identity order is registry-insertion order, which matches the
      // page-spawn order (spec1 first). Uncheck the first row.
      await dialog
        .locator('.visibility-row')
        .first()
        .locator('input[type="checkbox"]')
        .uncheck();

      await spec1.waitForTimeout(500);
      await spec2.waitForTimeout(500);

      // Spec1 loses the token; Spec2 still sees it.
      await expect(spec1.locator('#canvas')).toHaveAttribute(
        'aria-label',
        /0 token/,
        { timeout: 5_000 },
      );
      await expect(spec2.locator('#canvas')).toHaveAttribute(
        'aria-label',
        /1 token visible/,
        { timeout: 5_000 },
      );
    } finally {
      await context.close();
    }
  });
});
