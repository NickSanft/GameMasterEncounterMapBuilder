/**
 * Phase 135 — hex-aware auto-reveal.
 *
 * Validates that when the grid is hex AND auto-reveal is enabled,
 * placing a viewer flips fog cells. The hex-grain rasterizer marks
 * cells whose containing hex's center is in the viewer polygon (vs
 * the v1.7 behavior of marking rect cells whose centers are in the
 * polygon).
 *
 * Smoke test: end-to-end flow from "hex grid + LoS + auto-reveal"
 * preferences → place a viewer → fog flips. Doesn't try to assert
 * the exact hex-shaped halo (would require pixel-level inspection).
 */
import { test, expect, type Page } from '@playwright/test';

async function enableLoSAndAutoReveal(page: Page) {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Settings' });
  await dialog.getByRole('tab', { name: 'Grid' }).click();
  await dialog.locator('input[data-field="losMode"]').check();
  await dialog.locator('input[data-field="autoRevealFromViewers"]').check();
  // Switch grid shape to hex (also on the Grid tab).
  await dialog.locator('select[data-field="gridShape"]').selectOption('hex');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
}

async function fogPercent(page: Page): Promise<number> {
  const label = await page.locator('#canvas').getAttribute('aria-label');
  const match = label?.match(/(\d+)% of fog revealed/);
  return match ? parseInt(match[1]!, 10) : 0;
}

test.describe('Phase 135 — hex-aware auto-reveal', () => {
  test('placing a viewer in hex mode auto-reveals fog cells', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    expect(await fogPercent(page)).toBe(0);

    await enableLoSAndAutoReveal(page);

    // Place a token at the canvas center.
    await page.keyboard.press('t');
    const box = await page.locator('#canvas').boundingBox();
    if (!box) throw new Error('canvas has no bounding box');
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.click(cx, cy);
    // Wait for the token to register in the canvas outline.
    await expect
      .poll(async () =>
        page.locator('.canvas-outline li', { hasText: 'at column' }).count(),
      )
      .toBe(1);

    // Promote to viewer via Phase 86 Tab keyboard navigation (focus
    // the canvas → Tab cycles to the first entity → 'e' opens the
    // editor). Avoids the v1.5 hex-snap quirk where the token's
    // world center lands at the hex center (not the click point), so
    // a follow-up click at (cx, cy) might miss the token's hit area.
    await page.locator('#canvas').focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('e');
    const dialog = page.getByRole('dialog', { name: 'Edit Token' });
    await expect(dialog).toBeVisible();
    await dialog.locator('input[data-field="hasSight"]').check();
    await page.keyboard.press('Escape');

    // Wait for LoS worker + auto-reveal patch + canvas-label debounce.
    await page.waitForTimeout(700);

    const after = await fogPercent(page);
    expect(after).toBeGreaterThan(0);
  });
});
