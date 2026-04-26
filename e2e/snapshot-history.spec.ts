/**
 * Phase 97 — auto-save snapshot history.
 *
 * Validates the surface visible to a real user:
 *   - Session menu has a "Snapshots…" entry that opens the modal.
 *   - Empty state copy when the scene has no snapshots yet.
 *   - Spectator session menu does NOT include the entry (GM-only).
 *
 * The IDB-backed snapshot capture + rotation logic is exhaustively
 * unit-tested in `src/state/snapshot-history.test.ts` with fake IDB +
 * a clock seam. Going beyond that with a real-time Playwright spec
 * would require either waiting 30+ seconds for a real snapshot (the
 * MIN_INTERVAL_MS rate-limit) or threading a clock seam through the
 * production save path — neither buys much over the unit coverage.
 */
import { test, expect } from '@playwright/test';

test.describe('Phase 97 — snapshot history', () => {
  test('GM session menu has a "Snapshots…" entry that opens an empty modal', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    const trigger = page.getByRole('button', { name: 'Snapshots…' });
    await expect(trigger).toBeVisible();
    await trigger.click();

    const modal = page.locator('.snapshot-history-modal');
    await expect(modal).toBeVisible();
    await expect(modal.locator('h2')).toHaveText('Restore from snapshot');
    // Fresh boot — no snapshots yet (the modal opens immediately;
    // the persist debounce + rate-limit haven't had time to record one).
    await expect(modal.locator('[data-field="empty"]')).toBeVisible();
    await expect(modal.locator('[data-field="empty"]')).toContainText(
      /No snapshots yet/,
    );
  });

  test('Esc closes the modal', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await page.getByRole('button', { name: 'Snapshots…' }).click();
    const modal = page.locator('.snapshot-history-modal');
    await expect(modal).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();
  });

  test('command palette has a "Restore from snapshot…" entry', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await page.keyboard.press('Control+K');
    await page.locator('.command-palette-input').fill('snapshot');
    const items = page.locator('.command-palette-item');
    await expect(items.first()).toContainText(/Restore from snapshot/);
  });

  test('Spectator session menu does NOT include "Snapshots…"', async ({
    page,
  }) => {
    await page.goto('./spectator.html');
    await page.waitForSelector('#canvas');
    await expect(page.getByRole('button', { name: 'Snapshots…' })).toHaveCount(0);
  });
});
