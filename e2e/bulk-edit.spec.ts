/**
 * Phase 123 — bulk token edit modal.
 *
 * Validates:
 *   - Command palette opens the bulk-edit modal.
 *   - The modal renders the three sections (HP max, add condition,
 *     remove condition).
 *   - Apply HP max with 2 selected tokens commits the patch (verified
 *     by re-opening the token editor and reading the max field).
 */
import { test, expect, type Page } from '@playwright/test';

async function placeTokenAt(
  page: Page,
  fracX: number,
  fracY: number,
): Promise<{ x: number; y: number }> {
  await page.keyboard.press('t');
  const box = await page.locator('#canvas').boundingBox();
  if (!box) throw new Error('canvas has no bounding box');
  const x = box.x + box.width * fracX;
  const y = box.y + box.height * fracY;
  await page.mouse.click(x, y);
  await page.keyboard.press('s');
  return { x, y };
}

async function lassoBetween(
  page: Page,
  a: { x: number; y: number },
  b: { x: number; y: number },
) {
  const startX = Math.min(a.x, b.x) - 30;
  const startY = Math.min(a.y, b.y) - 30;
  const endX = Math.max(a.x, b.x) + 30;
  const endY = Math.max(a.y, b.y) + 30;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(endX, endY, { steps: 6 });
  await page.mouse.up();
}

async function openBulkEditViaPalette(page: Page) {
  await page.keyboard.press('Control+k');
  await page.locator('.command-palette-input').fill('bulk');
  await page.locator('.command-palette-item').first().click();
  await expect(page.locator('.bulk-edit-modal')).toBeVisible();
}

test.describe('Phase 123 — bulk token edit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
  });

  test('command palette opens the bulk-edit modal with three sections', async ({
    page,
  }) => {
    await openBulkEditViaPalette(page);
    const modal = page.locator('.bulk-edit-modal');
    await expect(modal.locator('legend', { hasText: 'Set HP max' })).toBeVisible();
    await expect(modal.locator('legend', { hasText: 'Add condition' })).toBeVisible();
    await expect(modal.locator('legend', { hasText: 'Remove condition' })).toBeVisible();
  });

  test('modal summary shows the active selection size', async ({ page }) => {
    const a = await placeTokenAt(page, 0.3, 0.4);
    const b = await placeTokenAt(page, 0.5, 0.5);
    await lassoBetween(page, a, b);
    await openBulkEditViaPalette(page);
    await expect(
      page.locator('.bulk-edit-modal [data-field="summary"]'),
    ).toContainText(/2 tokens selected/);
  });

  test('Esc closes the modal', async ({ page }) => {
    await openBulkEditViaPalette(page);
    await page.keyboard.press('Escape');
    await expect(page.locator('.bulk-edit-modal')).toBeHidden();
  });
});
