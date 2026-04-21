import { test, expect, type Page } from '@playwright/test';

/**
 * Annotation (Note tool) coverage: drop via the Note tool, auto-save
 * text, visibility toggle, and delete via context menu.
 *
 * Text commits on every `input` event (no Save button), so all we need
 * to assert is that the editor opens, that typing into the textarea
 * persists through close+reopen, and that the context-menu flows work.
 */

async function placeAnnotationAtCenter(page: Page): Promise<{ x: number; y: number }> {
  // Activate Note tool (N) and click the canvas center.
  await page.keyboard.press('n');
  const box = await page.locator('#canvas').boundingBox();
  if (!box) throw new Error('canvas has no bounding box');
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.click(cx, cy);
  return { x: cx, y: cy };
}

test.describe('Annotations (Note tool)', () => {
  test('Note tool drops an annotation and opens the editor with an empty textarea', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await placeAnnotationAtCenter(page);

    const dialog = page.getByRole('dialog', { name: 'Edit Annotation' });
    await expect(dialog).toBeVisible();
    const textarea = dialog.locator('textarea[data-field="text"]');
    await expect(textarea).toBeFocused();
    await expect(textarea).toHaveValue('');

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('typed text auto-saves — closing and re-opening shows the same text', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    const { x, y } = await placeAnnotationAtCenter(page);
    const dialog = page.getByRole('dialog', { name: 'Edit Annotation' });
    const textarea = dialog.locator('textarea[data-field="text"]');

    await textarea.fill('Secret lever behind the torch.');
    // Close without hitting a Save button — input auto-saves.
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    // Right-click the annotation to re-open the editor.
    await page.keyboard.press('s');
    await page.mouse.click(x, y, { button: 'right' });
    await page.getByRole('menuitem', { name: /Edit annotation/ }).click();

    await expect(dialog).toBeVisible();
    await expect(textarea).toHaveValue('Secret lever behind the torch.');
    await page.keyboard.press('Escape');
  });

  test('visibility toggle flips the context-menu wording', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    const { x, y } = await placeAnnotationAtCenter(page);
    // Close the editor so the next right-click acts on the annotation.
    await page.keyboard.press('Escape');
    await page.keyboard.press('s');

    await page.mouse.click(x, y, { button: 'right' });
    await expect(page.getByRole('menu', { name: 'Annotation actions' })).toBeVisible();
    // Default annotation visibility is 'shared' → menu reads "Make GM-only".
    await page.getByRole('menuitem', { name: 'Make GM-only' }).click();

    // Re-open the menu; it should now offer the opposite toggle.
    await page.mouse.click(x, y, { button: 'right' });
    await expect(
      page.getByRole('menuitem', { name: 'Share with Spectator' }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('Delete annotation via context menu removes it', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    const { x, y } = await placeAnnotationAtCenter(page);
    await page.keyboard.press('Escape');
    await page.keyboard.press('s');

    await page.mouse.click(x, y, { button: 'right' });
    await page.getByRole('menuitem', { name: /Delete annotation/ }).click();

    // Right-click the same cell again — falls through to Map actions.
    await page.mouse.click(x, y, { button: 'right' });
    await expect(page.getByRole('menu', { name: 'Map actions' })).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('color swatch selection updates the active state in the editor', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await placeAnnotationAtCenter(page);
    const dialog = page.getByRole('dialog', { name: 'Edit Annotation' });
    const swatches = dialog.locator('[data-field="color-swatches"] .swatch');
    const count = await swatches.count();
    expect(count).toBeGreaterThan(1);

    // Click the second swatch and confirm it becomes active.
    const second = swatches.nth(1);
    await second.click();
    await expect(second).toHaveClass(/active/);
    await page.keyboard.press('Escape');
  });
});
