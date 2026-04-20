import { test, expect, type Page } from '@playwright/test';

async function openScenesModal(page: Page) {
  // The scene indicator is always visible in the top-left and opens
  // the same modal — simpler target than the session-menu button.
  await page.locator('.scene-indicator').click();
  const dialog = page.getByRole('dialog', { name: 'Scenes' });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function placeTokenAtCenter(page: Page) {
  await page.keyboard.press('t');
  const box = await page.locator('#canvas').boundingBox();
  if (!box) throw new Error('canvas has no bounding box');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

test.describe('Scenes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    // Wait for hydration: the indicator starts as "Scene: (loading…)"
    // and flips to the real name once ensureActiveScene + refresh finish.
    // Polling on the text is both faster on fast machines and robust on
    // slow ones compared to a blind sleep.
    await expect(page.locator('.scene-indicator-label')).not.toHaveText(/loading/i);
  });

  test('scene indicator + session-menu entry + modal render', async ({ page }) => {
    await expect(page.locator('.scene-indicator')).toBeVisible();
    await expect(page.getByRole('button', { name: /^Scenes/ })).toBeVisible();

    const dialog = await openScenesModal(page);
    // Always exactly one scene on a fresh session (auto-created by ensureActiveScene).
    await expect(dialog.locator('.scene-card')).toHaveCount(1);
  });

  test('creating a new scene adds it to the list and switches to it', async ({ page }) => {
    const dialog = await openScenesModal(page);

    // Accept the prompt with a canned name.
    page.once('dialog', (d) => {
      void d.accept('Goblin Cave');
    });
    await dialog.getByRole('button', { name: '+ New scene' }).click();

    // Modal closes, indicator reflects the new name.
    await expect(page.locator('.scene-indicator-label')).toHaveText(/Goblin Cave/);

    // Re-open the modal — now there are two scenes.
    await openScenesModal(page);
    await expect(page.getByRole('dialog', { name: 'Scenes' }).locator('.scene-card')).toHaveCount(2);
  });

  test('switching scenes swaps token state', async ({ page }) => {
    // Drop a token on the default scene.
    await placeTokenAtCenter(page);

    // Wait for the debounced persist (200 ms) so the token is
    // definitely in IDB before we create + switch away.
    await page.waitForTimeout(400);

    // Create a new empty scene.
    let dialog = await openScenesModal(page);
    page.once('dialog', (d) => {
      void d.accept('Empty Scene');
    });
    await dialog.getByRole('button', { name: '+ New scene' }).click();
    // Wait for the indicator to reflect the new active scene, which
    // confirms switchToScene() completed its async work.
    await expect(page.locator('.scene-indicator-label')).toHaveText(
      /Empty Scene/,
    );

    // The new scene should be empty — verify by right-clicking the canvas
    // center; no Token actions menu should appear.
    const box = await page.locator('#canvas').boundingBox();
    if (!box) throw new Error('canvas has no bounding box');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: 'right' });
    await expect(
      page.getByRole('menuitem', { name: /Edit token/ }),
    ).toHaveCount(0);
    await page.keyboard.press('Escape');

    // Switch back to the original scene via the modal.
    dialog = await openScenesModal(page);
    const cards = dialog.locator('.scene-card');
    const inactiveCards = cards.filter({ hasNot: page.locator('.scene-card.active') });
    await inactiveCards.first().locator('[data-action="switch"]').click();
    // Wait for the indicator to flip back.
    await expect(page.locator('.scene-indicator-label')).not.toHaveText(
      /Empty Scene/,
    );

    // Token should be back — right-click the center yields Edit token.
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: 'right' });
    await expect(
      page.getByRole('menuitem', { name: /Edit token/ }),
    ).toBeVisible();
  });

  test('rename button updates the scene card + indicator', async ({ page }) => {
    const dialog = await openScenesModal(page);
    const card = dialog.locator('.scene-card').first();
    page.once('dialog', (d) => {
      void d.accept('Renamed Scene');
    });
    await card.getByRole('button', { name: 'Rename' }).click();
    await expect(card.locator('.scene-name')).toHaveText('Renamed Scene');
    await page.keyboard.press('Escape');
    await expect(page.locator('.scene-indicator-label')).toHaveText(/Renamed Scene/);
  });

  test('duplicate produces an independent copy', async ({ page }) => {
    // Drop a token so the source scene has something to copy.
    await placeTokenAtCenter(page);

    const dialog = await openScenesModal(page);
    const card = dialog.locator('.scene-card').first();
    await card.getByRole('button', { name: 'Duplicate' }).click();

    // Two scenes now.
    await expect(dialog.locator('.scene-card')).toHaveCount(2);
    // The duplicate's default name ends with "(copy)".
    await expect(
      dialog.locator('.scene-name', { hasText: /\(copy\)/ }),
    ).toBeVisible();
  });
});
