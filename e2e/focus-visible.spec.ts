/**
 * Phase 88 — focus-visible audit per theme.
 *
 * Verifies that every interactive surface paints a visible focus
 * indicator in every theme. Pre-88 several inputs had `outline: none`
 * without an alternative ring — the only sign of focus was a 1 px
 * `border-color` shift to the accent, often hard to see at a glance.
 *
 * The assertion strategy is computed-style based: we focus an element
 * via `.focus()` and assert that AT LEAST one of {outline-style ≠ none,
 * box-shadow ≠ none, border-color === accent} resolves to a visible
 * indicator. Computed-style assertions are stable across browser
 * pixel-rendering differences (which would make a screenshot test
 * flaky between Win32 / Linux / WSL).
 */
import { test, expect, type Page } from '@playwright/test';

const THEMES = ['dark', 'light', 'parchment', 'console', 'purple-dusk'] as const;

async function applyTheme(page: Page, theme: (typeof THEMES)[number]): Promise<void> {
  await page.evaluate((t) => {
    const body = document.body;
    for (const x of ['dark', 'light', 'parchment', 'console', 'purple-dusk']) {
      body.classList.remove(`theme-${x}`);
    }
    body.classList.add(`theme-${t}`);
  }, theme);
}

/**
 * Returns true iff the focused element has a non-trivial visible focus
 * indicator (outline OR box-shadow). Border-color shifts alone are
 * deliberately NOT counted as "visible focus" — they fail the Phase 88
 * acceptance bar.
 */
async function focusedElementHasVisibleRing(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return false;
    const style = window.getComputedStyle(el);
    const outlineStyle = style.outlineStyle;
    const outlineWidth = parseFloat(style.outlineWidth) || 0;
    const boxShadow = style.boxShadow;
    const hasOutline = outlineStyle !== 'none' && outlineWidth >= 1;
    const hasBoxShadow = boxShadow !== 'none' && boxShadow !== '';
    return hasOutline || hasBoxShadow;
  });
}

test.describe('Phase 88 — focus-visible across themes', () => {
  for (const theme of THEMES) {
    test(`toolbar buttons get a visible focus ring (theme: ${theme})`, async ({
      page,
    }) => {
      await page.goto('./gm.html');
      await page.waitForSelector('#canvas');
      await applyTheme(page, theme);

      // Focus the first toolbar button programmatically; :focus-visible
      // fires for keyboard-style focus, which `.focus()` triggers in
      // Chromium for non-clickable elements. Buttons are clickable, so
      // we use Tab to land on one.
      await page.keyboard.press('Tab');
      // Step Tab a few times to land inside the toolbar (skipping the
      // skip-link).
      for (let i = 0; i < 6; i++) {
        await page.keyboard.press('Tab');
      }
      expect(await focusedElementHasVisibleRing(page)).toBe(true);
    });
  }

  test('modal text input shows a box-shadow ring on focus', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    // Open the Settings modal which has lots of inputs.
    await page.getByRole('button', { name: 'Settings' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Focus the first text-style input inside the modal.
    const input = dialog.locator('input[type="text"], input[type="number"]').first();
    await input.focus();

    const ringInfo = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return null;
      const style = window.getComputedStyle(el);
      return { boxShadow: style.boxShadow };
    });
    expect(ringInfo).not.toBeNull();
    // Pre-88 the input got only a 1 px border-color change → boxShadow === 'none'.
    // Post-88 the input gets a 2 px box-shadow ring.
    expect(ringInfo!.boxShadow).not.toBe('none');
  });

  test('high-contrast preference bumps the ring width to 3 px', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await page.evaluate(() => {
      document.body.classList.add('high-contrast');
    });

    // Tab onto a toolbar button.
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
    }
    const outlineWidth = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return null;
      return parseFloat(window.getComputedStyle(el).outlineWidth);
    });
    expect(outlineWidth).toBeGreaterThanOrEqual(3);
  });
});
