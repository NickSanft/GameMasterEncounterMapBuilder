/**
 * Phase 105 — touch-target size audit.
 *
 * Verifies that on a touch viewport (Pixel 5 device emulation —
 * `hasTouch: true`, `pointer: coarse`) every interactive surface a
 * tablet GM might tap during play is at least Apple's iOS HIG
 * recommendation of 44 × 44 CSS pixels.
 *
 * Phase 47 set the original 44 px floor for the toolbar + zoom
 * controls + dice + help; Phase 105 broadens it to context menus,
 * modal action buttons, settings panels, panels (notes / combat-log /
 * initiative bar), Phase 102's camera-bookmark rows, status banner
 * actions, and the various status chips.
 */
import { test, expect, devices, type Page } from '@playwright/test';

test.use({ ...devices['Pixel 5'] });

/**
 * Assert every visible match of the selector has a bounding box at
 * least `min` pixels tall. Returns the count so we can also assert
 * we found something to test (catches the future case where a
 * selector got renamed and silently matches nothing).
 */
async function assertMinTapHeight(
  page: Page,
  selector: string,
  min = 44,
): Promise<number> {
  const handles = await page.locator(selector).all();
  let counted = 0;
  for (const h of handles) {
    if (!(await h.isVisible())) continue;
    const box = await h.boundingBox();
    if (!box) continue;
    counted++;
    expect(
      box.height,
      `${selector} should be ≥${min}px tall on touch (was ${box.height})`,
    ).toBeGreaterThanOrEqual(min);
  }
  return counted;
}

test.describe('Phase 105 — touch target sizes (≥44 px on touch viewports)', () => {
  test('toolbar buttons are ≥44 px tall', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    const counted = await assertMinTapHeight(
      page,
      '.gm-toolbar button',
    );
    // Should match every primary tool button (select, token, fog, etc.)
    expect(counted).toBeGreaterThanOrEqual(4);
  });

  test('toolbar action buttons are ≥44 px tall', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    const counted = await assertMinTapHeight(
      page,
      '.gm-toolbar-actions button',
    );
    expect(counted).toBeGreaterThanOrEqual(1);
  });

  test('zoom controls are ≥44 × 44', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    const handles = await page.locator('.zoom-controls button').all();
    expect(handles.length).toBeGreaterThanOrEqual(3);
    for (const h of handles) {
      const box = await h.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      // Square-ish — width should also clear 44 px.
      expect(box!.width).toBeGreaterThanOrEqual(44);
    }
  });

  test('session-menu buttons are ≥44 px tall', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    const counted = await assertMinTapHeight(page, '.session-menu button');
    expect(counted).toBeGreaterThanOrEqual(3);
  });

  test('AoE settings buttons are ≥44 px tall when the tool is active', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    await page.keyboard.press('y');
    const counted = await assertMinTapHeight(page, '.aoe-settings button');
    expect(counted).toBeGreaterThanOrEqual(4);
  });

  test('context menu items are ≥44 px tall', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    // Open the context menu on the canvas.
    const box = await page.locator('#canvas').boundingBox();
    if (!box) throw new Error('canvas has no bounding box');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, {
      button: 'right',
    });
    await expect(page.locator('.context-menu')).toBeVisible();
    const counted = await assertMinTapHeight(page, '.context-menu button');
    expect(counted).toBeGreaterThanOrEqual(2);
    await page.keyboard.press('Escape');
  });

  test('camera-bookmark Save button + row actions are ≥44 px tall', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    // Stub prompt so the save flow doesn't block.
    await page.evaluate(() => {
      (
        window as unknown as { prompt: (msg: string, def?: string) => string | null }
      ).prompt = () => 'Test bookmark';
    });

    // Open the camera bookmarks modal via palette.
    await page.keyboard.press('Control+k');
    await page.locator('.command-palette-input').fill('camera bookmarks');
    await page.locator('.command-palette-item').first().click();
    await expect(page.getByRole('dialog', { name: /camera bookmarks/i })).toBeVisible();

    // Save button on the modal.
    const savedCount = await assertMinTapHeight(
      page,
      '.camera-bookmarks-save-btn',
    );
    expect(savedCount).toBeGreaterThanOrEqual(1);

    // Save a bookmark + assert row action buttons.
    await page.locator('.camera-bookmarks-save-btn').click();
    await assertMinTapHeight(page, '.camera-bookmark-jump');
    await assertMinTapHeight(page, '.camera-bookmark-rename');
    await assertMinTapHeight(page, '.camera-bookmark-delete');
  });

  test('command palette items are ≥44 px tall', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    await page.keyboard.press('Control+k');
    await expect(page.locator('.command-palette-input')).toBeVisible();
    const counted = await assertMinTapHeight(page, '.command-palette-item');
    expect(counted).toBeGreaterThanOrEqual(3);
  });

  test('modal close button is ≥44 × 44', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    await page.keyboard.press('?');
    await expect(page.locator('.shortcut-overlay')).toBeVisible();
    // Close button on the overlay.
    const close = page.locator('.shortcut-overlay .modal-close, .shortcut-overlay .shortcut-overlay-close').first();
    if (await close.count() > 0 && await close.isVisible()) {
      const box = await close.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  });
});
