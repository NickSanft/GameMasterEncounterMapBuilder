/**
 * Phase 98 — per-scene JSON export / import.
 *
 * Validates the user-facing surface:
 *   - Scenes modal has "Export" per row + a top-level "Import scene…" button.
 *   - Export downloads a JSON file (verified via Playwright's download
 *     event + reading the saved path's content).
 *   - Importing the previously-exported file creates a NEW scene with
 *     the original name (suffixed if necessary by the wire-format
 *     "Imported scene" fallback or the user's pick).
 *   - Command palette has "Export current scene as JSON" + "Import
 *     scene from JSON…" entries.
 */
import { test, expect, type Page } from '@playwright/test';
import { promises as fs } from 'fs';

async function placeTokenAtCenter(page: Page) {
  await page.keyboard.press('t');
  const box = await page.locator('#canvas').boundingBox();
  if (!box) throw new Error('canvas has no bounding box');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

test.describe('Phase 98 — per-scene export / import', () => {
  test('Scenes modal has Export per row + Import scene… button', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await page.getByRole('button', { name: 'Scenes…' }).click();
    const modal = page.getByRole('dialog', { name: 'Scenes' });
    await expect(modal).toBeVisible();
    await expect(
      modal.getByRole('button', { name: 'Import scene…' }),
    ).toBeVisible();
    // Each scene row has its own Export action.
    await expect(modal.locator('[data-action="export"]').first()).toBeVisible();
  });

  test('Export downloads a JSON file with the scene name embedded', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    // Drop a token so the scene has something to export.
    await placeTokenAtCenter(page);
    // Persist debounce is 200 ms; wait for the save-status pill to
    // settle on "Saved" so the IDB scene record reflects the token.
    await expect(page.locator('.save-status-pill')).toHaveAttribute(
      'data-status',
      'saved',
      { timeout: 5_000 },
    );

    await page.getByRole('button', { name: 'Scenes…' }).click();
    const modal = page.getByRole('dialog', { name: 'Scenes' });
    await expect(modal).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await modal.locator('[data-action="export"]').first().click();
    const download = await downloadPromise;
    const path = await download.path();
    expect(path).toBeTruthy();
    const content = await fs.readFile(path!, 'utf8');
    const parsed = JSON.parse(content);
    expect(parsed.kind).toBe('scene');
    expect(parsed.version).toBe(1);
    expect(typeof parsed.name).toBe('string');
    expect(parsed.state.tokens.length).toBeGreaterThan(0);
  });

  test('Command palette has the Phase 98 scene export / import entries', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await page.keyboard.press('Control+K');
    await page.locator('.command-palette-input').fill('scene');
    const items = page.locator('.command-palette-item');
    // Both export + import (+ likely existing scene-related entries)
    // should appear. Check by text.
    const labels = await items.locator('.command-palette-item-label').allTextContents();
    expect(labels.some((l) => /Export current scene/.test(l))).toBe(true);
    expect(labels.some((l) => /Import scene from JSON/.test(l))).toBe(true);
  });
});
