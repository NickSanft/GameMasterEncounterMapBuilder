/**
 * Phase 94 — combat log panel.
 *
 * Validates:
 *   - Session menu has a "Combat Log" entry that toggles the panel.
 *   - Panel starts in the empty state ("Combat log is empty").
 *   - Recording flow works end-to-end: place a token, enable HP,
 *     press `-` (Phase 92 quick-HP), and the log entry appears.
 *   - Spectator session menu does NOT include the entry (GM-only).
 */
import { test, expect, type Page } from '@playwright/test';

async function placeTokenWithHp(page: Page, label: string) {
  await page.keyboard.press('t');
  const box = await page.locator('#canvas').boundingBox();
  if (!box) throw new Error('canvas has no bounding box');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

  // Open Token Editor for the just-placed token.
  await page.keyboard.press('s');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.keyboard.press('e');
  const dialog = page.getByRole('dialog', { name: 'Edit Token' });
  await expect(dialog).toBeVisible();

  await dialog.locator('input[data-field="label"]').fill(label);
  await dialog.locator('input[data-field="trackHp"]').check();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
}

test.describe('Phase 94 — combat log panel', () => {
  test('GM session menu has a Combat Log toggle that opens an empty panel', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    const trigger = page.getByRole('button', { name: 'Combat Log', exact: true });
    await expect(trigger).toBeVisible();

    // Panel starts hidden.
    const panel = page.locator('aside.combat-log-panel');
    await expect(panel).toBeHidden();

    await trigger.click();
    await expect(panel).toBeVisible();
    await expect(panel.locator('[data-field="empty"]')).toContainText(
      /Combat log is empty/,
    );

    // Once open the panel covers the right-edge session menu (z-index
    // 15 / right-anchored). Close via the × button inside the panel.
    await panel.getByRole('button', { name: 'Close combat log panel' }).click();
    await expect(panel).toBeHidden();
  });

  test('quick-HP damage records a damage entry in the log', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await placeTokenWithHp(page, 'Goblin');
    // Phase 92 keyboard shortcut — `-` deals 1 damage.
    await page.keyboard.press('-');

    // Open the panel + verify the entry.
    await page.getByRole('button', { name: 'Combat Log', exact: true }).click();
    const panel = page.locator('aside.combat-log-panel');
    await expect(panel).toBeVisible();
    await expect(panel.locator('.combat-log-list')).toBeVisible();
    await expect(panel.locator('.combat-log-entry-damage')).toContainText(
      /Goblin took 1 damage/,
    );
    await expect(panel.locator('[data-field="hint"]')).toContainText(/1 event/);
  });

  test('Clear button empties the log', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await placeTokenWithHp(page, 'Bandit');
    await page.keyboard.press('-');

    await page.getByRole('button', { name: 'Combat Log', exact: true }).click();
    const panel = page.locator('aside.combat-log-panel');
    await expect(panel.locator('.combat-log-entry-damage')).toBeVisible();

    await panel.getByRole('button', { name: 'Clear' }).click();
    await expect(panel.locator('[data-field="empty"]')).toBeVisible();
    await expect(panel.locator('.combat-log-entry-damage')).toHaveCount(0);
  });

  test('Spectator session menu does NOT include a Combat Log entry', async ({
    page,
  }) => {
    await page.goto('./spectator.html');
    await page.waitForSelector('#canvas');
    await expect(page.getByRole('button', { name: 'Combat Log', exact: true })).toHaveCount(0);
  });
});
