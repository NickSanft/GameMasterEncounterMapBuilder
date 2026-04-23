import { test, expect } from '@playwright/test';

/**
 * Phase 62 — Remote Play modal smoke tests.
 *
 * Full WebRTC signaling + peer-to-peer connection isn't feasible in
 * Playwright CI (needs real ICE gathering + outbound UDP). These
 * tests cover the UI wiring:
 *   - The modal mounts + can be opened from the GM session menu
 *     and the Spectator session menu.
 *   - The Host and Join tabs switch correctly.
 *   - The "Create invitation" button populates the offer textarea
 *     and enables the Copy + Accept buttons.
 *   - The "Generate answer" button populates the answer textarea
 *     after a well-formed offer is pasted.
 *
 * The tests use Playwright's real Chromium which DOES expose
 * `RTCPeerConnection`, so the modal's `isWebRtcSupported` check
 * passes and the buttons are interactive.
 */

test.describe('Remote play modal (Phase 62)', () => {
  test('GM session menu has a "Remote play…" entry that opens the modal', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    await page.getByRole('button', { name: 'Remote play…', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Remote play' });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('h2')).toContainText(/remote play/i);
    await expect(dialog.locator('.remote-play-beta')).toHaveText(/beta/i);
  });

  test('Spectator session menu has a "Remote play…" entry too', async ({ page }) => {
    await page.goto('./spectator.html');
    await page.waitForSelector('#canvas');
    await page.getByRole('button', { name: 'Remote play…', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Remote play' });
    await expect(dialog).toBeVisible();
  });

  // 0.62.2: GM has the Host flow only (authoritative source of truth);
  // Spectator has the Join flow only. Each view exposes exactly one
  // role — the tab strip is hidden because there's no switching to do.
  test('GM view: Host pane is shown + Join pane + tab strip are hidden', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    await page.getByRole('button', { name: 'Remote play…', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Remote play' });

    await expect(dialog.locator('[data-pane="host"]')).toBeVisible();
    await expect(dialog.locator('[data-pane="guest"]')).toBeHidden();
    // Tab strip is hidden when only one role is available.
    await expect(dialog.locator('.remote-play-tabs')).toBeHidden();
    // Intro copy mentions hosting-as-GM.
    await expect(dialog.locator('.remote-play-intro')).toContainText(/GM/i);
  });

  test('Spectator view: Join pane is shown + Host pane + tab strip are hidden', async ({
    page,
  }) => {
    await page.goto('./spectator.html');
    await page.waitForSelector('#canvas');
    await page.getByRole('button', { name: 'Remote play…', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Remote play' });

    await expect(dialog.locator('[data-pane="guest"]')).toBeVisible();
    await expect(dialog.locator('[data-pane="host"]')).toBeHidden();
    await expect(dialog.locator('.remote-play-tabs')).toBeHidden();
    // Intro copy mentions joining-as-Spectator.
    await expect(dialog.locator('.remote-play-intro')).toContainText(/Spectator/i);
    // Create-invitation button is NOT present in the DOM for Spectators
    // (the whole Host pane is hidden).
    await expect(dialog.locator('[data-action="host-create"]')).toBeHidden();
  });

  test('GM: "Create invitation" populates the offer + enables Copy + Accept', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    await page.getByRole('button', { name: 'Remote play…', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Remote play' });

    const createBtn = dialog.locator('[data-action="host-create"]');
    const offerTa = dialog.locator('[data-field="host-offer"]');
    const copyBtn = dialog.locator('[data-action="host-copy-offer"]');
    const acceptBtn = dialog.locator('[data-action="host-accept"]');

    await expect(offerTa).toHaveValue('');
    await expect(copyBtn).toBeDisabled();
    await expect(acceptBtn).toBeDisabled();

    await createBtn.click();

    // ICE gathering in real Chromium is fast (LAN-only, no server
    // to reach). 10s is plenty; the test will usually clear in 1-2s.
    await expect(offerTa).not.toHaveValue('', { timeout: 10_000 });
    await expect(copyBtn).toBeEnabled();
    await expect(acceptBtn).toBeEnabled();

    const offer = await offerTa.inputValue();
    expect(offer).toContain('"type"');
    expect(offer).toContain('"offer"');
  });

  test('Spectator: pasting an offer + "Generate answer" produces the answer', async ({
    browser,
  }) => {
    // Need a real SDP offer to paste into the Spectator's Join
    // form. Generate one in a separate GM page (different context),
    // then paste it into a fresh Spectator context's Join pane.
    const gmCtx = await browser.newContext();
    const gm = await gmCtx.newPage();
    try {
      await gm.goto('./gm.html');
      await gm.waitForSelector('#canvas');
      await gm
        .getByRole('button', { name: 'Remote play…', exact: true })
        .click();
      await gm.locator('[data-action="host-create"]').click();
      const hostOfferTa = gm.locator('[data-field="host-offer"]');
      await expect(hostOfferTa).not.toHaveValue('', { timeout: 10_000 });
      const offer = await hostOfferTa.inputValue();

      const specCtx = await browser.newContext();
      const spec = await specCtx.newPage();
      try {
        await spec.goto('./spectator.html');
        await spec.waitForSelector('#canvas');
        await spec
          .getByRole('button', { name: 'Remote play…', exact: true })
          .click();
        const dialog = spec.getByRole('dialog', { name: 'Remote play' });

        const guestOfferTa = dialog.locator('[data-field="guest-offer"]');
        const guestAnswerTa = dialog.locator('[data-field="guest-answer"]');
        const guestAcceptBtn = dialog.locator('[data-action="guest-accept"]');
        const guestCopyBtn = dialog.locator('[data-action="guest-copy-answer"]');

        await expect(guestAcceptBtn).toBeDisabled();
        await guestOfferTa.fill(offer);
        await expect(guestAcceptBtn).toBeEnabled();
        await guestAcceptBtn.click();

        await expect(guestAnswerTa).not.toHaveValue('', { timeout: 10_000 });
        await expect(guestCopyBtn).toBeEnabled();
        const answer = await guestAnswerTa.inputValue();
        expect(answer).toContain('"type"');
        expect(answer).toContain('"answer"');
      } finally {
        await specCtx.close();
      }
    } finally {
      await gmCtx.close();
    }
  });
});
