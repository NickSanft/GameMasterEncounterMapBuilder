import { test, expect, type Page } from '@playwright/test';

/**
 * Phase 58 — "Follow-the-fog" exploration mode.
 *
 * The pixel-level fog state isn't directly observable in the DOM, so
 * we lean on the GM canvas's `aria-label` to assert state changes:
 * the label includes "X% of fog revealed", recomputed on every patch.
 * Going from 0% → some-positive% after enabling the pref + placing a
 * viewer is enough to prove the auto-reveal pipeline fired without
 * the GM ever touching the Reveal tool.
 */

async function enableLoSAndAutoReveal(page: Page) {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Settings' });
  await dialog.getByRole('tab', { name: 'Grid' }).click();
  await dialog.locator('input[data-field="losMode"]').check();
  await dialog.locator('input[data-field="autoRevealFromViewers"]').check();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
}

async function fogPercent(page: Page): Promise<number> {
  const label = await page.locator('#canvas').getAttribute('aria-label');
  // Format: "GM battle map. N tokens placed. P% of fog revealed."
  const match = label?.match(/(\d+)% of fog revealed/);
  return match ? parseInt(match[1]!, 10) : 0;
}

test.describe('Follow-the-fog auto-reveal (Phase 58)', () => {
  test('Settings exposes the toggle, gated behind Dynamic line of sight', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Settings' });
    await dialog.getByRole('tab', { name: 'Grid' }).click();

    const autoReveal = dialog.locator('input[data-field="autoRevealFromViewers"]');
    const losMode = dialog.locator('input[data-field="losMode"]');

    // Default off + disabled (LoS is off out of the box).
    await expect(autoReveal).not.toBeChecked();
    await expect(autoReveal).toBeDisabled();

    // Enabling LoS unlocks the auto-reveal control.
    await losMode.check();
    await expect(autoReveal).toBeEnabled();

    // Toggling auto-reveal persists.
    await autoReveal.check();
    await expect(autoReveal).toBeChecked();
  });

  test('Placing a viewer with the toggle on auto-reveals fog cells', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    // Establish baseline — no fog revealed at boot.
    expect(await fogPercent(page)).toBe(0);

    await enableLoSAndAutoReveal(page);

    // Place a token at the canvas center.
    await page.keyboard.press('t');
    const box = await page.locator('#canvas').boundingBox();
    if (!box) throw new Error('canvas has no bounding box');
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.click(cx, cy);

    // Open the editor and turn on the viewer toggle so it has a sight
    // radius (default 30 ft). Auto-reveal fires the next time LoS
    // recomputes (which the toggle change triggers).
    await page.keyboard.press('s');
    await page.mouse.click(cx, cy);
    await page.keyboard.press('e');
    const dialog = page.getByRole('dialog', { name: 'Edit Token' });
    await expect(dialog).toBeVisible();
    await dialog.locator('input[data-field="hasSight"]').check();
    await page.keyboard.press('Escape');

    // Give the LoS worker + auto-reveal patch + canvas-label debounce
    // (250ms) a moment to settle.
    await page.waitForTimeout(700);

    const after = await fogPercent(page);
    expect(after).toBeGreaterThan(0);
  });

  test('Toggling the pref off stops further auto-reveals', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await enableLoSAndAutoReveal(page);

    // Place a viewer + capture the initial revealed%.
    await page.keyboard.press('t');
    const box = await page.locator('#canvas').boundingBox();
    if (!box) throw new Error('canvas has no bounding box');
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.click(cx, cy);
    await page.keyboard.press('s');
    await page.mouse.click(cx, cy);
    await page.keyboard.press('e');
    const editor = page.getByRole('dialog', { name: 'Edit Token' });
    await editor.locator('input[data-field="hasSight"]').check();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(700);

    const initial = await fogPercent(page);
    expect(initial).toBeGreaterThan(0);

    // Now turn the toggle OFF, then nudge the viewer with arrow keys.
    // Already-revealed cells should stay revealed (one-way), but the
    // newly-visible cells from the move should NOT auto-reveal.
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const settings = page.getByRole('dialog', { name: 'Settings' });
    await settings.getByRole('tab', { name: 'Grid' }).click();
    await settings.locator('input[data-field="autoRevealFromViewers"]').uncheck();
    await page.keyboard.press('Escape');

    // Make sure the token is still selected, then nudge it several
    // cells to expose new terrain that previously wasn't in the
    // viewer's polygon.
    await page.mouse.click(cx, cy);
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(700);

    const afterToggleOff = await fogPercent(page);
    // Net revealed should not have INCREASED meaningfully — there
    // might be tiny visual flicker but the floor of the integer-
    // percent should be the same as `initial` (since auto-reveal
    // is the only thing that adds revealed cells in this flow).
    expect(afterToggleOff).toBeLessThanOrEqual(initial);
  });
});
