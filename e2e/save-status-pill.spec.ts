import { test, expect } from '@playwright/test';

/**
 * Phase 76 — auto-save indicator pill.
 *
 * Mounted on both GM and Spectator. Cycles through 'saving' → 'saved'
 * → 'idle' for every state change after the persist debounce fires
 * (200ms after the last patch). Stays on 'error' if the save fails.
 */
test.describe('Auto-save indicator pill', () => {
  test('pill cycles to saved after a state change settles', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    // Wait for hydration to complete so the pill isn't visible from
    // the boot-time initial loadState (which DOES trigger persist).
    await page.waitForTimeout(2200);

    const pill = page.locator('.save-status-pill');
    // Settled state: hidden / idle.
    await expect(pill).toBeHidden();

    // Trigger a state change: place a token.
    await page.keyboard.press('t');
    const box = await page.locator('#canvas').boundingBox();
    if (!box) throw new Error('canvas has no bounding box');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

    // Within ~500ms (200ms debounce + IDB round-trip) we should see
    // the pill flash through 'saving' or land on 'saved'.
    // Easiest stable assertion: wait for `data-status="saved"` then
    // verify it auto-fades back to hidden.
    await expect(pill).toHaveAttribute('data-status', 'saved', {
      timeout: 3000,
    });
    await expect(pill).toContainText(/Saved/);

    // After ~1700ms it auto-fades back to hidden/idle.
    await expect(pill).toBeHidden({ timeout: 3000 });
  });

  test('Spectator also mounts the pill', async ({ page }) => {
    await page.goto('./spectator.html');
    await page.waitForSelector('#canvas');
    // Pill should be in the DOM (initial state will be saving briefly,
    // then saved as the boot-time loadState persists).
    await expect(page.locator('.save-status-pill')).toBeAttached();
  });
});
