/**
 * Phase 110 — persistent per-tab player id.
 *
 * Pre-110 every page reload minted a fresh playerId. Phase 82's
 * `canRoll` overrides + Phase 109's hidden-token assignments evaporated
 * across reloads because the GM's per-player state was keyed by the
 * old id. Phase 110 stores the id in `sessionStorage`, so the SAME
 * tab keeps the SAME id across F5 reloads + the GM's per-player
 * state survives.
 *
 * Validates:
 *   - The Spectator's playerId persists across a page reload.
 *   - A Phase 109 hidden token stays hidden after the Spectator
 *     reloads (no need for the GM to re-toggle).
 *   - A brand-new Spectator tab gets a different id.
 */
import { test, expect, type BrowserContext, type Page } from '@playwright/test';

async function getSpectatorPlayerId(page: Page): Promise<string | null> {
  return page.evaluate(() =>
    sessionStorage.getItem('gm-encounter-maps-player-id-spectator'),
  );
}

async function spinUpSpectator(context: BrowserContext): Promise<Page> {
  const spec = await context.newPage();
  await spec.goto('./spectator.html');
  await spec.waitForSelector('#canvas');
  await spec.waitForTimeout(500); // identity-handshake settle time
  return spec;
}

async function placeTokenAt(page: Page, frac: number) {
  await page.keyboard.press('t');
  const box = await page.locator('#canvas').boundingBox();
  if (!box) throw new Error('canvas has no bounding box');
  await page.mouse.click(box.x + box.width * frac, box.y + box.height * 0.5);
}

test.describe('Phase 110 — persistent per-tab player id', () => {
  test('Spectator playerId persists across page reload', async ({ browser }) => {
    const context = await browser.newContext();
    try {
      const spec = await context.newPage();
      await spec.goto('./spectator.html');
      await spec.waitForSelector('#canvas');
      const before = await getSpectatorPlayerId(spec);
      expect(before).toBeTruthy();

      // Reload the spectator tab.
      await spec.reload();
      await spec.waitForSelector('#canvas');
      const after = await getSpectatorPlayerId(spec);
      expect(after).toBe(before);
    } finally {
      await context.close();
    }
  });

  test('a brand-new Spectator tab gets a different id', async ({ browser }) => {
    const context = await browser.newContext();
    try {
      const a = await spinUpSpectator(context);
      const b = await spinUpSpectator(context);
      const idA = await getSpectatorPlayerId(a);
      const idB = await getSpectatorPlayerId(b);
      expect(idA).toBeTruthy();
      expect(idB).toBeTruthy();
      expect(idA).not.toBe(idB);
    } finally {
      await context.close();
    }
  });

  test('Phase 109 hidden token stays hidden after the Spectator reloads', async ({
    browser,
  }) => {
    const context = await browser.newContext();
    try {
      const gm = await context.newPage();
      await gm.goto('./gm.html');
      await gm.waitForSelector('#canvas');

      const spec = await spinUpSpectator(context);
      const idBefore = await getSpectatorPlayerId(spec);
      expect(idBefore).toBeTruthy();

      // GM places a token at center + reveals the cell so the
      // Spectator initially sees it.
      await placeTokenAt(gm, 0.5);
      await gm.keyboard.press('r');
      const box = await gm.locator('#canvas').boundingBox();
      if (!box) throw new Error('no canvas box');
      await gm.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);
      await spec.waitForTimeout(400);
      await expect(spec.locator('#canvas')).toHaveAttribute(
        'aria-label',
        /1 token visible/,
      );

      // GM hides the token from the Spectator via the token editor.
      await gm.keyboard.press('s');
      await gm.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5, {
        button: 'right',
      });
      await gm.getByRole('menuitem', { name: /Edit token/ }).click();
      const editorDialog = gm.getByRole('dialog', { name: 'Edit Token' });
      await expect(editorDialog).toBeVisible();
      const cb = editorDialog.locator('.visibility-row input[type="checkbox"]');
      await expect(cb).toHaveCount(1);
      await cb.uncheck();
      await spec.waitForTimeout(500);

      // Sanity: the Spectator no longer sees it.
      await expect(spec.locator('#canvas')).toHaveAttribute(
        'aria-label',
        /0 token/,
        { timeout: 5_000 },
      );

      // Close the editor so the next interaction works.
      await editorDialog.locator('.modal-close').click();

      // Reload the Spectator tab. Pre-110 this would mint a fresh id
      // and the hidden-list lookup would miss → token reappears.
      // Phase 110 keeps the id stable → token stays hidden.
      await spec.reload();
      await spec.waitForSelector('#canvas');
      const idAfter = await getSpectatorPlayerId(spec);
      expect(idAfter).toBe(idBefore);

      // Allow re-handshake + re-broadcast of permissions for the
      // (still-known) playerId.
      await spec.waitForTimeout(800);
      await expect(spec.locator('#canvas')).toHaveAttribute(
        'aria-label',
        /0 token/,
        { timeout: 5_000 },
      );
    } finally {
      await context.close();
    }
  });
});
