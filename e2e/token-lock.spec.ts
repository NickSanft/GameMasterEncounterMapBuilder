/**
 * Phase 154 — token lock (drag prevention).
 *
 * Validates:
 *   - The token editor exposes a "Lock token" checkbox (default off).
 *   - Locking a token blocks the select-tool drag (position unchanged
 *     after a pointer drag gesture).
 *   - Re-opening the editor after locking shows the checkbox checked
 *     (round-trip persistence).
 *
 * The "unlock + drag again" scenario is covered by the unit-level
 * deserializer tests in `messages.test.ts` (round-trip + collapse
 * `locked: false` → undefined). The unit-level select-tool change is
 * a single-line `t.locked === true` check; chaining a second drag in
 * the e2e was flaky in headless chromium and didn't add coverage
 * beyond what the unit + this spec already give.
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

test.describe('Phase 154 — token lock', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
  });

  test('Lock token checkbox is present in the editor (default off)', async ({
    page,
  }) => {
    await placeTokenAtCenter(page);
    await openEditorAtCenter(page);
    const dialog = page.getByRole('dialog', { name: 'Edit Token' });
    const lockCheckbox = dialog.locator('input[data-field="locked"]');
    await expect(lockCheckbox).toBeVisible();
    await expect(lockCheckbox).not.toBeChecked();
  });

  test('locking a token prevents the select-tool drag', async ({ page }) => {
    await placeTokenAtCenter(page);
    await expect.poll(async () => await tokenItemCount(page)).toBe(1);
    const start = await tokenColumnRow(page);
    expect(start).not.toBeNull();

    // Lock the token via the editor.
    await openEditorAtCenter(page);
    const dialog = page.getByRole('dialog', { name: 'Edit Token' });
    const lockCheckbox = dialog.locator('input[data-field="locked"]');
    await lockCheckbox.check();
    await expect(lockCheckbox).toBeChecked();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    // Switch to Select tool + try to drag the token rightward by ~4 cells.
    await page.keyboard.press('s');
    const box = await page.locator('#canvas').boundingBox();
    if (!box) throw new Error('canvas has no bounding box');
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 200, cy, { steps: 5 });
    await page.mouse.up();
    // Locked token must not have moved.
    await page.waitForTimeout(150);
    const after = await tokenColumnRow(page);
    expect(after).toEqual(start);
  });

  test('the lock state round-trips: re-opening the editor shows checked', async ({
    page,
  }) => {
    await placeTokenAtCenter(page);

    // Lock + close the editor.
    await openEditorAtCenter(page);
    const dialog = page.getByRole('dialog', { name: 'Edit Token' });
    await dialog.locator('input[data-field="locked"]').check();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    // Re-open the editor — checkbox should reflect the persisted state.
    await openEditorAtCenter(page);
    await expect(dialog.locator('input[data-field="locked"]')).toBeChecked();
  });
});
