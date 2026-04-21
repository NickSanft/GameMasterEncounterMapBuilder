import { test, expect, type Page } from '@playwright/test';

/**
 * AoE tool coverage: shape selection on the side panel, drag-to-place,
 * right-click context menu (AoE actions vs Map actions), visibility
 * toggle, and delete-via-context-menu.
 *
 * Assertions lean on the side-panel button state + the right-click menu
 * label ("AoE actions" appears only when an AoE was hit-tested) since
 * the app doesn't expose a direct DOM readout of placed templates.
 */

async function activateAoe(page: Page) {
  await page.keyboard.press('y');
  await expect(page.locator('.aoe-settings')).toBeVisible();
}

async function dragAoeOnCanvas(page: Page) {
  const box = await page.locator('#canvas').boundingBox();
  if (!box) throw new Error('canvas has no bounding box');
  // Short drag near the canvas center so we know where to right-click later.
  const startX = box.x + box.width * 0.5;
  const startY = box.y + box.height * 0.5;
  const endX = box.x + box.width * 0.5 + 60;
  const endY = box.y + box.height * 0.5 + 30;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(endX, endY, { steps: 4 });
  await page.mouse.up();
  return { centerX: (startX + endX) / 2, centerY: (startY + endY) / 2 };
}

test.describe('AoE tool', () => {
  test('Y shortcut activates AoE; settings panel shows the four preset shapes', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await activateAoe(page);
    const panel = page.locator('.aoe-settings');
    for (const label of ['Sphere', 'Cone', 'Line', 'Cube']) {
      await expect(
        panel.locator('.aoe-kinds button', { hasText: label }),
      ).toBeVisible();
    }
  });

  test('clicking a shape button flips its active class', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await activateAoe(page);
    const coneBtn = page.locator('.aoe-kinds button', { hasText: 'Cone' });
    // Sphere is the default active kind.
    await expect(
      page.locator('.aoe-kinds button', { hasText: 'Sphere' }),
    ).toHaveClass(/active/);
    await coneBtn.click();
    await expect(coneBtn).toHaveClass(/active/);
    await expect(
      page.locator('.aoe-kinds button', { hasText: 'Sphere' }),
    ).not.toHaveClass(/active/);
  });

  test('dragging on the canvas places an AoE, right-click surfaces "AoE actions"', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await activateAoe(page);
    const { centerX, centerY } = await dragAoeOnCanvas(page);

    // Switch to Select so the right-click hit-tests the placed AoE
    // instead of starting a new placement.
    await page.keyboard.press('s');
    await page.mouse.click(centerX, centerY, { button: 'right' });

    // The context menu's aria-label shifts to "AoE actions" when the
    // hit-test lands on an AoE template.
    await expect(
      page.getByRole('menu', { name: 'AoE actions' }),
    ).toBeVisible();
    // Expected items: visibility toggle + separator + Delete.
    await expect(
      page.getByRole('menuitem', { name: /Make AoE GM-only|Share AoE with Spectator/ }),
    ).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /Delete AoE/ })).toBeVisible();

    // Dismiss the menu.
    await page.keyboard.press('Escape');
  });

  test('Delete AoE via context menu removes the template (right-click reverts to Map actions)', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await activateAoe(page);
    const { centerX, centerY } = await dragAoeOnCanvas(page);

    await page.keyboard.press('s');
    await page.mouse.click(centerX, centerY, { button: 'right' });
    await page.getByRole('menuitem', { name: /Delete AoE/ }).click();

    // After delete, right-clicking the same spot falls through to the
    // Map-actions menu ("Place token here" etc.), confirming the AoE
    // is gone.
    await page.mouse.click(centerX, centerY, { button: 'right' });
    await expect(page.getByRole('menu', { name: 'Map actions' })).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('visibility toggle flips the context-menu wording', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await activateAoe(page);
    const { centerX, centerY } = await dragAoeOnCanvas(page);
    await page.keyboard.press('s');

    await page.mouse.click(centerX, centerY, { button: 'right' });
    // Default is shared → item reads "Make AoE GM-only".
    await page.getByRole('menuitem', { name: 'Make AoE GM-only' }).click();

    // Re-open the menu; it should now offer "Share AoE with Spectator".
    await page.mouse.click(centerX, centerY, { button: 'right' });
    await expect(
      page.getByRole('menuitem', { name: 'Share AoE with Spectator' }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
  });
});
