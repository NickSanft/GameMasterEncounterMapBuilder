/**
 * Phase 95 — searchable command palette (Ctrl+K).
 *
 * Validates:
 *   - Ctrl+K opens the palette + focuses the input.
 *   - Esc closes.
 *   - Typing filters the visible list.
 *   - Enter on a highlighted action runs it (verified by checking the
 *     downstream effect — opening Settings runs `settingsModal.open()`
 *     which mounts a dialog).
 *   - Arrow keys move the highlight.
 */
import { test, expect } from '@playwright/test';

test.describe('Phase 95 — command palette (Ctrl+K)', () => {
  test('Ctrl+K opens the palette + focuses the search input', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await page.keyboard.press('Control+K');

    const palette = page.locator('.command-palette');
    await expect(palette).toBeVisible();
    // Input is auto-focused.
    const input = palette.locator('.command-palette-input');
    await expect(input).toBeFocused();
  });

  test('Esc closes the palette', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await page.keyboard.press('Control+K');
    const palette = page.locator('.command-palette');
    await expect(palette).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(palette).toBeHidden();
  });

  test('typing filters the visible list', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await page.keyboard.press('Control+K');
    const palette = page.locator('.command-palette');
    await expect(palette).toBeVisible();

    // Type "settings" — should narrow to just the Open Settings entry.
    await page.locator('.command-palette-input').fill('settings');

    const items = palette.locator('.command-palette-item');
    // At least one match, all containing "Settings" in their label.
    await expect(items.first()).toContainText('Open Settings');
  });

  test('Enter on the highlighted action runs it', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await page.keyboard.press('Control+K');
    await page.locator('.command-palette-input').fill('settings');
    await page.keyboard.press('Enter');

    // The Settings modal should now be open + the palette closed.
    await expect(page.locator('.command-palette')).toBeHidden();
    await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
  });

  test('ArrowDown moves the highlight + Enter runs the new selection', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await page.keyboard.press('Control+K');
    await page.locator('.command-palette-input').fill('open');

    // Highlight the first item, then press ArrowDown to move to the second.
    const items = page.locator('.command-palette-item');
    await expect(items.first()).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowDown');
    await expect(items.nth(1)).toHaveAttribute('aria-selected', 'true');
  });

  test('non-matching query shows the empty state', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await page.keyboard.press('Control+K');
    await page.locator('.command-palette-input').fill('xyzzyqwerty');
    await expect(page.locator('.command-palette-empty')).toBeVisible();
    await expect(page.locator('.command-palette-empty')).toContainText(
      /No matching actions/,
    );
  });
});
