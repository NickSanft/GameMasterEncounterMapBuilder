/**
 * Phase 102 — named camera bookmarks.
 *
 * Validates:
 *   - The Camera Bookmarks modal opens via the command palette
 *     and shows the empty-state copy when no bookmarks exist.
 *   - Saving a bookmark via the modal's "Save current camera…"
 *     button persists across modal close + re-open.
 *   - The Alt+1 hotkey jumps to the first (newest) bookmark and
 *     announces it through the polite live region.
 *
 * The renderer's camera lives in memory; we exercise the
 * announcer + the modal contents (which are observable from the
 * DOM) rather than scraping renderer internals — same convention
 * as the Phase 100 / 101 specs.
 */
import { test, expect } from '@playwright/test';

test.describe('Phase 102 — camera bookmarks', () => {
  test('palette opens the modal; empty-state copy is shown', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await page.keyboard.press('Control+k');
    await page.locator('.command-palette-input').fill('camera bookmarks');
    await page.locator('.command-palette-item').first().click();

    const dialog = page.getByRole('dialog', { name: /camera bookmarks/i });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('.camera-bookmarks-empty')).toBeVisible();
  });

  test('saving a bookmark via the modal persists + is listed on re-open', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    // Stub window.prompt to supply the bookmark name.
    await page.evaluate(() => {
      (
        window as unknown as { prompt: (msg: string, def?: string) => string | null }
      ).prompt = () => 'Throne room';
    });

    await page.keyboard.press('Control+k');
    await page.locator('.command-palette-input').fill('camera bookmarks');
    await page.locator('.command-palette-item').first().click();

    const dialog = page.getByRole('dialog', { name: /camera bookmarks/i });
    await expect(dialog).toBeVisible();
    await dialog.locator('.camera-bookmarks-save-btn').click();

    // Row appears immediately after save.
    const row = dialog.locator('.camera-bookmark-row');
    await expect(row).toHaveCount(1);
    await expect(row.locator('.camera-bookmark-name')).toHaveText('Throne room');
    await expect(row.locator('.camera-bookmark-slot')).toHaveText('Alt+1');

    // Close + re-open: bookmark survives.
    await dialog.locator('.modal-close').click();
    await expect(dialog).toBeHidden();
    await page.keyboard.press('Control+k');
    await page.locator('.command-palette-input').fill('camera bookmarks');
    await page.locator('.command-palette-item').first().click();
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('.camera-bookmark-row')).toHaveCount(1);
  });

  test('Alt+1 jumps to the first bookmark + announces the jump', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await page.evaluate(() => {
      (
        window as unknown as { prompt: (msg: string, def?: string) => string | null }
      ).prompt = () => 'Library';
    });

    await page.keyboard.press('Control+k');
    await page.locator('.command-palette-input').fill('save current camera');
    await page.locator('.command-palette-item').first().click();

    // The announcer's polite live region should reflect the save.
    await expect(page.locator('[data-announcer="polite"]')).toContainText(
      /Saved camera bookmark: Library/i,
      { timeout: 2_000 },
    );

    // Now press Alt+1 — should fire the jump announcement.
    await page.keyboard.press('Alt+1');
    await expect(page.locator('[data-announcer="polite"]')).toContainText(
      /Jumped to bookmark: Library/i,
      { timeout: 2_000 },
    );
  });

  test('Alt+1 with no bookmarks announces the empty slot', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await page.keyboard.press('Alt+1');
    await expect(page.locator('[data-announcer="polite"]')).toContainText(
      /No camera bookmark in slot 1/i,
      { timeout: 2_000 },
    );
  });
});
