import { test, expect } from '@playwright/test';

test.describe('Session persistence (IDB-backed)', () => {
  test('a placed token survives a page reload', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    // Place one token at the canvas center via the Token tool.
    await page.keyboard.press('t');
    const box = await page.locator('#canvas').boundingBox();
    if (!box) throw new Error('canvas has no bounding box');
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.click(cx, cy);

    // Give the debounced persist (200ms) a moment to flush through the
    // async IDB write. 500ms is plenty; the write itself is microseconds.
    await page.waitForTimeout(500);

    // Reload. After the async hydrate completes the token should be
    // back — verify by selecting + opening the editor.
    await page.reload();
    await page.waitForSelector('#canvas');
    // Give the async loadPersistedState() time to resolve.
    await page.waitForTimeout(300);

    await page.keyboard.press('s');
    await page.mouse.click(cx, cy);
    await page.keyboard.press('e');

    const dialog = page.getByRole('dialog', { name: 'Edit Token' });
    await expect(dialog).toBeVisible();
    // Default label for the first placed token is "Token 1".
    await expect(page.locator('input[data-field="label"]')).toHaveValue('Token 1');
  });
});
