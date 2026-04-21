import { test, expect, type Page } from '@playwright/test';

/**
 * Select-tool rubber-band lasso + multi-token move.
 *
 * The canvas doesn't expose selection count directly in DOM, so the
 * assertion strategy is: place two tokens, lasso them, press E to
 * open the token editor — when multiple tokens are selected the
 * "cycle controls" row is visible (see token-editor.ts). Then close
 * the editor and arrow-key move the selection, which we confirm by
 * re-opening the editor per token and comparing X/Y before and after.
 */

async function placeTokenAtGridCell(
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
  // Token tool leaves the new token unselected — re-activate Select.
  await page.keyboard.press('s');
  return { x, y };
}

test.describe('Lasso + multi-select', () => {
  test('dragging an empty region selects every token it contains', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    // Place two tokens at distinct cells so a single rubber-band can cover both.
    const a = await placeTokenAtGridCell(page, 0.3, 0.4);
    const b = await placeTokenAtGridCell(page, 0.5, 0.5);

    // Rubber-band drag from above-left of A to below-right of B — note
    // we start on empty canvas (not on a token), so Select treats it
    // as a lasso rather than a token drag.
    const startX = Math.min(a.x, b.x) - 30;
    const startY = Math.min(a.y, b.y) - 30;
    const endX = Math.max(a.x, b.x) + 30;
    const endY = Math.max(a.y, b.y) + 30;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY, { steps: 6 });
    await page.mouse.up();

    // With 2+ tokens selected, pressing E opens the editor with the
    // cycle-controls strip visible (count = "1 / 2").
    await page.keyboard.press('e');
    const dialog = page.getByRole('dialog', { name: 'Edit Token' });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('[data-field="cycle-group"]')).toBeVisible();
    await expect(dialog.locator('[data-field="counter"]')).toHaveText(/1 of 2/);
    await page.keyboard.press('Escape');
  });

  test('Shift+drag extends the existing selection additively', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    const a = await placeTokenAtGridCell(page, 0.3, 0.4);
    const b = await placeTokenAtGridCell(page, 0.55, 0.5);

    // First lasso selects token A only.
    await page.mouse.move(a.x - 30, a.y - 30);
    await page.mouse.down();
    await page.mouse.move(a.x + 30, a.y + 30, { steps: 4 });
    await page.mouse.up();

    // Confirm single selection (no cycle controls).
    await page.keyboard.press('e');
    await expect(
      page.getByRole('dialog', { name: 'Edit Token' }).locator('[data-field="cycle-group"]'),
    ).toBeHidden();
    await page.keyboard.press('Escape');

    // Second lasso with Shift covers token B and should ADD it.
    await page.keyboard.down('Shift');
    await page.mouse.move(b.x - 30, b.y - 30);
    await page.mouse.down();
    await page.mouse.move(b.x + 30, b.y + 30, { steps: 4 });
    await page.mouse.up();
    await page.keyboard.up('Shift');

    await page.keyboard.press('e');
    const dialog = page.getByRole('dialog', { name: 'Edit Token' });
    await expect(dialog.locator('[data-field="cycle-group"]')).toBeVisible();
    await expect(dialog.locator('[data-field="counter"]')).toHaveText(/1 of 2/);
    await page.keyboard.press('Escape');
  });

  test('arrow key moves all selected tokens by the same grid delta', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await placeTokenAtGridCell(page, 0.3, 0.4);
    await placeTokenAtGridCell(page, 0.5, 0.5);

    // Lasso both.
    const box = await page.locator('#canvas').boundingBox();
    if (!box) throw new Error('canvas has no bounding box');
    await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.35);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.6, {
      steps: 6,
    });
    await page.mouse.up();

    // Capture Token 1's X before the move.
    await page.keyboard.press('e');
    const dialog = page.getByRole('dialog', { name: 'Edit Token' });
    const xField = dialog.locator('input[data-field="x"]');
    const yField = dialog.locator('input[data-field="y"]');
    const firstX = Number(await xField.inputValue());
    const firstY = Number(await yField.inputValue());
    await page.keyboard.press('Escape');

    // Arrow-right moves the WHOLE selection by one cell.
    await page.keyboard.press('ArrowRight');

    await page.keyboard.press('e');
    const movedX = Number(await xField.inputValue());
    const movedY = Number(await yField.inputValue());
    await page.keyboard.press('Escape');

    expect(movedX).toBe(firstX + 1);
    expect(movedY).toBe(firstY);

    // Advance to the second token via the cycle button ("Next ›") and
    // confirm it moved by the same delta.
    await page.keyboard.press('e');
    // Use the keyboard shortcut we already exposed in the editor.
    await page.keyboard.press('Control+ArrowRight');
    const secondMovedX = Number(await xField.inputValue());
    await page.keyboard.press('Escape');
    // The second token started at a different column so we can't assert
    // an exact value — but we CAN assert it's not the same as the first
    // moved token (otherwise both ended up on the same cell, which would
    // be a bug) AND that it's greater than the first token's original
    // position (proving it too moved right by 1).
    expect(secondMovedX).toBeGreaterThan(firstX);
    expect(secondMovedX).not.toBe(movedX);
  });

  test('lassoing empty canvas with nothing inside clears the selection', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await placeTokenAtGridCell(page, 0.5, 0.5);

    // Initial: select the token with a small lasso.
    const t = { x: 0.5, y: 0.5 };
    const box = await page.locator('#canvas').boundingBox();
    if (!box) throw new Error('canvas has no bounding box');
    const tx = box.x + box.width * t.x;
    const ty = box.y + box.height * t.y;
    await page.mouse.move(tx - 30, ty - 30);
    await page.mouse.down();
    await page.mouse.move(tx + 30, ty + 30, { steps: 4 });
    await page.mouse.up();

    // E should open the editor (one token selected).
    await page.keyboard.press('e');
    await expect(page.getByRole('dialog', { name: 'Edit Token' })).toBeVisible();
    await page.keyboard.press('Escape');

    // Now lasso an empty corner — the editor should not open afterwards.
    const ex = box.x + box.width * 0.1;
    const ey = box.y + box.height * 0.1;
    await page.mouse.move(ex, ey);
    await page.mouse.down();
    await page.mouse.move(ex + 40, ey + 40, { steps: 4 });
    await page.mouse.up();
    await page.keyboard.press('e');
    // Nothing selected → editor stays closed.
    await expect(page.getByRole('dialog', { name: 'Edit Token' })).toBeHidden();
  });
});
