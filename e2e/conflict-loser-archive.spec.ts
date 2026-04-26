/**
 * Phase 99 — conflict-loser archive recovery.
 *
 * Validates the user-visible surface:
 *   - Palette (Ctrl+K) has an "Open conflict-merge archive…" entry.
 *   - Empty state copy when nothing has been archived.
 *   - Esc closes the modal.
 *   - End-to-end: trigger a Phase 84 conflict, "Use other tab" the
 *     gm-takeover, then verify the previous state is in the archive
 *     and the Restore button brings it back.
 *
 * The synthetic-peer trick mirrors the Phase 84 conflict-merge spec.
 */
import { test, expect, type Page } from '@playwright/test';

test.describe('Phase 99 — conflict-loser archive', () => {
  test('palette has an "Open conflict-merge archive…" entry', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await page.keyboard.press('Control+K');
    await page.locator('.command-palette-input').fill('conflict');
    const items = page.locator('.command-palette-item');
    const labels = await items.locator('.command-palette-item-label').allTextContents();
    expect(labels.some((l) => /Open conflict-merge archive/.test(l))).toBe(true);
  });

  test('empty state when nothing has been archived', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    // Make sure the archive starts clean (an earlier test in the same
    // browser context could have populated it).
    await page.evaluate(() => {
      try {
        localStorage.removeItem('gm-encounter-maps-conflict-loser-archive');
      } catch {
        /* ignore */
      }
    });

    await page.keyboard.press('Control+K');
    await page.locator('.command-palette-input').fill('conflict');
    await page.keyboard.press('Enter');

    const modal = page.locator('.conflict-loser-archive-modal');
    await expect(modal).toBeVisible();
    await expect(modal.locator('[data-field="empty"]')).toBeVisible();
    await expect(modal.locator('[data-field="empty"]')).toContainText(
      /archive is empty/,
    );
  });

  test('Esc closes the modal', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    await page.keyboard.press('Control+K');
    await page.locator('.command-palette-input').fill('conflict');
    await page.keyboard.press('Enter');

    const modal = page.locator('.conflict-loser-archive-modal');
    await expect(modal).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();
  });

  test('end-to-end: takeover archives the prior state, Restore brings it back', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    // Clear any prior archive so the test starts deterministic.
    await page.evaluate(() => {
      try {
        localStorage.removeItem('gm-encounter-maps-conflict-loser-archive');
      } catch {
        /* ignore */
      }
    });

    // Drop an "original" token at the canvas center — this is the
    // state we want to be ARCHIVED (i.e. the loser).
    await placeTokenAtCenter(page);
    // Wait for the persist to land so the archive captures the
    // post-token state.
    await expect(page.locator('.save-status-pill')).toHaveAttribute(
      'data-status',
      'saved',
      { timeout: 5_000 },
    );

    // Spin up a synthetic GM peer that, when asked, sends a
    // gm-takeover with a clearly-different state (zero tokens).
    await page.evaluate(() => {
      const ch = new BroadcastChannel('gm-encounter-maps-session');
      const peerTabId = 'peer-archive-target';
      const peerSenderId = 'peer-archive-sender';
      const send = (payload: unknown) =>
        ch.postMessage({
          senderId: peerSenderId,
          timestamp: Date.now(),
          payload,
        });
      const heartbeat = () =>
        send({
          type: 'gm-heartbeat',
          tabId: peerTabId,
          summary: {
            lastModified: Date.now(),
            tokenCount: 0,
            sceneName: 'Echo Chamber',
          },
        });
      heartbeat();
      const iv = setInterval(heartbeat, 500);
      ch.addEventListener('message', (ev) => {
        const env = ev.data as {
          payload: { type: string; targetTabId?: string; fromTabId?: string };
        };
        if (
          env?.payload?.type === 'gm-state-request' &&
          env.payload.targetTabId === peerTabId
        ) {
          // Reply with a state that has NO tokens so it's distinct
          // from the local-tab state which has 1 token.
          send({
            type: 'gm-takeover',
            targetTabId: env.payload.fromTabId,
            state: {
              version: 1,
              grid: { cols: 30, rows: 20, cellSize: 50 },
              background: { imageId: null, offsetX: 0, offsetY: 0, scaleX: 1, scaleY: 1 },
              tokens: [],
              fog: new Array(30 * 20).fill(0),
              annotations: [],
              aoeTemplates: [],
              initiative: { order: [], activeId: null, round: 0 },
              strokes: [],
              walls: [],
              weather: 'none',
              timeOfDay: 'none',
            },
          });
          clearInterval(iv);
        }
      });
    });

    // Wait for the conflict banner + click "Resolve…".
    const banner = page.locator('.status-banner.status-banner-warn');
    await expect(banner).toBeVisible({ timeout: 6_000 });
    await banner.getByRole('button', { name: /Resolve/ }).click();

    const conflictModal = page.locator('.conflict-modal');
    await expect(conflictModal).toBeVisible();
    await conflictModal.getByRole('button', { name: 'Use other tab' }).click();

    // Wait for the takeover to apply — canvas aria-label drops to
    // "0 tokens placed".
    const canvas = page.locator('#canvas');
    await expect(canvas).toHaveAttribute(
      'aria-label',
      /0 tokens placed/,
      { timeout: 5_000 },
    );

    // Open the archive via the palette + verify our prior state landed.
    await page.keyboard.press('Control+K');
    await page.locator('.command-palette-input').fill('conflict');
    await page.keyboard.press('Enter');

    const archiveModal = page.locator('.conflict-loser-archive-modal');
    await expect(archiveModal).toBeVisible();
    const rows = archiveModal.locator('.conflict-loser-row');
    await expect(rows).toHaveCount(1);
    // The summary should mention "1 token" (the pre-takeover state).
    await expect(rows.first().locator('.conflict-loser-summary')).toContainText(
      /1 token/,
    );

    // Restore — canvas should regain the token.
    await rows.first().getByRole('button', { name: 'Restore' }).click();
    await expect(canvas).toHaveAttribute(
      'aria-label',
      /1 token placed/,
      { timeout: 5_000 },
    );
  });
});

async function placeTokenAtCenter(page: Page) {
  await page.keyboard.press('t');
  const box = await page.locator('#canvas').boundingBox();
  if (!box) throw new Error('canvas has no bounding box');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}
