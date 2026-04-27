/**
 * Phase 118 — snap-to-grid-edge wall drawing.
 *
 * Validates:
 *   - Walls settings panel exposes a "Snap to grid" checkbox.
 *   - Default is unchecked (free-form draw stays the default).
 *   - Toggling persists for the session (sticky between tool re-
 *     activations).
 *
 * The geometry of "the next click commits a snapped vertex" is
 * exercised by the unit-style integration via the in-flight overlay
 * cursor (snapped/unsnapped); end-to-end pixel-precise asserts on
 * the canvas would be flaky here, so this spec sticks to the UI.
 */
import { test, expect, type Page } from '@playwright/test';

async function activateWalls(page: Page) {
  await page.keyboard.press('w');
  await expect(page.locator('[data-announcer="polite"]')).toHaveText(
    /Walls tool active/,
  );
}

test.describe('Phase 118 — snap-to-grid wall drawing', () => {
  test('walls-settings exposes the Snap to grid checkbox (default off)', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    await activateWalls(page);

    const snap = page.locator('[data-field="snap-to-grid"]');
    await expect(snap).toBeVisible();
    await expect(snap).not.toBeChecked();
  });

  test('toggling Snap on persists across switching to a different tool and back', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    await activateWalls(page);

    const snap = page.locator('[data-field="snap-to-grid"]');
    await snap.check();
    await expect(snap).toBeChecked();

    // Switch to Select then back to Walls — the panel hides + re-
    // shows; the checkbox stays checked because the options ref
    // outlives the panel.
    await page.keyboard.press('s');
    await page.keyboard.press('w');
    await expect(snap).toBeChecked();
  });
});
