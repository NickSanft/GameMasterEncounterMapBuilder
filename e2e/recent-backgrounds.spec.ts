/**
 * Phase 108 — recent backgrounds quick switcher.
 *
 * Validates:
 *   - The Recent Backgrounds modal opens via the command palette and
 *     shows an empty state on a fresh session.
 *   - After applying a background (via paste), the entry appears in
 *     the picker with the friendly Pasted-MIME label.
 *   - Clicking a row re-applies it (the polite announcer fires the
 *     "Applied recent background" message).
 *   - The forget × button drops the row from the list.
 *
 * Synthesis: we use the Phase 100 paste path with a tiny in-memory
 * 1×1 PNG so the upload flow runs without a real file picker.
 */
import { test, expect, type Page } from '@playwright/test';

const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

async function pasteTinyImage(page: Page) {
  await page.evaluate((base64) => {
    const bytes = atob(base64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    const file = new File([arr], 'paste.png', { type: 'image/png' });
    const dt = new DataTransfer();
    dt.items.add(file);
    const event = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: dt,
    });
    window.dispatchEvent(event);
  }, TINY_PNG_BASE64);
  // Wait for the polite announcer to confirm the upload landed.
  await expect(page.locator('[data-announcer="polite"]')).toContainText(
    /Background image set from drop/i,
    { timeout: 5_000 },
  );
}

async function openRecentBackgrounds(page: Page) {
  await page.keyboard.press('Control+k');
  await page.locator('.command-palette-input').fill('recent backgrounds');
  await page.locator('.command-palette-item').first().click();
  const dialog = page.getByRole('dialog', { name: /recent backgrounds/i });
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe('Phase 108 — recent backgrounds quick switcher', () => {
  test('palette opens the modal; empty state shows on fresh session', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    const dialog = await openRecentBackgrounds(page);
    await expect(dialog.locator('.recent-backgrounds-empty')).toBeVisible();
  });

  test('uploaded background appears in the picker as a row', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await pasteTinyImage(page);
    const dialog = await openRecentBackgrounds(page);
    const row = dialog.locator('.recent-background-row');
    await expect(row).toHaveCount(1);
    // Paste path supplies the file's `name` ("paste.png") since the
    // synthesized File carries one. So the picker label should match.
    await expect(row.locator('.recent-background-name')).toContainText(
      /paste\.png/i,
    );
  });

  test('clicking a row re-applies + announces the application', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await pasteTinyImage(page);
    const dialog = await openRecentBackgrounds(page);

    // Click the row's main pick button.
    await dialog.locator('.recent-background-pick').first().click();
    await expect(dialog).toBeHidden();

    // Polite announcer announces the re-application.
    await expect(page.locator('[data-announcer="polite"]')).toContainText(
      /Applied recent background/i,
      { timeout: 3_000 },
    );
  });

  test('× forget button drops the row without applying', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await pasteTinyImage(page);
    const dialog = await openRecentBackgrounds(page);
    await expect(dialog.locator('.recent-background-row')).toHaveCount(1);

    await dialog.locator('.recent-background-forget').first().click();

    // Row removed; empty state shows since this was the only entry.
    await expect(dialog.locator('.recent-background-row')).toHaveCount(0);
    await expect(dialog.locator('.recent-backgrounds-empty')).toBeVisible();
  });
});
