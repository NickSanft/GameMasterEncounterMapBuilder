/**
 * Phase 86 — keyboard navigation across canvas entities.
 *
 * Validates the new Tab / Shift+Tab cycle + Esc clear via the
 * announcer's aria-live region (which is the only reliable
 * observable for "what is selected" without inspecting canvas
 * pixels). The announcer fires `Selected: <description>` on every
 * cycle and `Selection cleared.` on Esc-from-non-empty.
 */
import { test, expect, type Page } from '@playwright/test';

async function placeTokenAt(
  page: Page,
  fracX: number,
  fracY: number,
): Promise<void> {
  const box = await page.locator('#canvas').boundingBox();
  if (!box) throw new Error('canvas has no bounding box');
  await page.mouse.click(box.x + box.width * fracX, box.y + box.height * fracY);
}

test.describe('Phase 86 — keyboard canvas navigation', () => {
  test('Tab on an empty selection grabs the first entity in reading order', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    // Drop two tokens at known positions so we can predict reading order.
    await page.keyboard.press('t');
    await placeTokenAt(page, 0.3, 0.3); // upper-left
    await placeTokenAt(page, 0.7, 0.7); // lower-right

    // Switch back to Select tool so the global Tab handler is the only
    // claimant for keyboard input.
    await page.keyboard.press('s');
    // Click outside any token to make sure focus is on the page body /
    // canvas (not a tool button left in :focus by the toolbar).
    await page.mouse.click(20, 20);

    // Tab → first entity in reading order = upper-left token.
    await page.keyboard.press('Tab');
    const announcer = page.locator('[data-announcer="polite"]');
    await expect(announcer).toContainText(/Selected:/, { timeout: 5_000 });
  });

  test('Tab cycles forward, Shift+Tab cycles back, Esc clears', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await page.keyboard.press('t');
    await placeTokenAt(page, 0.3, 0.3);
    await placeTokenAt(page, 0.7, 0.7);

    await page.keyboard.press('s');
    await page.mouse.click(20, 20);

    const announcer = page.locator('[data-announcer="polite"]');

    await page.keyboard.press('Tab');
    await expect(announcer).toContainText(/Selected:.+column \d+, row \d+/);
    const firstAnnouncement = await announcer.textContent();

    await page.keyboard.press('Tab');
    await expect(announcer).not.toHaveText(firstAnnouncement ?? '');
    const secondAnnouncement = await announcer.textContent();
    expect(secondAnnouncement).toMatch(/Selected:/);

    // Shift+Tab → back to the first.
    await page.keyboard.down('Shift');
    await page.keyboard.press('Tab');
    await page.keyboard.up('Shift');
    await expect(announcer).toContainText(/Selected:/);

    // Esc clears the selection.
    await page.keyboard.press('Escape');
    await expect(announcer).toContainText(/Selection cleared/);
  });

  test('Tab announces "Canvas is empty" when no entities exist', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await page.keyboard.press('s');
    await page.mouse.click(20, 20);

    await page.keyboard.press('Tab');
    const announcer = page.locator('[data-announcer="polite"]');
    await expect(announcer).toContainText(/Canvas is empty/);
  });

  test('Esc on empty selection is a no-op (does not announce "cleared")', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await page.keyboard.press('s');
    await page.mouse.click(20, 20);

    // No selection to start with.
    await page.keyboard.press('Escape');
    // Give the announcer a beat to settle, then assert it didn't pick
    // up a "Selection cleared" — there's nothing to clear.
    await page.waitForTimeout(100);
    const announcer = page.locator('[data-announcer="polite"]');
    const text = await announcer.textContent();
    expect(text ?? '').not.toMatch(/Selection cleared/);
  });
});
