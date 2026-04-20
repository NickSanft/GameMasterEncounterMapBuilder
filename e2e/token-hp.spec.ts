import { test, expect, type Page } from '@playwright/test';

async function placeTokenAtCanvasCenter(page: Page) {
  await page.keyboard.press('t');
  const canvas = page.locator('#canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas has no bounding box');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

async function openEditorForFirstToken(page: Page) {
  await placeTokenAtCanvasCenter(page);
  await page.keyboard.press('s');
  const box = await page.locator('#canvas').boundingBox();
  if (!box) throw new Error('canvas has no bounding box');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.keyboard.press('e');
  await expect(page.getByRole('dialog', { name: 'Edit Token' })).toBeVisible();
}

test.describe('Token HP & conditions', () => {
  test('token editor exposes HP + condition chips', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await openEditorForFirstToken(page);
    const dialog = page.getByRole('dialog', { name: 'Edit Token' });

    // HP tracking is off by default
    const trackHp = dialog.locator('input[data-field="trackHp"]');
    await expect(trackHp).not.toBeChecked();
    await expect(dialog.locator('[data-field="hp-fields"]')).toBeHidden();

    // Turn it on — current/max/visibility appear
    await trackHp.check();
    await expect(dialog.locator('[data-field="hp-fields"]')).toBeVisible();
    await expect(dialog.locator('input[data-field="hpCurrent"]')).toHaveValue('10');
    await expect(dialog.locator('input[data-field="hpMax"]')).toHaveValue('10');

    // The standard 5e conditions are all present as chips
    for (const name of ['Poisoned', 'Stunned', 'Prone', 'Invisible']) {
      await expect(dialog.locator('.condition-chip', { hasText: name })).toBeVisible();
    }

    // Toggling a chip flips its aria-pressed state
    const poisoned = dialog.locator('.condition-chip', { hasText: 'Poisoned' });
    await expect(poisoned).toHaveAttribute('aria-pressed', 'false');
    await poisoned.click();
    await expect(poisoned).toHaveAttribute('aria-pressed', 'true');
    await poisoned.click();
    await expect(poisoned).toHaveAttribute('aria-pressed', 'false');
  });

  test('Damage/Heal dialog applies bulk damage', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    // Place a token, track HP (default 10/10)
    await openEditorForFirstToken(page);
    const editor = page.getByRole('dialog', { name: 'Edit Token' });
    await editor.locator('input[data-field="trackHp"]').check();
    await page.keyboard.press('Escape');
    await expect(editor).toBeHidden();

    // Right-click the token to open the context menu, then Damage/Heal…
    const box = await page.locator('#canvas').boundingBox();
    if (!box) throw new Error('canvas has no bounding box');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: 'right' });
    await expect(page.getByRole('menuitem', { name: /Damage \/ Heal/ })).toBeVisible();
    await page.getByRole('menuitem', { name: /Damage \/ Heal/ }).click();

    const dmg = page.getByRole('dialog', { name: /Damage or heal/i });
    await expect(dmg).toBeVisible();
    // Summary acknowledges 1 target with its current / max.
    await expect(dmg.locator('[data-field="summary"]')).toContainText('10/10');

    // Enter 3 damage and apply with Enter.
    const amount = dmg.locator('input[data-field="amount"]');
    await amount.fill('3');
    await amount.press('Enter');
    await expect(dmg).toBeHidden();

    // Re-open editor to verify HP decreased.
    await page.keyboard.press('e');
    await expect(page.getByRole('dialog', { name: 'Edit Token' })).toBeVisible();
    await expect(page.locator('input[data-field="hpCurrent"]')).toHaveValue('7');
  });

  test('Damage/Heal is disabled when no token in selection has HP', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await placeTokenAtCanvasCenter(page);
    await page.keyboard.press('s');
    const box = await page.locator('#canvas').boundingBox();
    if (!box) throw new Error('canvas has no bounding box');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

    // Right-click without having turned on HP tracking.
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: 'right' });
    const dmgItem = page.getByRole('menuitem', { name: /Damage \/ Heal/ });
    await expect(dmgItem).toBeVisible();
    await expect(dmgItem).toBeDisabled();
  });
});
