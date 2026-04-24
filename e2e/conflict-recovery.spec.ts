import { test, expect } from '@playwright/test';

test.describe('Conflict + recovery banners', () => {
  test('crash-recovery banner shows when the dirty flag is left set', async ({ page }) => {
    // Seed the dirty flag BEFORE the page's boot script runs — otherwise
    // a page.reload() would trigger beforeunload → markClean() → flag
    // cleared before boot sees it.
    await page.addInitScript(() => {
      localStorage.setItem('gm-encounter-maps-dirty', '1');
    });
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    // The banner should appear with the restored-from-autosave text.
    const banner = page.locator('.status-banner.status-banner-info');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText(/restored from the autosave/i);

    // Dismiss button closes it.
    await banner.getByRole('button', { name: 'Dismiss' }).click();
    await expect(banner).toBeHidden();
  });

  test('no banner on a clean load (freshly cleared dirty flag)', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    await page.evaluate(() => {
      localStorage.removeItem('gm-encounter-maps-dirty');
    });
    await page.reload();
    await page.waitForSelector('#canvas');

    // Info-variant banner should not appear (the warn banner also shouldn't
    // pop until another GM tab is simulated).
    await page.waitForTimeout(300);
    await expect(page.locator('.status-banner.status-banner-info')).toBeHidden();
  });

  test('conflict banner appears when another GM tab heartbeats over the sync channel', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    // Simulate a second GM tab by posting a gm-heartbeat directly onto the
    // shared BroadcastChannel. The real GM code listens on the same channel
    // and will note a new peer tab id.
    //
    // Phase 66 — channel layer expects an envelope `{senderId, timestamp,
    // payload}` wrapping the original SyncMessage; raw messages are dropped
    // by the `looksLikeEnvelope` guard. Stamp the envelope ourselves with
    // a synthetic sender id (anything other than the real tab's id is fine
    // — the conflict detector only cares about distinct ids).
    await page.evaluate(() => {
      const ch = new BroadcastChannel('gm-encounter-maps-session');
      const wrap = () => ({
        senderId: 'synthetic-other-tab',
        timestamp: Date.now(),
        payload: { type: 'gm-heartbeat', tabId: 'synthetic-other-tab' },
      });
      ch.postMessage(wrap());
      // Keep the channel open for a bit so the GM keeps receiving pings.
      const iv = setInterval(() => ch.postMessage(wrap()), 500);
      (window as unknown as { __otherTabIv?: number }).__otherTabIv = iv as unknown as number;
    });

    const banner = page.locator('.status-banner.status-banner-warn');
    await expect(banner).toBeVisible({ timeout: 6_000 });
    await expect(banner).toContainText(/Another GM tab is open/i);

    // Stop the synthetic peer and confirm the banner clears after the
    // staleness window (6 s). We wait up to 12 s to allow the GM's 2 s
    // interval to tick at least a couple times after the staleness window.
    await page.evaluate(() => {
      const w = window as unknown as { __otherTabIv?: number };
      if (w.__otherTabIv) clearInterval(w.__otherTabIv);
    });
    await expect(banner).toBeHidden({ timeout: 15_000 });
  });
});
