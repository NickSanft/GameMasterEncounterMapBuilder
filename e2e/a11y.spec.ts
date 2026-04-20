import { test, expect } from '@playwright/test';

test.describe('Accessibility — keyboard focus + live regions', () => {
  test('GM: Tab from the body reveals the skip link, then focuses canvas', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    // Move focus off anywhere that might be focused after load, then
    // simulate a fresh keyboard user tabbing into the page.
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());

    await page.keyboard.press('Tab');
    const skipLink = page.locator('.skip-link');
    await expect(skipLink).toBeFocused();

    // Activating the skip link should move focus to the canvas.
    await page.keyboard.press('Enter');
    await expect(page.locator('#canvas')).toBeFocused();
  });

  test('Spectator: skip link is present and focuses canvas', async ({ page }) => {
    await page.goto('./spectator.html');
    await page.waitForSelector('#canvas');

    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());

    await page.keyboard.press('Tab');
    await expect(page.locator('.skip-link')).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(page.locator('#canvas')).toBeFocused();
  });

  test('polite live region is present and updated on tool switch', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    const polite = page.locator('[data-announcer="polite"]');
    await expect(polite).toHaveCount(1);
    await expect(polite).toHaveAttribute('aria-live', 'polite');
    await expect(polite).toHaveAttribute('role', 'status');

    // Pick a tool via its keyboard shortcut and verify the region picks
    // up a message mentioning the new tool.
    await page.keyboard.press('t');
    await expect(polite).toHaveText(/Token tool active/);
  });

  test('polite live region updates after placing a token via context menu', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    const box = await page.locator('#canvas').boundingBox();
    if (!box) throw new Error('canvas has no bounding box');

    // Right-click empty canvas → "Place token here" goes through the
    // placeTokenAt helper which announces.
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, {
      button: 'right',
    });
    await page.getByRole('menuitem', { name: /Place token here/ }).click();

    const polite = page.locator('[data-announcer="polite"]');
    await expect(polite).toHaveText(/Token 1 placed/);
  });

  test('assertive live region exists alongside the polite one', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    const assertive = page.locator('[data-announcer="assertive"]');
    await expect(assertive).toHaveCount(1);
    await expect(assertive).toHaveAttribute('aria-live', 'assertive');
  });

  test('canvas has a visible focus ring when Tab-focused', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    // Tab once → skip link; Tab twice → canvas.
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(page.locator('#canvas')).toBeFocused();

    const outline = await page.locator('#canvas').evaluate(
      (el) => window.getComputedStyle(el).outlineStyle,
    );
    // The global `:focus-visible` rule sets `outline: 2px solid var(--accent)`
    // — jsdom-ish browsers report it as `solid`.
    expect(outline).toBe('solid');
  });
});
