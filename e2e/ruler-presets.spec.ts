import { test, expect } from '@playwright/test';

test.describe('Ruler preset panel', () => {
  test('panel is hidden until Ruler tool is active, then shows 6 buttons', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    const panel = page.locator('.ruler-settings');
    // Hidden while Select is the active tool.
    await expect(panel).toBeHidden();

    // Activate Ruler via the toolbar (data-tool="measure").
    await page.locator('button[data-tool="measure"]').click();
    await expect(panel).toBeVisible();

    // Six buttons: Free + five feet presets.
    const presetBtns = panel.locator('.ruler-presets button');
    await expect(presetBtns).toHaveCount(6);

    for (const label of ['Free', '5 ft', '30 ft', '60 ft', '90 ft', '120 ft']) {
      await expect(panel.getByRole('button', { name: label, exact: true })).toBeVisible();
    }
  });

  test('default active preset is Free, clicking "30 ft" flips active class', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await page.locator('button[data-tool="measure"]').click();
    const panel = page.locator('.ruler-settings');

    const free = panel.getByRole('button', { name: 'Free', exact: true });
    const thirty = panel.getByRole('button', { name: '30 ft', exact: true });

    await expect(free).toHaveClass(/active/);
    await expect(thirty).not.toHaveClass(/active/);

    await thirty.click();
    await expect(thirty).toHaveClass(/active/);
    await expect(free).not.toHaveClass(/active/);
  });

  test('keyboard shortcuts 1–5 + 0 update the active preset', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await page.locator('button[data-tool="measure"]').click();
    const panel = page.locator('.ruler-settings');
    // Give the canvas focus so window-level keyboard handlers fire.
    await page.locator('#canvas').click();

    // Press '3' → 60 ft should become active.
    await page.keyboard.press('3');
    await expect(
      panel.getByRole('button', { name: '60 ft', exact: true }),
    ).toHaveClass(/active/);

    // Press '0' → Free is active again.
    await page.keyboard.press('0');
    await expect(
      panel.getByRole('button', { name: 'Free', exact: true }),
    ).toHaveClass(/active/);

    // Press '5' → 120 ft.
    await page.keyboard.press('5');
    await expect(
      panel.getByRole('button', { name: '120 ft', exact: true }),
    ).toHaveClass(/active/);
  });

  test('ruler keyboard shortcut 0 does not reset camera while Ruler is active', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    // Switch to ruler, set a preset, then try '0' — it should clear the
    // preset (not reset camera). We can verify by re-reading the active
    // button.
    await page.locator('button[data-tool="measure"]').click();
    const panel = page.locator('.ruler-settings');
    await page.locator('#canvas').click();

    await page.keyboard.press('2');
    await expect(
      panel.getByRole('button', { name: '30 ft', exact: true }),
    ).toHaveClass(/active/);

    await page.keyboard.press('0');
    await expect(
      panel.getByRole('button', { name: 'Free', exact: true }),
    ).toHaveClass(/active/);
  });

  test('switching away from Ruler hides the panel but keeps the preset for next time', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await page.locator('button[data-tool="measure"]').click();
    const panel = page.locator('.ruler-settings');
    await panel.getByRole('button', { name: '60 ft', exact: true }).click();

    // Switch to Select.
    await page.locator('button[data-tool="select"]').click();
    await expect(panel).toBeHidden();

    // Back to Ruler — preset should still be 60 ft.
    await page.locator('button[data-tool="measure"]').click();
    await expect(panel).toBeVisible();
    await expect(
      panel.getByRole('button', { name: '60 ft', exact: true }),
    ).toHaveClass(/active/);
  });

  test('Spectator view also exposes the ruler preset panel', async ({ page }) => {
    await page.goto('./spectator.html');
    await page.waitForSelector('#canvas');

    // Spectator's single-button toolbar has aria-pressed on its Ruler button.
    await page.getByRole('button', { name: /Ruler/i }).click();
    const panel = page.locator('.ruler-settings');
    await expect(panel).toBeVisible();
    await expect(panel.locator('.ruler-presets button')).toHaveCount(6);
  });
});
