import { test, expect } from '@playwright/test';

/**
 * Regression for 0.57.1.
 *
 * Reported by the user mid-Phase-57: opening a Spectator tab alongside
 * a GM tab and then reloading the GM tab silently destroyed the active
 * scene's contents (tokens / walls / annotations all gone). Other
 * saved scenes in the scenes catalog were unaffected.
 *
 * Root cause: the GM entry's channel block ran synchronously at module
 * init and called `channel.send({ type: 'full-state', state:
 * serializeState(store.getState()) })` BEFORE the async
 * `loadPersistedState()` had resolved — so the broadcast carried the
 * EMPTY default state. The Spectator tab received it, called
 * `store.loadState(emptyState)`, and 200ms later the Spectator's
 * persist debounce wrote the empty state to the SHARED active scene
 * record in IndexedDB. The GM's eventual load read back the blanked
 * scene. Net effect: full data loss on the active scene any time the
 * GM tab was reloaded with the Spectator open.
 *
 * Pin strategy: deterministic timing in Playwright cross-tab tests is
 * fragile (BroadcastChannel + IDB + debounce all race), so we instead
 * spy on `BroadcastChannel.prototype.postMessage` from an init script
 * that runs BEFORE the GM's module code. Every outbound message gets
 * captured into `window.__bcMessages`. After boot we assert that the
 * GM never sent a `full-state` whose payload had zero tokens — which
 * is the precise failure mode (broadcast-with-empty-state).
 */

test.describe('Active scene survives a GM reload with a Spectator open', () => {
  test('GM never broadcasts a full-state with empty tokens after a reload', async ({
    browser,
  }) => {
    const context = await browser.newContext();
    try {
      // Place a token in a fresh GM tab + give the persist debounce
      // time to flush — so the active scene in IDB has the token
      // before our reload-under-test happens.
      const seedGm = await context.newPage();
      await seedGm.goto('./gm.html');
      await seedGm.waitForSelector('#canvas');
      await seedGm.keyboard.press('t');
      const box = await seedGm.locator('#canvas').boundingBox();
      if (!box) throw new Error('canvas has no bounding box');
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      await seedGm.mouse.click(cx, cy);
      await seedGm.waitForTimeout(500);
      await seedGm.close();

      // Open a fresh GM tab WITH the BroadcastChannel spy installed.
      // The spy intercepts every postMessage on every BC instance
      // and records it into window.__bcMessages.
      const gm = await context.newPage();
      await gm.addInitScript(() => {
        const messages: unknown[] = [];
        (window as unknown as { __bcMessages: unknown[] }).__bcMessages = messages;
        const original = BroadcastChannel.prototype.postMessage;
        BroadcastChannel.prototype.postMessage = function (msg: unknown) {
          messages.push(msg);
          return original.call(this, msg);
        };
      });
      await gm.goto('./gm.html');
      await gm.waitForSelector('#canvas');
      // Wait long enough for: load + initialLoadComplete flip + the
      // post-load broadcastInitial() that ships the LOADED state.
      await gm.waitForTimeout(1000);

      const messages = await gm.evaluate(
        () =>
          (window as unknown as { __bcMessages: { type: string; state?: { tokens?: unknown[] } }[] })
            .__bcMessages,
      );

      // Pin the failure mode: zero `full-state` messages should have
      // been sent with an empty tokens array. Pre-fix, the very first
      // sync `channel.send` at module init satisfied this exact
      // condition (state had been serialized from the default empty
      // store before loadPersistedState resolved).
      const fullStates = messages.filter((m) => m.type === 'full-state');
      expect(fullStates.length).toBeGreaterThan(0); // At least one (post-load) was sent.
      for (const m of fullStates) {
        expect(m.state?.tokens?.length ?? 0).toBeGreaterThan(0);
      }
    } finally {
      await context.close();
    }
  });

  test('GM + Spectator handshake leaves both tabs showing the active scene', async ({
    browser,
  }) => {
    // Belt-and-suspenders smoke: opens GM + Spectator in the same
    // context, verifies the GM-pushed state actually reaches the
    // Spectator (i.e. the BroadcastChannel handshake works end-to-end).
    // This isn't a sharp regression pin for the Spectator-side guard
    // (`remoteStateReceived`) — the GM-side fix already prevents the
    // empty-broadcast scenario, so the Spectator-side race window
    // narrows enough that it's hard to engineer deterministically.
    // Keep the test as a high-level smoke that the cross-tab flow
    // still works end-to-end.
    const context = await browser.newContext();
    try {
      const gm = await context.newPage();
      await gm.goto('./gm.html');
      await gm.waitForSelector('#canvas');

      await gm.keyboard.press('t');
      const box = await gm.locator('#canvas').boundingBox();
      if (!box) throw new Error('canvas has no bounding box');
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      await gm.mouse.click(cx, cy);
      await gm.waitForTimeout(500);

      const spectator = await context.newPage();
      await spectator.goto('./spectator.html');
      await spectator.waitForSelector('#canvas');
      await spectator.waitForTimeout(800);

      // Spectator's aria-label reports total tokens after the GM
      // full-state handshake has populated its store. With the
      // 0.57.1 fixes in place the GM doesn't broadcast until its
      // own load completes, so the Spectator should always see the
      // token regardless of which tab's load resolves first.
      const ariaLabel = await spectator
        .locator('#canvas')
        .getAttribute('aria-label');
      expect(ariaLabel).toMatch(/1 total tokens?/);
    } finally {
      await context.close();
    }
  });
});
