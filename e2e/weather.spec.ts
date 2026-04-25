import { test, expect } from '@playwright/test';

/**
 * Phase 79 — atmospheric weather effect.
 *
 * GM picks weather from the inline `<select>` next to the scene
 * indicator; the overlay canvas appears (or hides) accordingly.
 * State is per-scene + synced to the Spectator over the existing
 * patch wire.
 */
test.describe('Weather overlay', () => {
  test('weather picker toggles the overlay canvas visibility', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    const overlay = page.locator('.weather-overlay');
    // Default scene weather is 'none' — overlay starts hidden.
    await expect(overlay).toBeHidden();

    const picker = page.locator('.weather-picker select');
    await expect(picker).toBeVisible();
    await expect(picker).toHaveValue('none');

    await picker.selectOption('rain');
    await expect(overlay).toBeVisible();
    // Switching back to 'none' hides the overlay again.
    await picker.selectOption('none');
    await expect(overlay).toBeHidden();
  });

  test('weather selection persists across scene switches', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    // Wait for the scene catalog hydrate.
    await expect(page.locator('.scene-indicator-label')).not.toHaveText(
      /loading/i,
    );

    const picker = page.locator('.weather-picker select');
    await picker.selectOption('snow');
    // Wait for the persist debounce (200ms).
    await page.waitForTimeout(400);

    // Create a second scene + switch to it. New scene defaults to 'none'.
    await page.locator('.scene-indicator').click();
    page.once('dialog', (d) => void d.accept('Stormy Pass'));
    await page
      .getByRole('dialog', { name: 'Scenes' })
      .getByRole('button', { name: '+ New scene' })
      .click();
    await expect(page.locator('.scene-indicator-label')).toHaveText(
      /Stormy Pass/,
    );
    await expect(picker).toHaveValue('none');

    // Pick fog on the new scene.
    await picker.selectOption('fog');
    await page.waitForTimeout(400);

    // Switch back to the original scene — weather should restore to
    // snow. Ctrl+1 (Phase 75 recent-scenes hotkey) jumps to the
    // second-most-recent scene; we just left the default scene
    // moments ago to create Stormy Pass, so it's the target.
    await page.keyboard.press('Control+1');
    await expect(page.locator('.scene-indicator-label')).not.toHaveText(
      /Stormy Pass/,
    );
    await expect(picker).toHaveValue('snow');
  });

  test('Spectator does NOT mount the weather picker', async ({ page }) => {
    await page.goto('./spectator.html');
    await page.waitForSelector('#canvas');
    await expect(page.locator('.weather-picker')).toHaveCount(0);
    // The overlay element IS in the Spectator's DOM (just hidden until
    // the GM sets weather).
    await expect(page.locator('.weather-overlay')).toBeAttached();
  });
});
