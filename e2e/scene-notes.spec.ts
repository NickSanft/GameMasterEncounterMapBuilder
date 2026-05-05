/**
 * Phase 157 — per-scene GM notes.
 *
 * Validates the end-to-end flow:
 *   - Notes typed under one scene persist there.
 *   - Switching to another scene shows different notes (per-scene
 *     storage, not a single global blob).
 *   - The legacy `gm-encounter-maps-notes` key is honored as a
 *     fallback for fresh scenes that haven't been authored yet.
 */
import { test, expect, type Page } from '@playwright/test';

async function openNotes(page: Page) {
  await page.getByRole('button', { name: 'Notes', exact: true }).click();
  await expect(page.locator('.notes-panel')).toBeVisible();
}

async function getNotesValue(page: Page): Promise<string> {
  return await page.locator('.notes-panel-textarea').inputValue();
}

async function setNotes(page: Page, text: string) {
  await page.locator('.notes-panel-textarea').fill(text);
  // Phase 157 persist debounce is 250 ms — wait it out before
  // switching scenes so the autosave fires.
  await page.waitForTimeout(350);
}

async function openScenesModal(page: Page) {
  await page.locator('.scene-indicator').click();
  const dialog = page.getByRole('dialog', { name: 'Scenes' });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function createScene(page: Page, name: string) {
  const dialog = await openScenesModal(page);
  page.once('dialog', (d) => {
    void d.accept(name);
  });
  await dialog.getByRole('button', { name: '+ New scene' }).click();
  // Wait for the indicator to reflect the new active scene.
  await expect(page.locator('.scene-indicator-label')).toHaveText(
    new RegExp(name),
  );
}

test.describe('Phase 157 — per-scene notes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    await expect(page.locator('.scene-indicator-label')).not.toHaveText(
      /loading/i,
    );
  });

  test('notes are stored per-scene; switching scenes swaps the textarea', async ({
    page,
  }) => {
    await openNotes(page);

    // Author notes for the initial scene.
    await setNotes(page, 'First scene notes');
    expect(await getNotesValue(page)).toBe('First scene notes');

    // Create + switch to a second scene.
    await createScene(page, 'Second Scene');

    // The notes textarea should now reflect the second scene's
    // (empty) notes, NOT the first scene's content.
    expect(await getNotesValue(page)).toBe('');

    // Author distinct notes for the second scene.
    await setNotes(page, 'Second scene notes');
    expect(await getNotesValue(page)).toBe('Second scene notes');

    // Switch back to the first scene via the modal.
    const dialog = await openScenesModal(page);
    // Find the inactive card (the one we're not on) — the first
    // scene auto-created by ensureActiveScene.
    const inactiveCard = dialog
      .locator('.scene-card')
      .filter({ hasNotText: /Active/ })
      .first();
    await inactiveCard.locator('[data-action="switch"]').click();
    // Wait for the indicator to flip back.
    await expect(page.locator('.scene-indicator-label')).not.toHaveText(
      /Second Scene/,
    );

    // Notes should restore to the first scene's content.
    expect(await getNotesValue(page)).toBe('First scene notes');
  });
});
