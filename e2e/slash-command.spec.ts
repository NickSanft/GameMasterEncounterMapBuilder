import { test, expect } from '@playwright/test';

/**
 * Phase 74 — slash-command input.
 *
 * Press `/` to pop a small floating input at the top of the screen.
 * Type a slash command (`/r 1d20+5`, `/d20`, `/init`, `/help`) or a
 * bare expression (`2d6+3`); Enter dispatches; Escape cancels.
 * `/init` is GM-only — Spectator returns an inline error.
 */

test.describe('Slash-command input', () => {
  test('pressing / opens the input; Escape closes it', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    // Not visible by default.
    await expect(page.locator('.slash-input')).toBeHidden();

    await page.keyboard.press('/');
    const input = page.locator('.slash-input-field');
    await expect(input).toBeVisible();
    await expect(input).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(page.locator('.slash-input')).toBeHidden();
  });

  test('/d20 rolls + adds a history entry to the dice panel', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await page.keyboard.press('/');
    await page.locator('.slash-input-field').fill('d20');
    await page.keyboard.press('Enter');

    // Slash input closes after a successful command.
    await expect(page.locator('.slash-input')).toBeHidden();

    // Open the dice panel and check the history.
    await page.locator('.dice-button').click();
    const dialog = page.getByRole('dialog', { name: 'Dice roller' });
    const items = dialog.locator('.dice-history-item');
    await expect(items).toHaveCount(1);
    const totalText = await items.first().locator('.dice-history-total').innerText();
    const total = parseInt(totalText, 10);
    expect(total).toBeGreaterThanOrEqual(1);
    expect(total).toBeLessThanOrEqual(20);
    await expect(items.first().locator('.dice-history-source')).toContainText('1d20');
  });

  test('/r 2d6+3 also rolls and pops the dice tray', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await page.keyboard.press('/');
    await page.locator('.slash-input-field').fill('r 2d6+3');
    await page.keyboard.press('Enter');

    // Animated tray (Phase 73) appears with two d6 silhouettes.
    const tray = page.locator('.dice-tray');
    await expect(tray).toBeVisible({ timeout: 3000 });
    await expect(tray.locator('.dice-tray-die')).toHaveCount(2);
    for (let i = 0; i < 2; i++) {
      await expect(tray.locator('.dice-tray-die').nth(i)).toHaveAttribute(
        'data-sides',
        '6',
      );
    }
  });

  test('/d20+5 is shorthand that includes the modifier', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await page.keyboard.press('/');
    await page.locator('.slash-input-field').fill('d20+5');
    await page.keyboard.press('Enter');

    await page.locator('.dice-button').click();
    const dialog = page.getByRole('dialog', { name: 'Dice roller' });
    const totalText = await dialog
      .locator('.dice-history-total')
      .first()
      .innerText();
    const total = parseInt(totalText, 10);
    // 1d20+5 → [6, 25]
    expect(total).toBeGreaterThanOrEqual(6);
    expect(total).toBeLessThanOrEqual(25);
  });

  test('/foo shows an inline error and keeps the input open', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await page.keyboard.press('/');
    await page.locator('.slash-input-field').fill('foo');
    await page.keyboard.press('Enter');

    // Input still visible, error visible.
    await expect(page.locator('.slash-input')).toBeVisible();
    await expect(page.locator('.slash-input-error.visible')).toBeVisible();
    await expect(page.locator('.slash-input-error')).toContainText('/foo');
  });

  test('/init seeds initiative entries for placed tokens (GM only)', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    // Place two tokens so /init has something to roll for.
    await page.keyboard.press('t');
    const box = await page.locator('#canvas').boundingBox();
    if (!box) throw new Error('canvas has no bounding box');
    await page.mouse.click(box.x + box.width * 0.4, box.y + box.height * 0.5);
    await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.5);

    // Press /init.
    await page.keyboard.press('/');
    await page.locator('.slash-input-field').fill('init');
    await page.keyboard.press('Enter');
    await expect(page.locator('.slash-input')).toBeHidden();

    // The initiative bar should now be visible because round-1 just
    // started. Open the tracker to count entries.
    // (Easiest: open via the session menu's Initiative button.)
    await page
      .getByRole('button', { name: 'Initiative', exact: true })
      .click();
    const tracker = page.getByRole('dialog', { name: 'Initiative tracker' });
    await expect(tracker).toBeVisible();
    await expect(tracker.locator('.initiative-list-row')).toHaveCount(2);
  });

  test('Spectator: /init returns an inline error (GM-only command)', async ({
    page,
  }) => {
    await page.goto('./spectator.html');
    await page.waitForSelector('#canvas');

    await page.keyboard.press('/');
    await page.locator('.slash-input-field').fill('init');
    await page.keyboard.press('Enter');

    await expect(page.locator('.slash-input-error.visible')).toBeVisible();
    await expect(page.locator('.slash-input-error')).toContainText('GM-only');
  });

  test('/help opens the keyboard-shortcut overlay', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await page.keyboard.press('/');
    await page.locator('.slash-input-field').fill('help');
    await page.keyboard.press('Enter');

    await expect(page.locator('.slash-input')).toBeHidden();
    await expect(
      page.getByRole('dialog', { name: 'Keyboard shortcuts' }),
    ).toBeVisible();
  });

  test('typing / inside an editable field does NOT hijack the key', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    // Open the dice panel and put focus in the expression input.
    await page.locator('.dice-button').click();
    const dialog = page.getByRole('dialog', { name: 'Dice roller' });
    const expr = dialog.locator('input[data-field="expr"]');
    await expr.focus();
    await expr.type('/');

    // The slash-input overlay should NOT have appeared.
    await expect(page.locator('.slash-input')).toBeHidden();
    // The literal `/` made it into the dice expression input.
    await expect(expr).toHaveValue('/');
  });
});
