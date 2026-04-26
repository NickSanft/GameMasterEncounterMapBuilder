/**
 * Phase 107 — dice expression history recall in the slash-command input.
 *
 * Validates:
 *   - After running a roll via `/`, opening the input again + pressing
 *     Up restores the most recent expression.
 *   - Subsequent Up presses walk to older entries; Down walks back.
 *   - Past the newest entry, Down restores the live draft (the text
 *     the user had typed BEFORE pressing Up).
 *   - Typing any character after a recall resets the cursor so the
 *     next Up press starts from the newest entry again.
 *   - Up with no history yet is a silent no-op (input value unchanged).
 *
 * Persistence: the test setup wipes localStorage between cases (in
 * `tests/setup.ts`), so each test starts with empty dice history.
 * Visiting the page first then doing the rolls populates fresh.
 */
import { test, expect, type Page } from '@playwright/test';

async function openSlashInput(page: Page) {
  await page.keyboard.press('/');
  const input = page.locator('.slash-input-field');
  await expect(input).toBeVisible();
  await expect(input).toBeFocused();
  return input;
}

async function dispatch(page: Page, expr: string) {
  const input = await openSlashInput(page);
  await input.fill(expr);
  await page.keyboard.press('Enter');
  await expect(page.locator('.slash-input')).toBeHidden();
}

test.describe('Phase 107 — dice expression history recall', () => {
  test('Up restores the most recent expression after a successful roll', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await dispatch(page, '1d20+5');

    // Re-open the slash input — empty by default.
    const input = await openSlashInput(page);
    await expect(input).toHaveValue('');

    // Up brings back the most recent expression.
    await page.keyboard.press('ArrowUp');
    await expect(input).toHaveValue('1d20+5');
  });

  test('Up cycles to older entries; Down walks back; Down past newest restores live draft', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await dispatch(page, '1d20');
    await dispatch(page, '2d6');
    await dispatch(page, '3d8+2');

    const input = await openSlashInput(page);
    // Type a partial draft FIRST so Down-past-newest has something to
    // restore.
    await input.fill('partial-draft');

    // Up → newest entry (3d8+2).
    await page.keyboard.press('ArrowUp');
    await expect(input).toHaveValue('3d8+2');

    // Up again → 2d6.
    await page.keyboard.press('ArrowUp');
    await expect(input).toHaveValue('2d6');

    // Up again → 1d20.
    await page.keyboard.press('ArrowUp');
    await expect(input).toHaveValue('1d20');

    // Up again at the oldest entry is a no-op.
    await page.keyboard.press('ArrowUp');
    await expect(input).toHaveValue('1d20');

    // Down → 2d6.
    await page.keyboard.press('ArrowDown');
    await expect(input).toHaveValue('2d6');

    // Down → 3d8+2.
    await page.keyboard.press('ArrowDown');
    await expect(input).toHaveValue('3d8+2');

    // Down past the newest restores the live draft we typed earlier.
    await page.keyboard.press('ArrowDown');
    await expect(input).toHaveValue('partial-draft');
  });

  test('typing after a recall resets the cursor so next Up starts from newest', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await dispatch(page, '1d20');
    await dispatch(page, '2d6');

    const input = await openSlashInput(page);
    // Up → 2d6 (newest).
    await page.keyboard.press('ArrowUp');
    await expect(input).toHaveValue('2d6');
    // Up → 1d20 (older).
    await page.keyboard.press('ArrowUp');
    await expect(input).toHaveValue('1d20');

    // Type a character. Cursor should reset.
    await page.keyboard.type('x');
    await expect(input).toHaveValue('1d20x');

    // Next Up should start from the newest entry, not jump to "even older".
    await page.keyboard.press('ArrowUp');
    await expect(input).toHaveValue('2d6');
  });

  test('Up with no history yet is a silent no-op (input stays empty)', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    const input = await openSlashInput(page);
    await page.keyboard.press('ArrowUp');
    await expect(input).toHaveValue('');
  });

  test('non-roll commands are NOT recorded (only roll actions go to history)', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    // /help opens the shortcut overlay + closes the slash input. It's
    // a non-roll command — should NOT pollute the dice history.
    await dispatch(page, 'help');
    // Close the help overlay so it doesn't intercept future keystrokes.
    await page.keyboard.press('Escape');

    // Now dispatch a real roll.
    await dispatch(page, '1d20+1');

    // Open the slash input — Up should bring back 1d20+1, not 'help'.
    const input = await openSlashInput(page);
    await page.keyboard.press('ArrowUp');
    await expect(input).toHaveValue('1d20+1');
    // Up again should be a no-op (no older entries).
    await page.keyboard.press('ArrowUp');
    await expect(input).toHaveValue('1d20+1');
  });

  test('duplicate rolls move to the front rather than stacking', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await dispatch(page, '1d20');
    await dispatch(page, '2d6');
    await dispatch(page, '1d20'); // re-roll the older expression

    const input = await openSlashInput(page);
    // Up → newest is 1d20 (re-rolled).
    await page.keyboard.press('ArrowUp');
    await expect(input).toHaveValue('1d20');
    // Up → 2d6.
    await page.keyboard.press('ArrowUp');
    await expect(input).toHaveValue('2d6');
    // Up at oldest is a no-op (1d20 is NOT here twice).
    await page.keyboard.press('ArrowUp');
    await expect(input).toHaveValue('2d6');
  });
});
