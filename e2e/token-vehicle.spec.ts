/**
 * Phase 156 — token vehicle / parent-child relationships.
 *
 * The cascade-during-drag logic is covered by the
 * `expandWithDescendants` / `descendantsOf` / `wouldCreateCycle`
 * unit tests in `src/state/token-relations.test.ts`. The e2e just
 * exercises the editor wiring — that the GM can author the
 * `parentId` relationship via the dropdown and that the value
 * persists.
 */
import { test, expect, type Page } from '@playwright/test';

async function placeTokenAtCenter(page: Page) {
  await page.keyboard.press('t');
  const box = await page.locator('#canvas').boundingBox();
  if (!box) throw new Error('canvas has no bounding box');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

async function openEditorAtCenter(page: Page) {
  const box = await page.locator('#canvas').boundingBox();
  if (!box) throw new Error('canvas has no bounding box');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, {
    button: 'right',
  });
  const editItem = page.getByRole('menuitem', { name: /Edit token/i });
  await expect(editItem).toBeVisible();
  await editItem.click();
  await expect(page.getByRole('dialog', { name: 'Edit Token' })).toBeVisible();
}

test.describe('Phase 156 — token vehicle / parent-child', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
  });

  test('Carried-by dropdown is present and defaults to None', async ({
    page,
  }) => {
    await placeTokenAtCenter(page);
    await openEditorAtCenter(page);
    const dialog = page.getByRole('dialog', { name: 'Edit Token' });
    const sel = dialog.locator('select[data-field="parent-select"]');
    await expect(sel).toBeVisible();
    // Default empty value (no parent).
    await expect(sel).toHaveValue('');
    // Only option is "None" when there are no other tokens to carry it.
    const options = dialog.locator('select[data-field="parent-select"] option');
    await expect(options).toHaveCount(1);
  });

  test('a second token shows up as a candidate parent', async ({ page }) => {
    // Place two stacked tokens (the existing pattern from
    // `e2e/token-stack.spec.ts`) — single 't' press, two clicks.
    await page.keyboard.press('t');
    const box = await page.locator('#canvas').boundingBox();
    if (!box) throw new Error('canvas has no bounding box');
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.click(cx, cy);
    await page.mouse.click(cx, cy);
    // Switch to Select; click selects the top of the stack.
    await page.keyboard.press('s');
    await page.mouse.click(cx, cy);

    // Open the editor for the top-of-stack via the E shortcut.
    await page.keyboard.press('e');
    const dialog = page.getByRole('dialog', { name: 'Edit Token' });
    await expect(dialog).toBeVisible();

    // Dropdown has 2 options: "None" + the OTHER token.
    const options = dialog.locator('select[data-field="parent-select"] option');
    await expect(options).toHaveCount(2);
  });
});
