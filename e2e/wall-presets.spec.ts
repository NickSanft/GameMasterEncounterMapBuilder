/**
 * Phase 117 — wall presets in the wall editor.
 *
 * Validates:
 *   - The preset chip strip + Save button render in the wall editor.
 *   - Built-in presets are present (Stone exterior, etc.).
 *   - Clicking a built-in chip applies its properties to the
 *     selected wall (verified via the editor's slider value flipping).
 *   - "Save…" persists a user preset (the new chip appears + the
 *     editor reloads it across modal close + re-open).
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

async function openWallEditor(page: Page) {
  await activateWalls(page);
  const { midX, midY } = await drawSegment(page);
  await page.keyboard.press('s');
  await page.mouse.click(midX, midY, { button: 'right' });
  await page.getByRole('menuitem', { name: /Edit wall/ }).click();
  const modal = page.locator('.wall-editor');
  await expect(modal).toBeVisible();
  return { modal, midX, midY };
}

test.describe('Phase 117 — wall presets', () => {
  test('preset chips + Save button render with the built-ins', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    const { modal } = await openWallEditor(page);

    const chips = modal.locator('.wall-editor-preset-chip');
    // 6 built-ins: stone-exterior, interior-divider, window,
    // secret-passage, wooden-door-closed, remove-door (Phase 136).
    await expect(chips).toHaveCount(6);
    await expect(modal.locator('.wall-editor-preset-apply', { hasText: 'Stone exterior' })).toBeVisible();
    await expect(modal.locator('.wall-editor-preset-apply', { hasText: 'Remove door' })).toBeVisible();
    await expect(modal.locator('.wall-editor-presets-save')).toBeVisible();
  });

  test('clicking a built-in preset applies its thickness to the wall', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    const { modal } = await openWallEditor(page);

    // Stone exterior preset has thickness 8 px.
    await modal.locator('.wall-editor-preset-apply', { hasText: 'Stone exterior' }).click();
    // The thickness output reads "8.0 px" once the patch lands.
    await expect(modal.locator('[data-field="thickness-out"]')).toHaveText(
      /8\.0 px/,
    );
  });

  test('Save creates a user preset chip that persists across re-open', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    const { modal, midX, midY } = await openWallEditor(page);

    // Stub window.prompt to supply the preset name.
    await page.evaluate(() => {
      (
        window as unknown as { prompt: (msg: string, def?: string) => string | null }
      ).prompt = () => 'My wall';
    });
    await modal.locator('.wall-editor-presets-save').click();

    // New chip appears with the supplied name.
    const myChip = modal.locator(
      '.wall-editor-preset-chip.is-user .wall-editor-preset-apply',
      { hasText: 'My wall' },
    );
    await expect(myChip).toBeVisible();

    // Close + re-open via right-click — the chip persists.
    await modal.locator('[data-field="done"]').click();
    await expect(modal).toBeHidden();

    await page.mouse.click(midX, midY, { button: 'right' });
    await page.getByRole('menuitem', { name: /Edit wall/ }).click();
    await expect(modal).toBeVisible();
    await expect(
      modal.locator('.wall-editor-preset-chip.is-user .wall-editor-preset-apply', {
        hasText: 'My wall',
      }),
    ).toBeVisible();
  });

  test('user preset has a delete button that removes the chip', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    const { modal } = await openWallEditor(page);

    // Save a preset first.
    await page.evaluate(() => {
      (
        window as unknown as { prompt: (msg: string, def?: string) => string | null }
      ).prompt = () => 'Throwaway';
    });
    await modal.locator('.wall-editor-presets-save').click();
    const userChip = modal.locator('.wall-editor-preset-chip.is-user', {
      hasText: 'Throwaway',
    });
    await expect(userChip).toBeVisible();

    // Click the × inside the chip.
    await userChip.locator('.wall-editor-preset-delete').click();
    await expect(userChip).toHaveCount(0);
  });
});
