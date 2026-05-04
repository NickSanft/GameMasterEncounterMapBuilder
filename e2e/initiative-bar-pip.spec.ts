/**
 * Phase 147 — initiative-bar pip parity (GM + Spectator).
 *
 * Verifies the new colored pip element renders alongside the active
 * token name on both the GM and Spectator entries. Pixel-color
 * checks are out of scope; we just assert the element is present
 * and its `aria-hidden` is set so screen readers don't double-
 * announce the visual cue (the name is already announced).
 */
import { test, expect } from '@playwright/test';

test.describe('Phase 147 — initiative-bar pip parity', () => {
  test('GM bar mounts with the colored pip element', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    // The pip element exists in the DOM (mount-time fixture). It's
    // hidden until an active initiative entry exists, but the
    // element is still present.
    await expect(page.locator('.initiative-bar-pip')).toHaveCount(1);
    await expect(page.locator('.initiative-bar-pip')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });

  test('Spectator bar mounts with the same pip element', async ({ page }) => {
    await page.goto('./spectator.html');
    await page.waitForSelector('#canvas');
    await expect(page.locator('.initiative-bar-pip')).toHaveCount(1);
  });
});
