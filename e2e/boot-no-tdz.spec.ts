import { test, expect, type Page } from '@playwright/test';

/**
 * Regression for 0.60.1.
 *
 * Phase 60 introduced a TDZ (temporal dead zone) crash during gm.ts
 * boot: notes-panel.ts called `setOpen(initiallyOpen)` BEFORE its
 * `let transcriber` declaration, but `setOpen(false)` references
 * `transcriber` in its panel-closes-while-recording branch. The
 * "Cannot access 'transcriber' before initialization" throw aborted
 * the rest of gm.ts module evaluation — which meant `scenesModal`
 * and any other declaration after the notesPanel mount never ran.
 * Symptom: GM canvas rendered the empty default state (because
 * `loadPersistedState().then(store.loadState)` registered later
 * never fired) and the Scenes button click handler hit a SECOND
 * TDZ when its lambda tried to call the never-initialized
 * `scenesModal`.
 *
 * Fix: hoist the transcriber + statusIsError declarations to the
 * top of mountNotesPanel, before the initial setOpen call.
 *
 * This spec is the regression pin — it loads the GM tab COLD (no
 * `notes-open` localStorage key, which is the failing case — the
 * panel-was-open path wouldn't hit the else branch where the TDZ
 * lived) and asserts:
 *   - No `pageerror` events.
 *   - No `Cannot access` console errors.
 *   - The Scenes button click opens its modal (proves
 *     `scenesModal` was initialized).
 */

async function captureErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
  });
  return errors;
}

test.describe('0.60.1 — gm.ts boot has no TDZ crashes from notes-panel', () => {
  test('Cold-boot GM (notes panel closed) does not throw + Scenes button works', async ({
    page,
  }) => {
    // Explicitly clear the notes-open key so we exercise the failing
    // initiallyOpen=false path. (Earlier test runs in this context
    // could leave it set from the e2e/voice-transcription.spec.ts pre-set.)
    await page.addInitScript(() => {
      try {
        localStorage.removeItem('gm-encounter-maps-notes-open');
      } catch { /* ignore */ }
    });

    const errors = await captureErrors(page);

    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    // Give the async loadPersistedState + LoS pipeline a moment to settle.
    await page.waitForTimeout(800);

    // Pre-fix, the boot threw `Cannot access 'transcriber' before
    // initialization` — pin this exact wording.
    const tdzErrors = errors.filter((e) => /Cannot access/i.test(e));
    expect(tdzErrors).toEqual([]);

    // Click the Scenes button. Pre-fix, the gm.ts crash mid-init
    // meant `scenesModal` was never assigned, so the click lambda
    // threw "Cannot access 'scenesModal' before initialization".
    await page.getByRole('button', { name: 'Scenes…', exact: true }).click();
    const scenesDialog = page.getByRole('dialog', { name: /Scenes/i });
    await expect(scenesDialog).toBeVisible();
  });

  test('Dice + Help buttons stay bottom-left when the notes panel is open', async ({
    page,
  }) => {
    // Pre-set notes panel open so we exercise the failing-CSS path.
    // Pre-fix, both `.dice-button` and `.help-button` had a
    // `body.notes-open` rule that shifted them ~320px to the right
    // — a pre-existing copy-paste bug from a draft layout where the
    // notes panel had been on the LEFT. The actual panel lives on
    // the right (`right: 0`), so the buttons should stay anchored
    // at the bottom-left regardless of notes state.
    await page.addInitScript(() => {
      try {
        localStorage.setItem('gm-encounter-maps-notes-open', 'true');
      } catch { /* ignore */ }
    });
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    // Confirm the panel is in fact open (we want to test the
    // notes-open code path, not just the closed default).
    await expect(page.locator('.notes-panel')).toBeVisible();

    const positions = await page.evaluate(() => {
      const dice = document.querySelector('.dice-button')?.getBoundingClientRect();
      const help = document.querySelector('.help-button')?.getBoundingClientRect();
      return { diceLeft: dice?.left ?? -1, helpLeft: help?.left ?? -1 };
    });
    // Pre-fix: ~333px (320 panel + 13 padding). Post-fix: ~13px.
    // Assert under 50px to keep the test resilient to small layout
    // tweaks while still catching the 320px shift.
    expect(positions.diceLeft).toBeLessThan(50);
    expect(positions.helpLeft).toBeLessThan(50);
  });
});
