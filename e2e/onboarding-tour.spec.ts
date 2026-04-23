import { test, expect, type Page } from '@playwright/test';

/**
 * Phase 61 — onboarding tour.
 *
 * The tour is a 6-step popover walkthrough that auto-shows on first
 * GM boot (preferences.onboardingComplete = false). Once finished
 * or skipped the flag flips to true and the tour stops auto-showing.
 *
 * Tests use addInitScript to seed the preference state — onboarded
 * (skip auto-show) vs first-boot (auto-show) — so each spec has a
 * deterministic starting point.
 */

const PREFS_KEY = 'gm-encounter-maps-prefs';

async function bootGmFresh(page: Page) {
  // Ensure no leaked notes-open from a sibling spec gets in our way.
  await page.addInitScript(() => {
    try {
      localStorage.removeItem('gm-encounter-maps-notes-open');
    } catch { /* ignore */ }
  });
}

async function bootGmOnboarded(page: Page) {
  await bootGmFresh(page);
  await page.addInitScript(() => {
    try {
      const raw = localStorage.getItem('gm-encounter-maps-prefs');
      const prefs = raw ? JSON.parse(raw) : {};
      prefs.onboardingComplete = true;
      localStorage.setItem('gm-encounter-maps-prefs', JSON.stringify(prefs));
    } catch { /* ignore */ }
  });
}

test.describe('Onboarding tour (Phase 61)', () => {
  test('Auto-shows on first boot with the welcome popover', async ({ page }) => {
    await bootGmFresh(page);
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    // The tour mount is deferred 250ms — wait that out plus padding.
    const tour = page.locator('.tour-popover');
    await expect(tour).toBeVisible({ timeout: 2000 });
    await expect(tour.locator('[data-field="title"]')).toHaveText(/welcome/i);
    await expect(tour.locator('[data-field="counter"]')).toHaveText(/1 of 6/);
    // Back is hidden on the first step (no previous step to go to).
    await expect(tour.locator('[data-action="back"]')).toBeHidden();
  });

  test('Does NOT auto-show after onboarding is complete', async ({ page }) => {
    await bootGmOnboarded(page);
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    // Give the deferred 250ms a chance to fire — tour should still be hidden.
    await page.waitForTimeout(600);
    await expect(page.locator('.tour-popover')).toHaveCount(0);
  });

  test('Next advances through every step + Finish closes + persists', async ({
    page,
  }) => {
    await bootGmFresh(page);
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    const tour = page.locator('.tour-popover');
    await expect(tour).toBeVisible({ timeout: 2000 });

    // Walk through all 6 steps via Next; the button label flips to
    // "Finish" on the last step.
    for (let i = 1; i <= 5; i++) {
      await expect(tour.locator('[data-field="counter"]')).toHaveText(
        new RegExp(`${i} of 6`),
      );
      await tour.locator('[data-action="next"]').click();
    }
    await expect(tour.locator('[data-field="counter"]')).toHaveText(/6 of 6/);
    await expect(tour.locator('[data-action="next"]')).toHaveText(/Finish/);
    await tour.locator('[data-action="next"]').click();
    await expect(tour).toHaveCount(0);

    // Reload — onboardingComplete should now be true so the tour
    // doesn't auto-show again.
    await page.reload();
    await page.waitForSelector('#canvas');
    await page.waitForTimeout(600);
    await expect(page.locator('.tour-popover')).toHaveCount(0);
  });

  test('Skip closes the tour + flips onboardingComplete', async ({ page }) => {
    await bootGmFresh(page);
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    const tour = page.locator('.tour-popover');
    await expect(tour).toBeVisible({ timeout: 2000 });

    await tour.locator('[data-action="skip"]').click();
    await expect(tour).toHaveCount(0);

    // Reload to confirm the skip persisted.
    await page.reload();
    await page.waitForSelector('#canvas');
    await page.waitForTimeout(600);
    await expect(page.locator('.tour-popover')).toHaveCount(0);
  });

  test('Esc dismisses the tour + persists like Skip', async ({ page }) => {
    await bootGmFresh(page);
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    const tour = page.locator('.tour-popover');
    await expect(tour).toBeVisible({ timeout: 2000 });

    await page.keyboard.press('Escape');
    await expect(tour).toHaveCount(0);

    await page.reload();
    await page.waitForSelector('#canvas');
    await page.waitForTimeout(600);
    await expect(page.locator('.tour-popover')).toHaveCount(0);
  });

  test('"Take the tour" entry replays the walk-through after completion', async ({
    page,
  }) => {
    await bootGmOnboarded(page);
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    // No auto-show.
    await page.waitForTimeout(400);
    await expect(page.locator('.tour-popover')).toHaveCount(0);

    // Click the menu entry to replay.
    await page.getByRole('button', { name: 'Take the tour', exact: true }).click();
    const tour = page.locator('.tour-popover');
    await expect(tour).toBeVisible();
    await expect(tour.locator('[data-field="title"]')).toHaveText(/welcome/i);
    await expect(tour.locator('[data-field="counter"]')).toHaveText(/1 of 6/);
  });

  test('Every anchored step resolves its target selector + draws a highlight cutout', async ({
    page,
  }) => {
    // Regression for 0.61.1 — the original GM_TOUR_STEPS used
    // `.toolbar` for the Tools step, but the actual class name is
    // `.gm-toolbar`, so the selector resolved to null + the popover
    // silently fell back to centered with no highlight cutout. This
    // test walks every step and asserts (a) anchored steps have a
    // target element in the DOM AND (b) the popover got a non-
    // 'center' placement (i.e. the target was found and the layout
    // helper anchored to it).
    await bootGmFresh(page);
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    const tour = page.locator('.tour-popover');
    await expect(tour).toBeVisible({ timeout: 2000 });

    // Walk through all 6 steps. For each, read the placement data
    // attribute set by `layoutPopover`. Anchored steps should NOT
    // be 'center'; centered (no-target) steps should be 'center'.
    const expectedPlacements: ReadonlyArray<'center' | 'top' | 'bottom' | 'left' | 'right'> = [
      'center', // welcome
      'bottom', // toolbar (was the broken one — pre-fix would fall back to 'center')
      'top',    // canvas
      'left',   // session-menu
      'center', // spectator
      'top',    // help
    ];
    for (let i = 0; i < expectedPlacements.length; i++) {
      const expected = expectedPlacements[i]!;
      await expect(tour.locator('[data-field="counter"]')).toHaveText(
        new RegExp(`${i + 1} of 6`),
      );
      const placement = await tour.evaluate((el) => el.dataset['placement']);
      expect(placement).toBe(expected);
      if (i < expectedPlacements.length - 1) {
        await tour.locator('[data-action="next"]').click();
      }
    }
  });

  test('Back button shows on later steps + steps backward correctly', async ({
    page,
  }) => {
    await bootGmFresh(page);
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    const tour = page.locator('.tour-popover');
    await expect(tour).toBeVisible({ timeout: 2000 });

    await tour.locator('[data-action="next"]').click();
    await expect(tour.locator('[data-field="counter"]')).toHaveText(/2 of 6/);
    // Back is now visible.
    await expect(tour.locator('[data-action="back"]')).toBeVisible();

    await tour.locator('[data-action="back"]').click();
    await expect(tour.locator('[data-field="counter"]')).toHaveText(/1 of 6/);
    // Back is hidden again.
    await expect(tour.locator('[data-action="back"]')).toBeHidden();
  });
});
