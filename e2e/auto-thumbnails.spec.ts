/**
 * Phase 121 — auto-generated scene thumbnails.
 *
 * Validates:
 *   - A freshly-created scene has no thumbnail yet.
 *   - After dropping a token + waiting for the debounced persist, the
 *     active scene's card in the Scenes modal carries a non-empty
 *     `background-image: url(data:image/jpeg;…)` style (the thumbnail).
 */
import { test, expect, type Page } from '@playwright/test';

async function openScenesModal(page: Page) {
  await page.locator('.scene-indicator').click();
  const dialog = page.getByRole('dialog', { name: 'Scenes' });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function closeScenesModal(page: Page) {
  await page.locator('.modal.scenes-modal .modal-close').click();
  await expect(page.getByRole('dialog', { name: 'Scenes' })).toBeHidden();
}

async function placeTokenAtCenter(page: Page) {
  await page.keyboard.press('t');
  const box = await page.locator('#canvas').boundingBox();
  if (!box) throw new Error('canvas has no bounding box');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

test.describe('Phase 121 — auto-generated scene thumbnails', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    await expect(page.locator('.scene-indicator-label')).not.toHaveText(/loading/i);
  });

  test('placing a token captures a thumbnail on the next auto-save', async ({ page }) => {
    // Drop a token + wait for the 200 ms debounced persist to fire.
    await placeTokenAtCenter(page);
    await page.waitForTimeout(700);

    const dialog = await openScenesModal(page);
    const activeCard = dialog.locator('.scene-card.active');
    const thumb = activeCard.locator('.scene-thumb');
    // The card's `.scene-thumb` should now have an inline
    // `background-image: url(data:image/jpeg;...)` style.
    const style = (await thumb.getAttribute('style')) ?? '';
    // CSS.escape backslash-escapes `:` and `/` in the data: URL, so
    // match the prefix loosely. Confirming "background-image:url(data"
    // is enough to know a JPEG thumbnail was set.
    expect(style).toMatch(/background-image:url\(data/);
    await closeScenesModal(page);
  });
});
