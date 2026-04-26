/**
 * Phase 100 — drag-and-drop + paste-to-upload background.
 *
 * Validates:
 *   - The drop overlay element exists in the DOM (hidden by default).
 *   - Dragging an image file over the page reveals the overlay.
 *   - A simulated paste of an image dispatches through to the
 *     background-upload pipeline (announcer says it landed).
 *
 * Playwright doesn't have a first-class API for OS-style file drag
 * — we synthesize a DragEvent with a fake DataTransfer to verify the
 * overlay show / hide logic. The actual `applyBackgroundBlob` path is
 * exercised by the existing token / map e2e specs; here we just pin
 * the new entry surface.
 */
import { test, expect } from '@playwright/test';

test.describe('Phase 100 — drag-drop / paste-to-upload background', () => {
  test('drop zone overlay element is mounted (hidden by default)', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    const overlay = page.locator('.upload-drop-zone');
    await expect(overlay).toHaveCount(1);
    await expect(overlay).toBeHidden();
  });

  test('synthesized image-file dragover reveals the overlay', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    // Dispatch a synthetic dragenter with a DataTransfer that
    // advertises the 'Files' type — the overlay's `isFileDrag` check
    // is what gates visibility.
    await page.evaluate(() => {
      const dt = new DataTransfer();
      // Add a Files entry by appending an in-memory file. (DataTransfer
      // exposes a real `types` list including "Files" once you add a
      // file via items.add.)
      const file = new File([new Uint8Array([0])], 'fake.png', {
        type: 'image/png',
      });
      dt.items.add(file);
      const event = new DragEvent('dragenter', {
        bubbles: true,
        cancelable: true,
        dataTransfer: dt,
      });
      window.dispatchEvent(event);
    });

    await expect(page.locator('.upload-drop-zone')).toBeVisible({
      timeout: 2_000,
    });
  });

  test('non-image dragenter does NOT reveal the overlay', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    // Dispatch a dragenter with NO Files type (e.g. a text drag).
    await page.evaluate(() => {
      const dt = new DataTransfer();
      dt.setData('text/plain', 'just text');
      const event = new DragEvent('dragenter', {
        bubbles: true,
        cancelable: true,
        dataTransfer: dt,
      });
      window.dispatchEvent(event);
    });

    await page.waitForTimeout(100);
    await expect(page.locator('.upload-drop-zone')).toBeHidden();
  });

  test('paste of an image blob fires the background-upload announcer', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    // Synthesize a paste with a tiny 1×1 PNG (base64-decoded inline).
    await page.evaluate(() => {
      // 1x1 transparent PNG.
      const base64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
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
    });

    // The host's onUpload announces "Background image set from drop / paste."
    await expect(page.locator('[data-announcer="polite"]')).toContainText(
      /Background image set/,
      { timeout: 5_000 },
    );
  });
});
