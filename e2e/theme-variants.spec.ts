import { test, expect, type Page } from '@playwright/test';

/**
 * Phase 59 — flavored theme variants (parchment / console / purple dusk)
 * alongside the original dark + light.
 *
 * What this spec asserts (DOM-side; canvas-pixel diffs are out of scope
 * since we don't keep visual baselines for non-default themes):
 *   - Every theme appears in the Settings → Appearance picker.
 *   - Selecting a non-default theme adds the matching `theme-<name>`
 *     class to the body. Selecting `dark` clears every `theme-*` class.
 *   - The CSS variable for `--bg` resolves to the expected hex color
 *     for each theme — a sharp regression pin that catches any silent
 *     drift between the TS palette and the CSS palette.
 *   - The selection persists across a page reload (preferences
 *     round-trip through localStorage).
 */

const EXPECTED_BG: Record<string, string> = {
  // Values must match `:root` + `body.theme-*` blocks in styles.css.
  dark: 'rgb(27, 29, 34)',
  light: 'rgb(243, 244, 247)',
  parchment: 'rgb(244, 236, 216)',
  console: 'rgb(10, 14, 10)',
  'purple-dusk': 'rgb(26, 21, 50)',
};

async function selectTheme(page: Page, theme: string) {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Settings' });
  await dialog.getByRole('tab', { name: 'Appearance' }).click();
  await dialog.locator(`input[name="settings-theme"][value="${theme}"]`).check();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
}

async function bgColor(page: Page): Promise<string> {
  return page.evaluate(() =>
    window.getComputedStyle(document.body).backgroundColor,
  );
}

test.describe('Theme variants (Phase 59)', () => {
  test('Settings → Appearance exposes every theme in the picker', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Settings' });
    await dialog.getByRole('tab', { name: 'Appearance' }).click();

    for (const value of ['dark', 'light', 'parchment', 'console', 'purple-dusk']) {
      await expect(
        dialog.locator(`input[name="settings-theme"][value="${value}"]`),
      ).toHaveCount(1);
    }
  });

  for (const [theme, expectedRgb] of Object.entries(EXPECTED_BG)) {
    test(`Selecting "${theme}" applies the right body class + --bg color`, async ({
      page,
    }) => {
      await page.goto('./gm.html');
      await page.waitForSelector('#canvas');

      await selectTheme(page, theme);

      // Body class: dark = no class (root baseline); others = theme-<name>.
      const bodyClass = await page
        .locator('body')
        .evaluate((el) => Array.from(el.classList).join(' '));
      if (theme === 'dark') {
        expect(bodyClass).not.toContain('theme-');
      } else {
        expect(bodyClass).toContain(`theme-${theme}`);
      }

      // CSS --bg variable resolves to the expected color — pins TS
      // palette ↔ CSS palette in lockstep.
      expect(await bgColor(page)).toBe(expectedRgb);
    });
  }

  test('Selected theme persists across a page reload', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await selectTheme(page, 'parchment');
    expect(await bgColor(page)).toBe(EXPECTED_BG['parchment']!);

    await page.reload();
    await page.waitForSelector('#canvas');
    // No re-selection needed — preference came back from localStorage.
    expect(await bgColor(page)).toBe(EXPECTED_BG['parchment']!);
  });
});
