/**
 * Phase 106 — type-to-filter the Scenes modal.
 *
 * Validates:
 *   - Search input appears in the modal + auto-focuses on open.
 *   - Typing narrows the visible scene cards by name.
 *   - The "N of M" counter updates as the user types.
 *   - The "no scenes match" empty state shows when nothing matches.
 *   - Esc inside the search clears the query first; a second Esc
 *     closes the modal (matches the command palette UX from Phase 95).
 *   - Re-opening the modal clears any stale query.
 */
import { test, expect, type Page } from '@playwright/test';

async function openScenesModal(page: Page) {
  await page.locator('.scene-indicator').click();
  const dialog = page.getByRole('dialog', { name: 'Scenes' });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function createScene(page: Page, name: string) {
  // Open the modal, click "+ New scene" (which fires a window.prompt
  // we hijack), then wait for the indicator to flip — confirming
  // both the IDB write + the host switch completed. The indicator
  // shows "Scene: <name>" so we match by regex.
  const dialog = await openScenesModal(page);
  page.once('dialog', (d) => void d.accept(name));
  await dialog.getByRole('button', { name: '+ New scene' }).click();
  await expect(page.locator('.scene-indicator-label')).toContainText(name);
}

test.describe('Phase 106 — Scenes search / filter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    await expect(page.locator('.scene-indicator-label')).not.toHaveText(/loading/i);
  });

  test('search input is present + auto-focused when the modal opens', async ({
    page,
  }) => {
    const dialog = await openScenesModal(page);
    const search = dialog.locator('.scenes-search-input');
    await expect(search).toBeVisible();
    await expect(search).toBeFocused();
  });

  test('typing narrows the visible scene cards by name', async ({ page }) => {
    // Create a few scenes so we can filter against them.
    await createScene(page, 'Throne Room');
    await createScene(page, 'Tavern');
    await createScene(page, 'Forest Glade');

    const dialog = await openScenesModal(page);
    // Default scene + the three new ones = 4 cards, no filter.
    await expect(dialog.locator('.scene-card')).toHaveCount(4);

    await dialog.locator('.scenes-search-input').fill('throne');
    await expect(dialog.locator('.scene-card')).toHaveCount(1);
    await expect(
      dialog.locator('.scene-card .scene-name').first(),
    ).toHaveText('Throne Room');

    // Counter updates.
    await expect(dialog.locator('.scenes-search-count')).toHaveText('1 of 4');
  });

  test('clearing the input restores the full list + clears the counter', async ({
    page,
  }) => {
    await createScene(page, 'Throne Room');
    await createScene(page, 'Tavern');

    const dialog = await openScenesModal(page);
    await dialog.locator('.scenes-search-input').fill('throne');
    await expect(dialog.locator('.scene-card')).toHaveCount(1);

    await dialog.locator('.scenes-search-input').fill('');
    await expect(dialog.locator('.scene-card')).toHaveCount(3);
    await expect(dialog.locator('.scenes-search-count')).toHaveText('');
  });

  test('no-match empty state shows when nothing matches', async ({ page }) => {
    await createScene(page, 'Throne Room');

    const dialog = await openScenesModal(page);
    await dialog.locator('.scenes-search-input').fill('xyzzy-no-match');
    await expect(dialog.locator('.scene-card')).toHaveCount(0);
    await expect(dialog.locator('[data-field="no-match"]')).toBeVisible();
    await expect(dialog.locator('[data-field="no-match-text"]')).toContainText(
      'No scenes match "xyzzy-no-match"',
    );
  });

  test('Esc inside non-empty search clears query first; second Esc closes modal', async ({
    page,
  }) => {
    await createScene(page, 'Throne Room');

    const dialog = await openScenesModal(page);
    const search = dialog.locator('.scenes-search-input');
    await search.fill('thr');
    await expect(dialog.locator('.scene-card')).toHaveCount(1);

    // First Esc — clears the input but keeps the modal open.
    await search.press('Escape');
    await expect(search).toHaveValue('');
    await expect(dialog).toBeVisible();

    // Second Esc — closes the modal.
    await search.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('re-opening the modal clears any stale query', async ({ page }) => {
    await createScene(page, 'Throne Room');
    await createScene(page, 'Tavern');

    const dialog = await openScenesModal(page);
    await dialog.locator('.scenes-search-input').fill('thr');
    await expect(dialog.locator('.scene-card')).toHaveCount(1);

    await dialog.locator('.modal-close').click();
    await expect(dialog).toBeHidden();

    // Re-open: the search should be empty + all cards visible.
    await openScenesModal(page);
    await expect(dialog.locator('.scenes-search-input')).toHaveValue('');
    await expect(dialog.locator('.scene-card')).toHaveCount(3);
  });
});
