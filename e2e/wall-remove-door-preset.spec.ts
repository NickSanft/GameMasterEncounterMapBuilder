/**
 * Phase 136 — door-removal preset.
 *
 * Validates that the new "Remove door" built-in preset, when applied
 * to a door wall, demotes it back to a regular blocking segment.
 * Closes the v117 future-polish item.
 */
import { test, expect, type Page } from '@playwright/test';

async function selectWallTool(page: Page) {
  await page.keyboard.press('w');
}

async function drawWall(
  page: Page,
  start: { x: number; y: number },
  end: { x: number; y: number },
) {
  await page.mouse.click(start.x, start.y);
  await page.mouse.click(end.x, end.y);
  // Esc ends the wall chain so the next interaction doesn't continue it.
  await page.keyboard.press('Escape');
}

async function openWallEditor(page: Page) {
  // Right-click on the wall mid-segment + open the editor.
  // The right-click context menu shows "Edit wall…".
  await page.mouse.click(500, 300, { button: 'right' });
  const menu = page.getByRole('menu');
  await menu.getByRole('menuitem', { name: /Edit wall/i }).click();
  return page.getByRole('dialog', { name: 'Edit wall' });
}

test.describe('Phase 136 — Remove door preset', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    await selectWallTool(page);
    // Draw a wall from (400, 300) → (600, 300) — horizontal segment.
    await drawWall(page, { x: 400, y: 300 }, { x: 600, y: 300 });
  });

  test('"Remove door" preset chip is present alongside the built-ins', async ({
    page,
  }) => {
    const editor = await openWallEditor(page);
    await expect(editor).toBeVisible();
    const chip = editor.locator('.wall-editor-preset-apply', {
      hasText: 'Remove door',
    });
    await expect(chip).toBeVisible();
  });

  test('applying "Wooden door (closed)" then "Remove door" leaves the wall non-doored', async ({
    page,
  }) => {
    const editor = await openWallEditor(page);

    // First apply the wooden-door preset (promotes the wall to a
    // door). The editor's "Is door" checkbox should flip to checked
    // (it's the visible signal for door promotion).
    await editor
      .locator('.wall-editor-preset-apply', { hasText: 'Wooden door' })
      .click();
    await expect(editor.locator('input[data-field="door"]')).toBeChecked();

    // Now apply "Remove door". The host's onChange wrapper consumes
    // door: null and emits a remove + re-add patch. The editor's
    // "Is door" checkbox should flip back to unchecked.
    await editor
      .locator('.wall-editor-preset-apply', { hasText: 'Remove door' })
      .click();
    await expect(editor.locator('input[data-field="door"]')).not.toBeChecked();
  });
});
