import { test, expect } from '@playwright/test';

test.describe('Dice roller', () => {
  test('🎲 button opens panel with quick dice + empty history', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    const diceBtn = page.locator('.dice-button');
    await expect(diceBtn).toBeVisible();
    await diceBtn.click();

    const dialog = page.getByRole('dialog', { name: 'Dice roller' });
    await expect(dialog).toBeVisible();

    // Quick dice buttons — every classic TTRPG die.
    for (const label of ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100']) {
      await expect(dialog.getByRole('button', { name: label, exact: true })).toBeVisible();
    }

    // Empty-history message visible.
    await expect(dialog.locator('.dice-history-empty')).toBeVisible();
  });

  test('clicking d20 rolls, adds a history entry in [1, 20]', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await page.locator('.dice-button').click();
    const dialog = page.getByRole('dialog', { name: 'Dice roller' });

    await dialog.getByRole('button', { name: 'd20', exact: true }).click();

    // Empty state is gone.
    await expect(dialog.locator('.dice-history-empty')).toBeHidden();
    const items = dialog.locator('.dice-history-item');
    await expect(items).toHaveCount(1);

    // Total is a number in [1, 20].
    const totalText = await items.first().locator('.dice-history-total').innerText();
    const total = parseInt(totalText, 10);
    expect(total).toBeGreaterThanOrEqual(1);
    expect(total).toBeLessThanOrEqual(20);

    // Source label mentions "1d20".
    await expect(items.first().locator('.dice-history-source')).toContainText('1d20');
  });

  test('custom expression is parsed + Enter rolls it', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await page.locator('.dice-button').click();
    const dialog = page.getByRole('dialog', { name: 'Dice roller' });

    const expr = dialog.locator('input[data-field="expr"]');
    await expr.fill('2d6+3');
    await expr.press('Enter');

    const items = dialog.locator('.dice-history-item');
    await expect(items).toHaveCount(1);
    const totalText = await items.first().locator('.dice-history-total').innerText();
    const total = parseInt(totalText, 10);
    // 2d6+3 → min 5, max 15
    expect(total).toBeGreaterThanOrEqual(5);
    expect(total).toBeLessThanOrEqual(15);
  });

  test('malformed expression shows an inline error without adding to history', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await page.locator('.dice-button').click();
    const dialog = page.getByRole('dialog', { name: 'Dice roller' });

    const expr = dialog.locator('input[data-field="expr"]');
    await expr.fill('zzz');
    await expr.press('Enter');

    await expect(dialog.locator('.dice-error.visible')).toBeVisible();
    await expect(dialog.locator('.dice-history-item')).toHaveCount(0);
  });

  test('Clear history button empties the list', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await page.locator('.dice-button').click();
    const dialog = page.getByRole('dialog', { name: 'Dice roller' });

    await dialog.getByRole('button', { name: 'd6', exact: true }).click();
    await dialog.getByRole('button', { name: 'd8', exact: true }).click();
    await expect(dialog.locator('.dice-history-item')).toHaveCount(2);

    await dialog.getByRole('button', { name: 'Clear', exact: true }).click();
    await expect(dialog.locator('.dice-history-item')).toHaveCount(0);
    await expect(dialog.locator('.dice-history-empty')).toBeVisible();
  });

  test('Escape closes the panel', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await page.locator('.dice-button').click();
    const dialog = page.getByRole('dialog', { name: 'Dice roller' });
    await expect(dialog).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('Spectator view also exposes the dice button', async ({ page }) => {
    await page.goto('./spectator.html');
    await page.waitForSelector('#canvas');

    const diceBtn = page.locator('.dice-button');
    await expect(diceBtn).toBeVisible();
    await diceBtn.click();
    await expect(page.getByRole('dialog', { name: 'Dice roller' })).toBeVisible();
  });
});
