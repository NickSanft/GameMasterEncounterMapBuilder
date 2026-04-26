/**
 * Phase 85 — wall editor + in-place endpoint editing.
 *
 * Builds on the Phase 54 walls-tool spec: that one verifies the
 * draw / right-click / delete flow. This spec exercises the new
 * "Edit wall…" entry, the editor modal, and the endpoint-handle
 * drag for in-place geometry editing without delete-and-redraw.
 */
import { test, expect, type Page } from '@playwright/test';

async function activateWalls(page: Page) {
  await page.keyboard.press('w');
  await expect(page.locator('[data-announcer="polite"]')).toHaveText(
    /Walls tool active/,
  );
}

async function drawWallSegment(
  page: Page,
  a: { fracX: number; fracY: number },
  b: { fracX: number; fracY: number },
): Promise<{ midX: number; midY: number; aX: number; aY: number; bX: number; bY: number }> {
  const box = await page.locator('#canvas').boundingBox();
  if (!box) throw new Error('canvas has no bounding box');
  const x1 = box.x + box.width * a.fracX;
  const y1 = box.y + box.height * a.fracY;
  const x2 = box.x + box.width * b.fracX;
  const y2 = box.y + box.height * b.fracY;
  await page.mouse.click(x1, y1);
  await page.mouse.click(x2, y2);
  await page.keyboard.press('Escape');
  return { midX: (x1 + x2) / 2, midY: (y1 + y2) / 2, aX: x1, aY: y1, bX: x2, bY: y2 };
}

test.describe('Phase 85 — wall editor', () => {
  test('right-click "Edit wall…" opens the modal with the wall’s current state', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await activateWalls(page);
    const { midX, midY } = await drawWallSegment(
      page,
      { fracX: 0.35, fracY: 0.5 },
      { fracX: 0.6, fracY: 0.5 },
    );

    await page.keyboard.press('s');
    await page.mouse.click(midX, midY, { button: 'right' });
    await page.getByRole('menuitem', { name: /Edit wall/ }).click();

    const modal = page.locator('.wall-editor');
    await expect(modal).toBeVisible();
    await expect(modal.locator('[data-field="title"]')).toHaveText('Edit wall');

    // Defaults: blocksSight + blocksMovement = true; visibility = shared;
    // thickness defaults to 2.5.
    await expect(modal.locator('[data-field="sight"]')).toBeChecked();
    await expect(modal.locator('[data-field="movement"]')).toBeChecked();
    await expect(modal.locator('[data-field="vis-shared"]')).toBeChecked();
    await expect(modal.locator('[data-field="thickness-out"]')).toContainText(
      '2.5 px',
    );
  });

  test('toggling visibility to GM-only persists across the modal close', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await activateWalls(page);
    const { midX, midY } = await drawWallSegment(
      page,
      { fracX: 0.35, fracY: 0.5 },
      { fracX: 0.6, fracY: 0.5 },
    );

    await page.keyboard.press('s');
    await page.mouse.click(midX, midY, { button: 'right' });
    await page.getByRole('menuitem', { name: /Edit wall/ }).click();

    await page.locator('[data-field="vis-gm"]').check();
    await page.locator('[data-field="done"]').click();
    await expect(page.locator('.wall-editor')).toBeHidden();

    // Re-open via the E shortcut on the still-selected wall — visibility
    // should now read 'gm'.
    await page.keyboard.press('e');
    await expect(page.locator('.wall-editor')).toBeVisible();
    await expect(page.locator('[data-field="vis-gm"]')).toBeChecked();
  });

  test('Delete button in the editor removes the wall', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await activateWalls(page);
    const { midX, midY } = await drawWallSegment(
      page,
      { fracX: 0.4, fracY: 0.5 },
      { fracX: 0.6, fracY: 0.5 },
    );

    await page.keyboard.press('s');
    await page.mouse.click(midX, midY, { button: 'right' });
    await page.getByRole('menuitem', { name: /Edit wall/ }).click();
    await page.locator('[data-field="delete"]').click();

    // Wall is gone — right-clicking the same spot now shows Map actions
    // instead of Wall actions.
    await page.mouse.click(midX, midY, { button: 'right' });
    await expect(
      page.getByRole('menu', { name: 'Map actions' }),
    ).toBeVisible();
  });

  test('endpoint drag moves a single endpoint without deleting the wall', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await activateWalls(page);
    const { aX, aY, bX, bY } = await drawWallSegment(
      page,
      { fracX: 0.3, fracY: 0.5 },
      { fracX: 0.6, fracY: 0.5 },
    );

    // Select the wall by clicking its midpoint with the Select tool.
    await page.keyboard.press('s');
    const midX = (aX + bX) / 2;
    const midY = (aY + bY) / 2;
    await page.mouse.click(midX, midY);

    // Drag endpoint B downward by ~80px. The Phase 85 endpoint handle
    // is bigger than the unselected dot, so the click target is forgiving.
    await page.mouse.move(bX, bY);
    await page.mouse.down();
    await page.mouse.move(bX, bY + 80, { steps: 10 });
    await page.mouse.up();

    // Verify by re-opening the editor — the wall should still exist
    // (single click on its midpoint shows the Wall actions menu).
    // Wall is no longer horizontal so its midpoint shifted; click the
    // approximate new midpoint.
    await page.mouse.click(midX, midY + 40, { button: 'right' });
    await expect(
      page.getByRole('menu', { name: 'Wall actions' }),
    ).toBeVisible({ timeout: 5_000 });
  });
});
