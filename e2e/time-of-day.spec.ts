import { test, expect } from '@playwright/test';

/**
 * Phase 80 — time-of-day tint. GM picks via an inline `<select>`
 * pinned next to the weather picker; the renderer composes the
 * resulting tint over the canvas. Per-scene state, spectator-mirrored.
 */
test.describe('Time-of-day tint', () => {
  test('GM picker is mounted with the canonical option set', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    const picker = page.locator('.time-picker select');
    await expect(picker).toBeVisible();
    await expect(picker).toHaveValue('none');

    // Verify each canonical option exists by name.
    for (const value of ['none', 'dawn', 'day', 'dusk', 'night']) {
      await expect(picker.locator(`option[value="${value}"]`)).toHaveCount(1);
    }
  });

  test('switching to night updates the picker value (and persists across the patch)', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    const picker = page.locator('.time-picker select');
    await picker.selectOption('night');
    await expect(picker).toHaveValue('night');
    // No visible "off" → "on" DOM marker for the canvas tint
    // (it's a transient ctx.fillRect each frame), so we just pin
    // the picker state. The tint correctness is exercised by the
    // unit test on `tintFor`.
  });

  test('Spectator does NOT mount the time picker', async ({ page }) => {
    await page.goto('./spectator.html');
    await page.waitForSelector('#canvas');
    await expect(page.locator('.time-picker')).toHaveCount(0);
  });
});
