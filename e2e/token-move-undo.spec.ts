/**
 * Phase 122 — token movement undo (`Z` key).
 *
 * Validates:
 *   - Plain `Z` (no Ctrl) reverts the most recent token move without
 *     touching unrelated state.
 *   - `Z` with no recorded moves is a silent no-op (no crash, no state mutation).
 *   - Ctrl+Z still does the whole-state undo (a smoke check that the
 *     two paths are independent).
 */
import { test, expect, type Page } from '@playwright/test';

async function placeTokenAtCenter(page: Page) {
  await page.keyboard.press('t');
  const box = await page.locator('#canvas').boundingBox();
  if (!box) throw new Error('canvas has no bounding box');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

async function tokenColumnRow(
  page: Page,
): Promise<{ col: number; row: number } | null> {
  // The canvas-outline lists each token as "{label} at column X, row Y"
  // — match on the "at column" prefix to disambiguate from other kinds.
  const text = await page
    .locator('.canvas-outline li', { hasText: 'at column' })
    .first()
    .textContent();
  if (!text) return null;
  const m = text.match(/column (\d+), row (\d+)/);
  if (!m) return null;
  return { col: Number(m[1]), row: Number(m[2]) };
}

async function tokenItemCount(page: Page): Promise<number> {
  return await page
    .locator('.canvas-outline li', { hasText: 'at column' })
    .count();
}

test.describe('Phase 122 — token movement undo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
  });

  test('plain Z reverts the most recent token move', async ({ page }) => {
    await placeTokenAtCenter(page);
    // Outline is debounced 120 ms — wait for it to populate.
    await expect.poll(async () => await tokenItemCount(page)).toBe(1);
    const start = await tokenColumnRow(page);
    expect(start).not.toBeNull();

    // Switch to Select tool + select the token.
    await page.keyboard.press('s');
    const box = await page.locator('#canvas').boundingBox();
    if (!box) throw new Error('canvas has no bounding box');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

    // Move 1 cell right via ArrowRight.
    await page.keyboard.press('ArrowRight');
    await expect
      .poll(async () => (await tokenColumnRow(page))?.col)
      .toBe(start!.col + 1);

    // Press Z — should revert.
    await page.keyboard.press('z');
    await expect
      .poll(async () => (await tokenColumnRow(page))?.col)
      .toBe(start!.col);
  });

  test('Z with no moves recorded is a silent no-op', async ({ page }) => {
    await placeTokenAtCenter(page);
    await expect.poll(async () => await tokenItemCount(page)).toBe(1);
    const start = await tokenColumnRow(page);
    // No moves yet — Z should not crash + position should be unchanged.
    await page.keyboard.press('z');
    // Brief settle, then check position is unchanged.
    await page.waitForTimeout(200);
    const after = await tokenColumnRow(page);
    expect(after).toEqual(start);
  });

  test('Ctrl+Z (whole-state undo) is independent of plain Z', async ({ page }) => {
    await placeTokenAtCenter(page);
    await expect.poll(async () => await tokenItemCount(page)).toBe(1);
    // Ctrl+Z should rewind the token-add patch, removing the token.
    await page.keyboard.press('Control+z');
    // After whole-state undo the token list should be empty.
    await expect.poll(async () => await tokenItemCount(page)).toBe(0);
  });
});
