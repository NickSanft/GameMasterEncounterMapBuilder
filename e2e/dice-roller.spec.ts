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

  /**
   * Phase 73 — animated dice tray appears on every roll. The tray
   * is a separate overlay from the dice panel; it renders polygon
   * silhouettes for each die + a total + a caption. Early-dismisses
   * on click or Escape; auto-dismisses after ~3.3s.
   */
  test.describe('Phase 73: animated dice tray', () => {
    test('rolling a d20 pops an animated tray that lands on the result', async ({
      page,
    }) => {
      await page.goto('./gm.html');
      await page.waitForSelector('#canvas');

      await page.locator('.dice-button').click();
      const dialog = page.getByRole('dialog', { name: 'Dice roller' });
      await dialog.getByRole('button', { name: 'd20', exact: true }).click();

      // Tray appears. The lazy `import()` may take a few hundred ms
      // on a cold build, so allow a generous timeout.
      const tray = page.locator('.dice-tray');
      await expect(tray).toBeVisible({ timeout: 3000 });

      // Exactly one die silhouette for 1d20.
      const dice = tray.locator('.dice-tray-die');
      await expect(dice).toHaveCount(1);
      await expect(dice.first()).toHaveAttribute('data-sides', '20');

      // Total value is a number in [1, 20] and matches the history.
      await expect(tray.locator('.dice-tray-total-value')).toBeVisible();
      const trayTotal = parseInt(
        (await tray.locator('.dice-tray-total-value').innerText()).trim(),
        10,
      );
      expect(trayTotal).toBeGreaterThanOrEqual(1);
      expect(trayTotal).toBeLessThanOrEqual(20);
      const historyTotal = parseInt(
        (await dialog.locator('.dice-history-total').first().innerText()).trim(),
        10,
      );
      expect(trayTotal).toBe(historyTotal);
    });

    test('4d6 renders four dice silhouettes in the tray', async ({ page }) => {
      await page.goto('./gm.html');
      await page.waitForSelector('#canvas');

      await page.locator('.dice-button').click();
      const dialog = page.getByRole('dialog', { name: 'Dice roller' });
      const expr = dialog.locator('input[data-field="expr"]');
      await expr.fill('4d6');
      await expr.press('Enter');

      const tray = page.locator('.dice-tray');
      await expect(tray).toBeVisible({ timeout: 3000 });
      await expect(tray.locator('.dice-tray-die')).toHaveCount(4);
      // Each die is a d6.
      for (let i = 0; i < 4; i++) {
        await expect(tray.locator('.dice-tray-die').nth(i)).toHaveAttribute(
          'data-sides',
          '6',
        );
      }
    });

    test('mixed-group expression (2d20+1d4+3) renders each die in order', async ({
      page,
    }) => {
      await page.goto('./gm.html');
      await page.waitForSelector('#canvas');

      await page.locator('.dice-button').click();
      const dialog = page.getByRole('dialog', { name: 'Dice roller' });
      const expr = dialog.locator('input[data-field="expr"]');
      await expr.fill('2d20+1d4+3');
      await expr.press('Enter');

      const tray = page.locator('.dice-tray');
      await expect(tray).toBeVisible({ timeout: 3000 });
      await expect(tray.locator('.dice-tray-die')).toHaveCount(3);
      await expect(tray.locator('.dice-tray-die').nth(0)).toHaveAttribute(
        'data-sides',
        '20',
      );
      await expect(tray.locator('.dice-tray-die').nth(1)).toHaveAttribute(
        'data-sides',
        '20',
      );
      await expect(tray.locator('.dice-tray-die').nth(2)).toHaveAttribute(
        'data-sides',
        '4',
      );
    });

    test('pressing Escape dismisses the tray early', async ({ page }) => {
      await page.goto('./gm.html');
      await page.waitForSelector('#canvas');

      await page.locator('.dice-button').click();
      const dialog = page.getByRole('dialog', { name: 'Dice roller' });
      await dialog.getByRole('button', { name: 'd6', exact: true }).click();

      const tray = page.locator('.dice-tray');
      await expect(tray).toBeVisible({ timeout: 3000 });
      // Escape fires on window, independent of the tray's animation
      // state, so it's more stable under CI CPU contention than a
      // click (which has to win a race against the settle keyframe).
      await page.keyboard.press('Escape');
      // Fade takes ~200ms; give a generous window for CI scheduling.
      await expect(tray).toBeHidden({ timeout: 3000 });
    });

    test('4d6kh3 flags the dropped die with the "dropped" class', async ({
      page,
    }) => {
      await page.goto('./gm.html');
      await page.waitForSelector('#canvas');

      await page.locator('.dice-button').click();
      const dialog = page.getByRole('dialog', { name: 'Dice roller' });
      const expr = dialog.locator('input[data-field="expr"]');
      await expr.fill('4d6kh3');
      await expr.press('Enter');

      const tray = page.locator('.dice-tray');
      await expect(tray).toBeVisible({ timeout: 3000 });
      // All 4 dice render; exactly one has the `dropped` class (the
      // lowest of the 4).
      await expect(tray.locator('.dice-tray-die')).toHaveCount(4);
      await expect(
        tray.locator('.dice-tray-die.dice-tray-die-dropped'),
      ).toHaveCount(1);
    });
  });
});
