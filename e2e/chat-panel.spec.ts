/**
 * Phase 119 — player chat panel.
 *
 * Validates:
 *   - Command palette opens the panel on the GM side.
 *   - Sending a message renders it in the GM's own panel + the
 *     Spectator's panel (sync round-trip via BroadcastChannel).
 *   - GM-only messages are filtered on the Spectator side.
 *   - Spectator's `c` shortcut toggles the panel.
 */
import { test, expect, type BrowserContext, type Page } from '@playwright/test';

async function openGmChat(page: Page) {
  await page.keyboard.press('Control+k');
  await page.locator('.command-palette-input').fill('chat');
  await page.locator('.command-palette-item').first().click();
  await expect(page.locator('.chat-panel')).toBeVisible();
}

async function spinUpSpectator(context: BrowserContext): Promise<Page> {
  const spec = await context.newPage();
  await spec.goto('./spectator.html');
  await spec.waitForSelector('#canvas');
  await spec.waitForTimeout(400); // identity-handshake settle time
  return spec;
}

test.describe('Phase 119 — player chat panel', () => {
  test('palette opens the chat panel on the GM side', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    await openGmChat(page);
    await expect(page.locator('.chat-panel .chat-input')).toBeVisible();
  });

  test('GM message round-trips to a connected Spectator', async ({ browser }) => {
    const context = await browser.newContext();
    try {
      const gm = await context.newPage();
      await gm.goto('./gm.html');
      await gm.waitForSelector('#canvas');

      const spec = await spinUpSpectator(context);

      // Spectator opens the chat panel via `c` shortcut.
      await spec.keyboard.press('c');
      await expect(spec.locator('.chat-panel')).toBeVisible();

      // GM opens the panel + sends a shared message.
      await openGmChat(gm);
      await gm.locator('.chat-panel .chat-input').fill('Hello players');
      await gm.locator('.chat-panel .chat-send').click();

      // Spectator sees the message.
      await expect(
        spec.locator('.chat-panel .chat-row .chat-row-body', {
          hasText: 'Hello players',
        }),
      ).toBeVisible({ timeout: 3_000 });
    } finally {
      await context.close();
    }
  });

  test('GM-only message does NOT show on the Spectator', async ({ browser }) => {
    const context = await browser.newContext();
    try {
      const gm = await context.newPage();
      await gm.goto('./gm.html');
      await gm.waitForSelector('#canvas');

      const spec = await spinUpSpectator(context);
      await spec.keyboard.press('c');

      await openGmChat(gm);
      await gm.locator('.chat-panel input[data-field="private"]').check();
      await gm.locator('.chat-panel .chat-input').fill('GM only secret');
      await gm.locator('.chat-panel .chat-send').click();

      // GM sees it locally.
      await expect(
        gm.locator('.chat-panel .chat-row .chat-row-body', {
          hasText: 'GM only secret',
        }),
      ).toBeVisible();

      // Spectator should NOT render it.
      await spec.waitForTimeout(500);
      await expect(
        spec.locator('.chat-panel .chat-row .chat-row-body', {
          hasText: 'GM only secret',
        }),
      ).toHaveCount(0);
    } finally {
      await context.close();
    }
  });
});
