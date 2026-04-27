/**
 * Phase 113 — door entities.
 *
 * Validates the end-to-end door authoring + toggle flow:
 *   - The wall editor exposes an "Is door" checkbox (Phase 113).
 *   - Promoting a wall to a door shows the "Currently open" sub-toggle.
 *   - Right-click on a door surfaces an "Open door" / "Close door"
 *     menu entry that flips the state without opening the editor.
 *   - The same right-click action labels flip based on current state.
 */
import { test, expect, type Page } from '@playwright/test';

async function activateWalls(page: Page) {
  await page.keyboard.press('w');
  await expect(page.locator('[data-announcer="polite"]')).toHaveText(
    /Walls tool active/,
  );
}

async function drawSegment(page: Page) {
  const box = await page.locator('#canvas').boundingBox();
  if (!box) throw new Error('canvas has no bounding box');
  const x1 = box.x + box.width * 0.4;
  const y1 = box.y + box.height * 0.5;
  const x2 = box.x + box.width * 0.6;
  const y2 = box.y + box.height * 0.5;
  await page.mouse.click(x1, y1);
  await page.mouse.click(x2, y2);
  await page.keyboard.press('Escape');
  return { midX: (x1 + x2) / 2, midY: (y1 + y2) / 2 };
}

test.describe('Phase 113 — door entities', () => {
  test('wall editor exposes an "Is door" checkbox + opens "Currently open" sub-toggle when checked', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    await activateWalls(page);
    const { midX, midY } = await drawSegment(page);

    // Right-click → Edit wall.
    await page.keyboard.press('s');
    await page.mouse.click(midX, midY, { button: 'right' });
    await page.getByRole('menuitem', { name: /Edit wall/ }).click();

    const modal = page.locator('.wall-editor');
    await expect(modal).toBeVisible();

    // The Is door checkbox is hidden until checked.
    const doorBox = modal.locator('[data-field="door"]');
    await expect(doorBox).toBeVisible();
    await expect(doorBox).not.toBeChecked();

    // The state sub-toggle starts hidden.
    const stateRow = modal.locator('[data-field="door-state-row"]');
    await expect(stateRow).toBeHidden();

    // Promote the wall to a door.
    await doorBox.check();
    await expect(stateRow).toBeVisible();
    await expect(modal.locator('[data-field="door-open"]')).not.toBeChecked();
  });

  test('right-click on a door surfaces "Open door" → toggles to "Close door"', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    await activateWalls(page);
    const { midX, midY } = await drawSegment(page);

    // Promote to door via the editor.
    await page.keyboard.press('s');
    await page.mouse.click(midX, midY, { button: 'right' });
    await page.getByRole('menuitem', { name: /Edit wall/ }).click();
    await page.locator('.wall-editor [data-field="door"]').check();
    // Close the modal.
    await page.locator('.wall-editor [data-field="done"]').click();
    await expect(page.locator('.wall-editor')).toBeHidden();

    // Right-click again → should now have an "Open door" entry.
    await page.mouse.click(midX, midY, { button: 'right' });
    const openEntry = page.getByRole('menuitem', { name: /^Open door$/ });
    await expect(openEntry).toBeVisible();
    await openEntry.click();

    // Polite announcer confirms the toggle.
    await expect(page.locator('[data-announcer="polite"]')).toContainText(
      /Door opened/i,
      { timeout: 3_000 },
    );

    // Right-click again — now should offer "Close door".
    await page.mouse.click(midX, midY, { button: 'right' });
    await expect(
      page.getByRole('menuitem', { name: /^Close door$/ }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('non-door segment walls do NOT show the door open/close menu entry', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    await activateWalls(page);
    const { midX, midY } = await drawSegment(page);

    await page.keyboard.press('s');
    await page.mouse.click(midX, midY, { button: 'right' });
    // The Wall actions menu shows but no Open/Close door entry.
    await expect(
      page.getByRole('menu', { name: 'Wall actions' }),
    ).toBeVisible();
    await expect(
      page.getByRole('menuitem', { name: /^Open door$|^Close door$/ }),
    ).toHaveCount(0);
    await page.keyboard.press('Escape');
  });
});
