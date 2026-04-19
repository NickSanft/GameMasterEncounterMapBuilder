import { test, expect } from '@playwright/test';

test.describe('Help overlay (quick tutorial)', () => {
  test('GM: "?" button opens tutorial with GM-specific content', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    const helpBtn = page.locator('.help-button');
    await expect(helpBtn).toBeVisible();
    await expect(helpBtn).toHaveText('?');
    await helpBtn.click();

    const dialog = page.getByRole('dialog', { name: /Quick tutorial/i });
    await expect(dialog).toBeVisible();

    // GM-only section headings
    for (const title of ['Tools (left side)', 'Session menu (left column)', 'Canvas interactions']) {
      await expect(dialog.locator('.help-section h3', { hasText: title })).toBeVisible();
    }

    // Spot-check GM-only entries (dt elements, one per control)
    for (const term of ['Token', 'Reveal', 'Template Library', 'New Session']) {
      await expect(dialog.locator('dt', { hasText: new RegExp(`^${term}$`) })).toBeVisible();
    }

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('Spectator: "?" button opens tutorial with Spectator-only content', async ({ page }) => {
    await page.goto('./spectator.html');
    await page.waitForSelector('#canvas');

    const helpBtn = page.locator('.help-button');
    await expect(helpBtn).toBeVisible();
    await helpBtn.click();

    const dialog = page.getByRole('dialog', { name: /Quick tutorial/i });
    await expect(dialog).toBeVisible();

    // Spectator does NOT have a Reveal/Hide/Token/AoE tool
    for (const term of ['Reveal', 'Hide', 'Token', 'AoE']) {
      await expect(dialog.locator('dt', { hasText: new RegExp(`^${term}$`) })).toHaveCount(0);
    }

    // Spectator DOES have Ruler + fog-of-war behavior blurb
    await expect(dialog.locator('dt', { hasText: /^Ruler$/ })).toBeVisible();
    await expect(dialog.locator('dt', { hasText: /^Fog of war$/ })).toBeVisible();

    // Close with the × button this time
    await dialog.getByRole('button', { name: 'Close' }).click();
    await expect(dialog).toBeHidden();
  });

  test('Clicking outside the modal closes it', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await page.locator('.help-button').click();
    const dialog = page.getByRole('dialog', { name: /Quick tutorial/i });
    await expect(dialog).toBeVisible();

    // Click the backdrop outside the modal
    const backdrop = page.locator('.modal-backdrop', { has: page.locator('.help-overlay') });
    await backdrop.click({ position: { x: 10, y: 10 } });
    await expect(dialog).toBeHidden();
  });
});
