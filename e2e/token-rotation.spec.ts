import { test, expect, type Page } from '@playwright/test';

async function placeAndSelectToken(page: Page) {
  await page.keyboard.press('t');
  const box = await page.locator('#canvas').boundingBox();
  if (!box) throw new Error('canvas has no bounding box');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  // Back to Select and click to select the new token.
  await page.keyboard.press('s');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

test.describe('Token rotation / facing', () => {
  test('token editor exposes rotation field + compass readout', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await placeAndSelectToken(page);
    await page.keyboard.press('e');
    const dialog = page.getByRole('dialog', { name: 'Edit Token' });
    await expect(dialog).toBeVisible();

    // Default: 0°, compass "N"
    const rotation = dialog.locator('input[data-field="rotation"]');
    await expect(rotation).toHaveValue('0');
    await expect(dialog.locator('[data-field="rotation-compass"]')).toHaveText('N');

    // Click the ↻ 90° button — should become 90°, "E".
    await dialog.getByRole('button', { name: /↻ 90°/ }).click();
    await expect(rotation).toHaveValue('90');
    await expect(dialog.locator('[data-field="rotation-compass"]')).toHaveText('E');

    // Click the ↻ 45° button — should become 135°, "SE".
    await dialog.getByRole('button', { name: /↻ 45°/ }).click();
    await expect(rotation).toHaveValue('135');
    await expect(dialog.locator('[data-field="rotation-compass"]')).toHaveText('SE');

    // Reset to N via the "N" button.
    await dialog.getByRole('button', { name: 'N', exact: true }).click();
    await expect(rotation).toHaveValue('0');
    await expect(dialog.locator('[data-field="rotation-compass"]')).toHaveText('N');
  });

  test(', / . canvas shortcuts rotate the selection', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await placeAndSelectToken(page);

    // `.` rotates 45° CW → 45° / NE
    await page.keyboard.press('.');
    await page.keyboard.press('e');
    const dialog = page.getByRole('dialog', { name: 'Edit Token' });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('input[data-field="rotation"]')).toHaveValue('45');
    await expect(dialog.locator('[data-field="rotation-compass"]')).toHaveText('NE');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    // Shift+. (`>`) rotates an additional 90° CW → 135° / SE
    await page.keyboard.press('>');
    await page.keyboard.press('e');
    await expect(dialog.locator('input[data-field="rotation"]')).toHaveValue('135');
    await expect(dialog.locator('[data-field="rotation-compass"]')).toHaveText('SE');
    await page.keyboard.press('Escape');

    // `,` wraps backward: 135° - 45° = 90° / E
    await page.keyboard.press(',');
    await page.keyboard.press('e');
    await expect(dialog.locator('input[data-field="rotation"]')).toHaveValue('90');
    await expect(dialog.locator('[data-field="rotation-compass"]')).toHaveText('E');
  });

  test('typing a custom degree value commits on Enter', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await placeAndSelectToken(page);
    await page.keyboard.press('e');
    const dialog = page.getByRole('dialog', { name: 'Edit Token' });
    await expect(dialog).toBeVisible();

    const rotation = dialog.locator('input[data-field="rotation"]');
    await rotation.fill('225');
    await rotation.press('Enter');
    await expect(rotation).toHaveValue('225');
    await expect(dialog.locator('[data-field="rotation-compass"]')).toHaveText('SW');
  });
});
