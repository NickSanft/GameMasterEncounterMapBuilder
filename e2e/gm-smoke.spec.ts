import { test, expect } from '@playwright/test';

test.describe('GM view smoke', () => {
  test.beforeEach(async ({ page }) => {
    // Each test gets a clean storage state so persisted tokens / prefs
    // from one test never leak into the next.
    await page.context().clearCookies();
  });

  test('canvas + toolbar + session menu render', async ({ page }) => {
    await page.goto('./gm.html');

    await expect(page.locator('#canvas')).toBeVisible();

    // Toolbar tools — toolbar.ts sets aria-label from `title`, so we locate
    // by the data-tool attribute (which is the canonical id).
    for (const id of ['select', 'token', 'fog-reveal', 'fog-hide', 'background', 'note', 'measure', 'aoe']) {
      await expect(page.locator(`button[data-tool="${id}"]`)).toBeVisible();
    }

    // Session menu buttons
    for (const label of [
      'Upload Map',
      'Preset Maps',
      'Token Library',
      'Template Library',
      'Initiative',
      'Export',
      'Import',
      'Notes',
      'Shortcuts',
      'Settings',
      'New Session',
    ]) {
      await expect(page.getByRole('button', { name: label, exact: true })).toBeVisible();
    }

    // GM badge
    await expect(page.locator('.view-badge')).toHaveText('GM View');
  });

  test('? opens and closes the keyboard shortcut overlay', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    // Send a "?" KeyboardEvent directly. Playwright's `Shift+/` doesn't
    // always reach the window-level handler with key === '?'.
    await page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }));
    });
    await expect(page.getByRole('dialog', { name: /Keyboard shortcuts/i })).toBeVisible();
    // The new "Token editor" section we added in Phase 30 should show up.
    await expect(page.locator('.shortcut-section h3', { hasText: 'Token editor' })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: /Keyboard shortcuts/i })).toBeHidden();
  });

  test('Settings modal opens with every tab and the new Diagnostics controls', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Settings' });
    await expect(dialog).toBeVisible();

    // All five tabs are wired
    for (const tab of ['Grid', 'Appearance', 'Camera', 'Accessibility', 'Diagnostics']) {
      await expect(dialog.getByRole('tab', { name: tab })).toBeVisible();
    }

    // Diagnostics tab — the Phase 29 / 28c controls live here.
    await dialog.getByRole('tab', { name: 'Diagnostics' }).click();
    await expect(dialog.getByRole('checkbox', { name: /Show diagnostics overlay/i })).toBeVisible();
    await expect(dialog.getByRole('checkbox', { name: /Show Spectator viewport overlay/i })).toBeVisible();
    await expect(dialog.getByRole('button', { name: /Scan and remove unused images/i })).toBeVisible();
    await expect(dialog.getByRole('button', { name: /Reset preferences to defaults/i })).toBeVisible();

    // Toggle the diagnostics overlay and confirm the floating panel appears.
    await dialog.getByRole('checkbox', { name: /Show diagnostics overlay/i }).check();
    await expect(page.locator('.diagnostics-overlay')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('Preset Maps modal opens with cards and is scrollable', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await page.getByRole('button', { name: 'Preset Maps', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: /Choose Preset Map/i });
    await expect(dialog).toBeVisible();

    const cards = dialog.locator('.preset-card');
    // Phase 27 added 10 presets. Use >=4 as a robust lower bound.
    expect(await cards.count()).toBeGreaterThanOrEqual(4);

    // The modal body is overflow-y:auto. Confirm scrollHeight exceeds clientHeight
    // (or that overflow-y is set), so a scrollbar is available when the list is long.
    const body = dialog.locator('.modal-body');
    const overflowY = await body.evaluate((el) => getComputedStyle(el).overflowY);
    expect(['auto', 'scroll']).toContain(overflowY);

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('Token Library and Template Library modals open with empty state', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await page.getByRole('button', { name: 'Token Library', exact: true }).click();
    const tokenLib = page.getByRole('dialog', { name: 'Token Library' });
    await expect(tokenLib).toBeVisible();
    await expect(tokenLib.locator('.library-empty')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(tokenLib).toBeHidden();

    await page.getByRole('button', { name: 'Template Library', exact: true }).click();
    const tmplLib = page.getByRole('dialog', { name: 'Template Library' });
    await expect(tmplLib).toBeVisible();
    await expect(tmplLib.locator('.library-empty')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(tmplLib).toBeHidden();
  });

  test('Initiative tracker opens from the session menu', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await page.getByRole('button', { name: 'Initiative', exact: true }).click();
    await expect(page.getByRole('dialog', { name: /Initiative/i })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: /Initiative/i })).toBeHidden();
  });
});
