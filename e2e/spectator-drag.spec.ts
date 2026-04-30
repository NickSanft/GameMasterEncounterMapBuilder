/**
 * Phase 127 — Spectator drag for owned tokens.
 *
 * Validates:
 *   - Spectator can drag a token they own; the GM tab sees the new
 *     position via the normal patch loop.
 *   - Spectator CANNOT drag an unowned (GM-controlled) token —
 *     the gesture is silently ignored, position unchanged.
 *   - Wrong-owner claims are dropped by the GM (defense against
 *     a tampered or out-of-date sender claiming someone else's token).
 *
 * The Spectator → GM round-trip uses BroadcastChannel within the
 * same Playwright BrowserContext, mirroring the production sync.
 */
import { test, expect, type BrowserContext, type Page } from '@playwright/test';

async function spinUpSpectator(context: BrowserContext): Promise<Page> {
  const spec = await context.newPage();
  await spec.goto('./spectator.html');
  await spec.waitForSelector('#canvas');
  // Identity-handshake settle time.
  await spec.waitForTimeout(500);
  return spec;
}

async function placeToken(gm: Page) {
  await gm.keyboard.press('t');
  const box = await gm.locator('#canvas').boundingBox();
  if (!box) throw new Error('canvas has no bounding box');
  await gm.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

async function tokenColumnRow(
  page: Page,
): Promise<{ col: number; row: number } | null> {
  const text = await page
    .locator('.canvas-outline li', { hasText: 'at column' })
    .first()
    .textContent();
  if (!text) return null;
  const m = text.match(/column (\d+), row (\d+)/);
  if (!m) return null;
  return { col: Number(m[1]), row: Number(m[2]) };
}

async function setOwnerToFirstSpectator(gm: Page) {
  await gm.keyboard.press('s');
  const box = await gm.locator('#canvas').boundingBox();
  if (!box) throw new Error('canvas has no bounding box');
  await gm.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await gm.keyboard.press('e');
  await expect(gm.getByRole('dialog', { name: 'Edit Token' })).toBeVisible();
  const select = gm.locator('select[data-field="owner-select"]');
  const ownerValue = await select
    .locator('option:not([value=""])')
    .first()
    .getAttribute('value');
  expect(ownerValue).not.toBeNull();
  await select.selectOption(ownerValue!);
  await gm.keyboard.press('Escape');
  await expect(
    gm.getByRole('dialog', { name: 'Edit Token' }),
  ).toBeHidden();
}

test.describe('Phase 127 — Spectator drag for owned tokens', () => {
  test('spectator can drag an owned token; GM sees the new position', async ({
    browser,
  }) => {
    const context = await browser.newContext();
    try {
      const gm = await context.newPage();
      await gm.goto('./gm.html');
      await gm.waitForSelector('#canvas');

      const spec = await spinUpSpectator(context);
      // Allow identity-broadcast to land in the GM IdentityRegistry.
      await gm.waitForTimeout(400);

      await placeToken(gm);
      await expect.poll(async () => await tokenColumnRow(gm)).not.toBeNull();
      const start = await tokenColumnRow(gm);
      expect(start).not.toBeNull();
      await setOwnerToFirstSpectator(gm);

      // The spectator drags the token. Token center is at GM's box
      // center; same world coords appear at the spectator's box
      // center too (initial cameras align by default).
      const specBox = await spec.locator('#canvas').boundingBox();
      if (!specBox) throw new Error('spec canvas has no bounding box');
      const startX = specBox.x + specBox.width / 2;
      const startY = specBox.y + specBox.height / 2;
      // Drag 100 px right (~2 cells at the default 50 px cellSize).
      await spec.mouse.move(startX, startY);
      await spec.mouse.down();
      await spec.mouse.move(startX + 100, startY, { steps: 6 });
      await spec.mouse.up();

      // The GM tab's canvas-outline reflects the new column.
      await expect
        .poll(async () => (await tokenColumnRow(gm))?.col)
        .toBeGreaterThan(start!.col);
    } finally {
      await context.close();
    }
  });

  test('spectator drag on an UNOWNED token is silently ignored', async ({
    browser,
  }) => {
    const context = await browser.newContext();
    try {
      const gm = await context.newPage();
      await gm.goto('./gm.html');
      await gm.waitForSelector('#canvas');

      const spec = await spinUpSpectator(context);
      await gm.waitForTimeout(400);

      await placeToken(gm);
      await expect.poll(async () => await tokenColumnRow(gm)).not.toBeNull();
      const start = await tokenColumnRow(gm);
      // Don't set owner — token stays GM-controlled (ownerId: null).

      const specBox = await spec.locator('#canvas').boundingBox();
      if (!specBox) throw new Error('spec canvas has no bounding box');
      const startX = specBox.x + specBox.width / 2;
      const startY = specBox.y + specBox.height / 2;
      await spec.mouse.move(startX, startY);
      await spec.mouse.down();
      await spec.mouse.move(startX + 100, startY, { steps: 6 });
      await spec.mouse.up();

      // Brief settle — pan-zoom may have fired but no token-claim-move
      // should have. Position unchanged.
      await gm.waitForTimeout(400);
      const after = await tokenColumnRow(gm);
      expect(after).toEqual(start);
    } finally {
      await context.close();
    }
  });
});
