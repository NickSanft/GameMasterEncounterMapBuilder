/**
 * Phase 84 — Conflict-merge UI e2e.
 *
 * Builds on the Phase 64 conflict-recovery spec: that one verifies the
 * banner appears + clears. This spec exercises the new "Resolve…"
 * action: clicking it opens the conflict-merge modal, the modal lists
 * the synthetic peer with the correct summary, and clicking "Use other
 * tab" applies the peer's state via a follow-up `gm-takeover` reply.
 *
 * The synthetic-peer trick is the same shape as conflict-recovery:
 * post Phase 66 envelopes onto the BroadcastChannel from `page.evaluate`
 * so the real GM code processes them as if they came from a second
 * GM tab.
 */
import { test, expect } from '@playwright/test';

const SESSION_CHANNEL = 'gm-encounter-maps-session';

async function startSyntheticPeer(
  page: import('@playwright/test').Page,
  opts: { tabId: string; tokenCount: number; sceneName: string; lastModified: number },
): Promise<void> {
  await page.evaluate((opts) => {
    const ch = new BroadcastChannel('gm-encounter-maps-session');
    const wrap = () => ({
      senderId: opts.tabId,
      timestamp: Date.now(),
      payload: {
        type: 'gm-heartbeat',
        tabId: opts.tabId,
        summary: {
          lastModified: opts.lastModified,
          tokenCount: opts.tokenCount,
          sceneName: opts.sceneName,
        },
      },
    });
    ch.postMessage(wrap());
    const iv = setInterval(() => ch.postMessage(wrap()), 500);
    (window as unknown as {
      __peer?: { iv: number; ch: BroadcastChannel; tabId: string };
    }).__peer = { iv: iv as unknown as number, ch, tabId: opts.tabId };
  }, opts);
}

test.describe('Phase 84 — conflict-merge modal', () => {
  test('Resolve… opens the modal listing the peer with summary', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await startSyntheticPeer(page, {
      tabId: 'synthetic-peer-1',
      tokenCount: 7,
      sceneName: 'Goblin Cave',
      lastModified: Date.now() - 5_000,
    });

    const banner = page.locator('.status-banner.status-banner-warn');
    await expect(banner).toBeVisible({ timeout: 6_000 });

    // The banner now exposes a "Resolve…" action button (Phase 84).
    await banner.getByRole('button', { name: /Resolve/ }).click();

    const modal = page.locator('.conflict-modal');
    await expect(modal).toBeVisible();

    // One row per detected peer.
    await expect(modal.locator('.conflict-row')).toHaveCount(1);

    // The peer column shows the supplied summary.
    const peerCol = modal.locator('.conflict-col-peer').first();
    await expect(peerCol).toContainText('synthe'); // shortened tabId
    await expect(peerCol).toContainText('Goblin Cave');
    await expect(peerCol).toContainText('7'); // token count

    // The local column reflects this tab's empty default scene.
    const localCol = modal.locator('.conflict-col-local').first();
    await expect(localCol).toContainText('This tab');
  });

  test('"Use other tab" applies the peer-supplied state via gm-takeover reply', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    // Start a synthetic peer + arm a listener that, when the GM sends
    // a `gm-state-request` targeted at us, fires back a `gm-takeover`
    // carrying a state with a recognizable token label.
    await page.evaluate(() => {
      const ch = new BroadcastChannel('gm-encounter-maps-session');
      const peerTabId = 'peer-takeover-target';
      const peerSenderId = 'peer-takeover-sender';
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
            tokenCount: 1,
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
          send({
            type: 'gm-takeover',
            targetTabId: env.payload.fromTabId,
            state: {
              version: 1,
              grid: { cols: 20, rows: 14, cellSize: 64 },
              background: {
                imageId: null,
                offsetX: 0,
                offsetY: 0,
                scaleX: 1,
                scaleY: 1,
              },
              tokens: [
                {
                  id: 'echo-token',
                  x: 5,
                  y: 5,
                  label: 'EchoToken',
                  color: '#ff00ff',
                  imageId: null,
                  size: 1,
                  borderColor: null,
                  hp: null,
                  conditions: [],
                  rotation: 0,
                  losRadius: null,
                  light: null,
                  initiativeMod: 0,
                  conditionExpirations: {},
                  deathSaves: { successes: 0, failures: 0 },
                },
              ],
              fog: new Array(20 * 14).fill(0),
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

      (window as unknown as { __peerIv?: number }).__peerIv = iv as unknown as number;
    });

    const banner = page.locator('.status-banner.status-banner-warn');
    await expect(banner).toBeVisible({ timeout: 6_000 });
    await banner.getByRole('button', { name: /Resolve/ }).click();

    const modal = page.locator('.conflict-modal');
    await expect(modal).toBeVisible();

    // Click "Use other tab" — this triggers a `gm-state-request` from
    // the GM. Our synthetic peer (above) responds with a `gm-takeover`
    // carrying a state with one recognizable token (`EchoToken`).
    await modal.getByRole('button', { name: 'Use other tab' }).click();

    // After the takeover lands, the canvas's aria-label updates to
    // reflect "1 token placed". We use that as a proxy for "the
    // adopted state is now live".
    const canvas = page.locator('#canvas');
    await expect(canvas).toHaveAttribute(
      'aria-label',
      /1 token placed/,
      { timeout: 5_000 },
    );

    // Modal closes once the takeover succeeds.
    await expect(modal).toBeHidden();
  });

  test('peer without summary disables the "Use other tab" button', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    // Pre-84 peer: heartbeat WITHOUT the optional `summary` field.
    await page.evaluate(() => {
      const ch = new BroadcastChannel('gm-encounter-maps-session');
      const tabId = 'legacy-peer';
      const wrap = () => ({
        senderId: tabId,
        timestamp: Date.now(),
        payload: { type: 'gm-heartbeat', tabId },
      });
      ch.postMessage(wrap());
      setInterval(() => ch.postMessage(wrap()), 500);
    });

    const banner = page.locator('.status-banner.status-banner-warn');
    await expect(banner).toBeVisible({ timeout: 6_000 });
    await banner.getByRole('button', { name: /Resolve/ }).click();

    const modal = page.locator('.conflict-modal');
    await expect(modal).toBeVisible();

    const adopt = modal.getByRole('button', { name: 'Use other tab' });
    await expect(adopt).toBeDisabled();

    // Keep button is still enabled — pushing OUR state to the legacy
    // peer is always a safe operation.
    const keep = modal.getByRole('button', { name: 'Keep this tab' });
    await expect(keep).toBeEnabled();

    await expect(modal.locator('.conflict-col-noinfo')).toContainText(/no info/i);
  });

  // Stop any leftover BroadcastChannel intervals so subsequent specs
  // start clean (Playwright nukes the page anyway, but this is cheap).
  test.afterEach(async ({ page }) => {
    await page.evaluate(() => {
      const w = window as unknown as { __peer?: { iv: number; ch: BroadcastChannel } };
      if (w.__peer?.iv) clearInterval(w.__peer.iv);
      if (w.__peer?.ch) w.__peer.ch.close();
    });
  });
});

// Reference removes the unused-var warning when --noUnusedLocals is on.
void SESSION_CHANNEL;
