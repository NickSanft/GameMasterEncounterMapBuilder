/**
 * Phase 111 — wider walls + "Fill cell" preset.
 *
 * Validates:
 *   - The Fill cell button is present in the wall editor (Phase 111
 *     wires `getCellSize` from gm.ts so the button shows).
 *   - Clicking it bumps the wall's thickness to the current grid
 *     `cellSize`, observable in the slider's output.
 *   - The thickness slider's max attribute reflects the new
 *     WALL_MAX_THICKNESS_PX = 48 (pre-111 it was 12).
 */
import { test, expect, type Page } from '@playwright/test';

async function activateWalls(page: Page) {
  await page.keyboard.press('w');
  await expect(page.locator('[data-announcer="polite"]')).toHaveText(
    /Walls tool active/,
  );
}

async function drawWall(page: Page) {
  const box = await page.locator('#canvas').boundingBox();
  if (!box) throw new Error('canvas has no bounding box');
  const x1 = box.x + box.width * 0.35;
  const y1 = box.y + box.height * 0.5;
  const x2 = box.x + box.width * 0.6;
  const y2 = box.y + box.height * 0.5;
  await page.mouse.click(x1, y1);
  await page.mouse.click(x2, y2);
  await page.keyboard.press('Escape');
  return { midX: (x1 + x2) / 2, midY: (y1 + y2) / 2 };
}

async function openWallEditor(page: Page) {
  await activateWalls(page);
  const { midX, midY } = await drawWall(page);
  await page.keyboard.press('s');
  await page.mouse.click(midX, midY, { button: 'right' });
  await page.getByRole('menuitem', { name: /Edit wall/ }).click();
  const modal = page.locator('.wall-editor');
  await expect(modal).toBeVisible();
  return modal;
}

test.describe('Phase 111 — wider walls + Fill cell preset', () => {
  test('thickness slider max attribute is 48 (was 12 pre-Phase-111)', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    const modal = await openWallEditor(page);
    const slider = modal.locator('[data-field="thickness"]');
    await expect(slider).toHaveAttribute('max', '48');
  });

  test('Fill cell button is visible (gm.ts wires getCellSize)', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    const modal = await openWallEditor(page);
    const btn = modal.locator('[data-field="fill-cell"]');
    await expect(btn).toBeVisible();
    await expect(btn).toHaveText(/Fill cell/i);
  });

  test('clicking Fill cell sets the thickness output to match the grid cell size', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    const modal = await openWallEditor(page);

    // Default grid cellSize on a fresh session is 50 px (well under
    // the 48 px clamp would matter — but 50 > 48, so the result
    // clamps to 48). This also exercises the clamp path end-to-end.
    await modal.locator('[data-field="fill-cell"]').click();
    await expect(modal.locator('[data-field="thickness-out"]')).toHaveText(
      /48\.0 px/,
    );
  });
});
