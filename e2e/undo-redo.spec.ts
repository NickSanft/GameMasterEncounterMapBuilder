import { test, expect, type Page } from '@playwright/test';

/**
 * End-to-end verification that the undo / redo shortcuts round-trip
 * through the full state machine for the common mutations the GM
 * makes every session: token placement, token deletion, and fog paint.
 *
 * Assertions hang off the canvas aria-label which the GM entry keeps in
 * sync with token count + fog-revealed percentage — no need to peek
 * into in-memory state from the test.
 */

async function placeTokenAtCenter(page: Page): Promise<{ cx: number; cy: number }> {
  await page.keyboard.press('t');
  const box = await page.locator('#canvas').boundingBox();
  if (!box) throw new Error('canvas has no bounding box');
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.click(cx, cy);
  // Re-arm the Select tool so subsequent clicks don't drop more tokens.
  await page.keyboard.press('s');
  return { cx, cy };
}

test.describe('Undo / redo', () => {
  test('Ctrl+Z undoes a token placement and Ctrl+Y redoes it', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await placeTokenAtCenter(page);
    await expect(page.locator('#canvas')).toHaveAttribute('aria-label', /1 token/);

    await page.keyboard.press('Control+z');
    await expect(page.locator('#canvas')).toHaveAttribute('aria-label', /0 tokens/);

    await page.keyboard.press('Control+y');
    await expect(page.locator('#canvas')).toHaveAttribute('aria-label', /1 token/);
  });

  test('Ctrl+Shift+Z also redoes (common editor mapping)', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await placeTokenAtCenter(page);
    await page.keyboard.press('Control+z');
    await expect(page.locator('#canvas')).toHaveAttribute('aria-label', /0 tokens/);
    await page.keyboard.press('Control+Shift+z');
    await expect(page.locator('#canvas')).toHaveAttribute('aria-label', /1 token/);
  });

  test('undo after token deletion restores the token', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await placeTokenAtCenter(page);
    // Token already selected after placement via the Select tool, but
    // the Token tool leaves it unselected — re-click to select.
    const box = await page.locator('#canvas').boundingBox();
    if (!box) throw new Error('canvas has no bounding box');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.keyboard.press('Delete');
    await expect(page.locator('#canvas')).toHaveAttribute('aria-label', /0 tokens/);

    await page.keyboard.press('Control+z');
    await expect(page.locator('#canvas')).toHaveAttribute('aria-label', /1 token/);
  });

  test('undo after a fog reveal brings the % back to zero', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    // Baseline: zero revealed.
    await expect(page.locator('#canvas')).toHaveAttribute(
      'aria-label',
      /0% of fog revealed/,
    );

    // Switch to Reveal tool and drag across a handful of cells.
    await page.keyboard.press('r');
    const box = await page.locator('#canvas').boundingBox();
    if (!box) throw new Error('canvas has no bounding box');
    await page.mouse.move(box.x + box.width * 0.35, box.y + box.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.55, {
      steps: 4,
    });
    await page.mouse.up();

    await expect(page.locator('#canvas')).toHaveAttribute(
      'aria-label',
      /[1-9]\d*% of fog revealed/,
    );

    // Undo the reveal — we're back to 0%.
    await page.keyboard.press('Control+z');
    await expect(page.locator('#canvas')).toHaveAttribute(
      'aria-label',
      /0% of fog revealed/,
    );
  });

  test('undo after moving a token returns it to its original cell', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await placeTokenAtCenter(page);
    const box = await page.locator('#canvas').boundingBox();
    if (!box) throw new Error('canvas has no bounding box');

    // Select the token + arrow-key move right five cells (Shift+ArrowRight).
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.keyboard.press('Shift+ArrowRight');

    // Open the editor to check the X coord so we know the move committed.
    await page.keyboard.press('e');
    const xField = page.locator('input[data-field="x"]');
    const afterMoveX = await xField.inputValue();
    // Close the editor with Escape (it would otherwise absorb Ctrl+Z).
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Edit Token' })).toBeHidden();

    // Undo the move.
    await page.keyboard.press('Control+z');
    await page.keyboard.press('e');
    const rolledBackX = await xField.inputValue();
    await page.keyboard.press('Escape');

    expect(Number(rolledBackX)).toBeLessThan(Number(afterMoveX));
  });

  test('undo / redo buttons in the toolbar also work', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await placeTokenAtCenter(page);
    await expect(page.locator('#canvas')).toHaveAttribute('aria-label', /1 token/);

    // The toolbar action buttons carry titles that mention the shortcut,
    // so match on title rather than the glyphed label text.
    const undoBtn = page.locator('button[title^="Undo"]');
    const redoBtn = page.locator('button[title^="Redo"]');
    await expect(undoBtn).toBeEnabled();
    await undoBtn.click();
    await expect(page.locator('#canvas')).toHaveAttribute('aria-label', /0 tokens/);

    await expect(redoBtn).toBeEnabled();
    await redoBtn.click();
    await expect(page.locator('#canvas')).toHaveAttribute('aria-label', /1 token/);
  });
});
