/**
 * Phase 101 — auto-detect the grid in an uploaded background and offer
 * a one-click "Snap" action via the status banner.
 *
 * Strategy: synthesize a clean checker-style PNG with a known 32px
 * grid in the browser, paste it as a background, and verify the
 * status banner appears with the detected cell size + Snap button.
 * Clicking Snap should resize the grid to match the detected cells.
 *
 * The detector itself is exhaustively unit-tested in
 * `src/state/grid-detect.test.ts`. This spec only pins the
 * end-to-end wiring: paste → detect → banner → Snap → grid-update.
 */
import { test, expect } from '@playwright/test';

test.describe('Phase 101 — grid auto-detect Snap banner', () => {
  test('paste of a grid-patterned image surfaces the Snap banner', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    // Synthesize a 256×256 PNG with a 32 px grid (white interiors,
    // dark grid lines). Paste it via the upload-drop-zone paste hook.
    await page.evaluate(async () => {
      const W = 256;
      const H = 256;
      const CELL = 32;
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = '#101010';
      ctx.lineWidth = 1;
      // Vertical grid lines.
      for (let x = 0; x <= W; x += CELL) {
        ctx.beginPath();
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, H);
        ctx.stroke();
      }
      // Horizontal grid lines.
      for (let y = 0; y <= H; y += CELL) {
        ctx.beginPath();
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(W, y + 0.5);
        ctx.stroke();
      }
      const blob: Blob = await new Promise((resolve) =>
        c.toBlob((b) => resolve(b!), 'image/png'),
      );
      const file = new File([blob], 'grid-32.png', { type: 'image/png' });
      const dt = new DataTransfer();
      dt.items.add(file);
      const event = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: dt,
      });
      window.dispatchEvent(event);
    });

    // The Snap banner is async (detection runs after the upload
    // promise resolves). Allow generous time for the canvas decode +
    // autocorrelation pass on slower CI runners.
    const banner = page.locator('.status-banner');
    await expect(banner).toBeVisible({ timeout: 10_000 });
    await expect(banner).toContainText(/Detected a \d+ px grid/i);

    const snapBtn = banner.locator('button.status-banner-action');
    await expect(snapBtn).toBeVisible();
    await expect(snapBtn).toHaveText(/snap/i);
  });

  test('Snap action updates the grid cell size to the detected value', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    // Same paste-synthesis as above, but we'll also click Snap and
    // assert the grid cellSize / cols / rows update accordingly.
    await page.evaluate(async () => {
      const W = 320;
      const H = 320;
      const CELL = 32;
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = '#eaeaea';
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = '#0a0a0a';
      ctx.lineWidth = 1;
      for (let x = 0; x <= W; x += CELL) {
        ctx.beginPath();
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, H);
        ctx.stroke();
      }
      for (let y = 0; y <= H; y += CELL) {
        ctx.beginPath();
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(W, y + 0.5);
        ctx.stroke();
      }
      const blob: Blob = await new Promise((resolve) =>
        c.toBlob((b) => resolve(b!), 'image/png'),
      );
      const file = new File([blob], 'grid-32-larger.png', {
        type: 'image/png',
      });
      const dt = new DataTransfer();
      dt.items.add(file);
      const event = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: dt,
      });
      window.dispatchEvent(event);
    });

    const banner = page.locator('.status-banner');
    await expect(banner).toBeVisible({ timeout: 10_000 });
    await banner.locator('button.status-banner-action').click();

    // Banner is dismissed after the action.
    await expect(banner).toBeHidden();

    // Open Settings and assert cellSize / cols / rows reflect the
    // detected 32 px grid (320 / 32 = 10 cells along each axis).
    await page.getByRole('button', { name: 'Settings' }).click();
    const dialog = page.getByRole('dialog', { name: /settings/i });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('input[data-field="cellSize"]')).toHaveValue(
      '32',
    );
    await expect(dialog.locator('input[data-field="cols"]')).toHaveValue('10');
    await expect(dialog.locator('input[data-field="rows"]')).toHaveValue('10');
  });
});
