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

  test('Host tab is active by default; Join tab switches on click', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    await page.getByRole('button', { name: 'Remote play…', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Remote play' });

    // Host pane visible; Join pane hidden.
    await expect(dialog.locator('[data-pane="host"]')).toBeVisible();
    await expect(dialog.locator('[data-pane="guest"]')).toBeHidden();

    // Click Join tab.
    await dialog.locator('[role="tab"][data-role="guest"]').click();
    await expect(dialog.locator('[data-pane="host"]')).toBeHidden();
    await expect(dialog.locator('[data-pane="guest"]')).toBeVisible();

    // Click Host tab.
    await dialog.locator('[role="tab"][data-role="host"]').click();
    await expect(dialog.locator('[data-pane="host"]')).toBeVisible();
    await expect(dialog.locator('[data-pane="guest"]')).toBeHidden();
  });

  test('"Create invitation" populates the offer + enables Copy + Accept', async ({
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

    // Pre-click state.
    await expect(offerTa).toHaveValue('');
    await expect(copyBtn).toBeDisabled();
    await expect(acceptBtn).toBeDisabled();

    await createBtn.click();

    // ICE gathering in real Chromium is fast (LAN-only, no server
    // to reach). 10s is plenty; the test will usually clear in 1-2s.
    await expect(offerTa).not.toHaveValue('', { timeout: 10_000 });
    await expect(copyBtn).toBeEnabled();
    await expect(acceptBtn).toBeEnabled();

    // The offer text is a JSON-encoded SDP; sanity-check the shape.
    const offer = await offerTa.inputValue();
    expect(offer).toContain('"type"');
    expect(offer).toContain('"offer"');
  });

  test('Join flow: pasting an offer enables Generate answer; clicking it populates the answer', async ({
    page,
  }) => {
    // First, generate a real offer via the Host flow so we have
    // valid SDP to paste into the Join form. We'll switch tabs +
    // cross-pollinate within the same modal instance.
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    await page.getByRole('button', { name: 'Remote play…', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Remote play' });

    // Host: create invitation.
    await dialog.locator('[data-action="host-create"]').click();
    const hostOfferTa = dialog.locator('[data-field="host-offer"]');
    await expect(hostOfferTa).not.toHaveValue('', { timeout: 10_000 });
    const offer = await hostOfferTa.inputValue();

    // Switch to Join, paste the offer, click Generate answer.
    await dialog.locator('[role="tab"][data-role="guest"]').click();
    const guestOfferTa = dialog.locator('[data-field="guest-offer"]');
    const guestAnswerTa = dialog.locator('[data-field="guest-answer"]');
    const guestAcceptBtn = dialog.locator('[data-action="guest-accept"]');
    const guestCopyBtn = dialog.locator('[data-action="guest-copy-answer"]');

    await expect(guestAcceptBtn).toBeDisabled();
    await guestOfferTa.fill(offer);
    await expect(guestAcceptBtn).toBeEnabled();
    await guestAcceptBtn.click();

    // Generated answer appears; copy button enables.
    await expect(guestAnswerTa).not.toHaveValue('', { timeout: 10_000 });
    await expect(guestCopyBtn).toBeEnabled();
    const answer = await guestAnswerTa.inputValue();
    expect(answer).toContain('"type"');
    expect(answer).toContain('"answer"');
  });
});
