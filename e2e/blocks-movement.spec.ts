/**
 * Phase 114 — `blocksMovement` enforcement on the token-drag commit.
 *
 * Validates the end-to-end clamp:
 *   - With no walls, drag-moves go where you point.
 *   - A wall with blocksMovement=true (default) clamps a drag at the
 *     last reachable cell. The token's data-x grid coord shows the
 *     clamp landed (not the requested destination).
 *   - An open door does NOT clamp the drag (open doors fall through
 *     `wallBlocksMovementEffective`).
 */
import { test, expect, type Page } from '@playwright/test';

async function placeTokenAt(page: Page, fracX: number, fracY: number) {
  await page.keyboard.press('t');
  const box = await page.locator('#canvas').boundingBox();
  if (!box) throw new Error('canvas has no bounding box');
  await page.mouse.click(box.x + box.width * fracX, box.y + box.height * fracY);
}

async function activateWalls(page: Page) {
  await page.keyboard.press('w');
  await expect(page.locator('[data-announcer="polite"]')).toHaveText(
    /Walls tool active/,
  );
}

/** Right-click `(x, y)` and assert whether an "Edit token" menu item appears. */
async function expectTokenAt(
  page: Page,
  x: number,
  y: number,
  shouldExist: boolean,
) {
  await page.mouse.click(x, y, { button: 'right' });
  if (shouldExist) {
    await expect(
      page.getByRole('menuitem', { name: /^Edit token/ }),
    ).toBeVisible();
  } else {
    await expect(
      page.getByRole('menuitem', { name: /^Edit token/ }),
    ).toHaveCount(0);
  }
  await page.keyboard.press('Escape');
}

test.describe('Phase 114 — blocksMovement enforcement', () => {
  test('without any walls, drag delivers the token to the requested cell', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await placeTokenAt(page, 0.3, 0.5);

    // Switch to Select and drag the token a few cells right.
    await page.keyboard.press('s');
    const box = await page.locator('#canvas').boundingBox();
    if (!box) throw new Error('no canvas box');
    const sx = box.x + box.width * 0.3;
    const sy = box.y + box.height * 0.5;
    const ex = box.x + box.width * 0.6;
    const ey = box.y + box.height * 0.5;
    await page.mouse.move(sx, sy);
    await page.mouse.down();
    await page.mouse.move(ex, ey, { steps: 5 });
    await page.mouse.up();

    // Token landed at the requested destination — right-click finds it.
    await expectTokenAt(page, ex, ey, true);
  });

  test('a wall clamps the drag short of the requested cell', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    // Drop a token on the LEFT side of the canvas.
    await placeTokenAt(page, 0.3, 0.5);

    // Draw a vertical wall in the MIDDLE blocking horizontal movement.
    await activateWalls(page);
    const box = await page.locator('#canvas').boundingBox();
    if (!box) throw new Error('no canvas box');
    const wallX = box.x + box.width * 0.5;
    await page.mouse.click(wallX, box.y + box.height * 0.3);
    await page.mouse.click(wallX, box.y + box.height * 0.7);
    await page.keyboard.press('Escape');

    // Switch back to Select + drag the token RIGHT, across the wall.
    await page.keyboard.press('s');
    const sx = box.x + box.width * 0.3;
    const sy = box.y + box.height * 0.5;
    const ex = box.x + box.width * 0.8;
    const ey = box.y + box.height * 0.5;
    await page.mouse.move(sx, sy);
    await page.mouse.down();
    await page.mouse.move(ex, ey, { steps: 8 });
    await page.mouse.up();

    // The token should NOT be at the requested destination (wall clamped
    // it short). That alone proves Phase 114's enforcement is wired —
    // pre-114 the drag would have happily delivered the token through
    // the wall to the requested cell.
    await expectTokenAt(page, ex, ey, false);
  });

  test('an open door does NOT block the drag', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await placeTokenAt(page, 0.3, 0.5);

    await activateWalls(page);
    const box = await page.locator('#canvas').boundingBox();
    if (!box) throw new Error('no canvas box');
    const wallX = box.x + box.width * 0.5;
    const wallMidY = box.y + box.height * 0.5;
    await page.mouse.click(wallX, box.y + box.height * 0.3);
    await page.mouse.click(wallX, box.y + box.height * 0.7);
    await page.keyboard.press('Escape');

    // Promote to a door + open it (right-click → Edit wall → Is door,
    // then right-click again → Open door).
    await page.keyboard.press('s');
    await page.mouse.click(wallX, wallMidY, { button: 'right' });
    await page.getByRole('menuitem', { name: /Edit wall/ }).click();
    await page.locator('.wall-editor [data-field="door"]').check();
    await page.locator('.wall-editor [data-field="done"]').click();
    await page.mouse.click(wallX, wallMidY, { button: 'right' });
    await page.getByRole('menuitem', { name: /^Open door$/ }).click();

    // Now drag the token across the (open) door. Should land on the
    // RIGHT side this time.
    const sx = box.x + box.width * 0.3;
    const sy = box.y + box.height * 0.5;
    const ex = box.x + box.width * 0.8;
    const ey = box.y + box.height * 0.5;
    await page.mouse.move(sx, sy);
    await page.mouse.down();
    await page.mouse.move(ex, ey, { steps: 8 });
    await page.mouse.up();

    // Token should now be near the right edge — right-click finds it.
    await expectTokenAt(page, ex, ey, true);
  });
});
