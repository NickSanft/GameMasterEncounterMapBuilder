/**
 * Phase 133 — multi-hex brush in hex mode.
 *
 * Validates the brushSize → hex-disk-radius mapping for the fog tool
 * in hex grid mode. Brush 1 paints just the targeted hex per
 * pointermove; brush 3 paints a radius-2 disk (19 hexes) — visibly
 * more fog flips for the same drag stroke.
 *
 * Each test starts on a fresh page (Playwright default) so the
 * brush-1 vs brush-3 reveal counts compare against the same starting
 * state. The assertion is "brush 3's reveal pct is meaningfully
 * larger than brush 1's" — measured indirectly via the canvas's
 * `aria-label` reveal-percentage suffix.
 */
import { test, expect, type Page } from '@playwright/test';

async function selectHexGrid(page: Page) {
  await page.getByRole('button', { name: 'Settings' }).click();
  const dialog = page.getByRole('dialog', { name: 'Settings' });
  await expect(dialog).toBeVisible();
  await dialog.locator('select[data-field="gridShape"]').selectOption('hex');
  await dialog.locator('.modal-close').click();
  await expect(dialog).toBeHidden();
}

async function setFreehandFog(page: Page) {
  const freehandBtn = page.locator('button', { hasText: 'Free' }).first();
  if (await freehandBtn.isVisible()) {
    await freehandBtn.click();
  }
}

async function setBrushSize(page: Page, size: 1 | 2 | 3) {
  const btn = page
    .locator('.fog-settings button', { hasText: String(size) })
    .first();
  await btn.click();
}

async function getFogRevealedPct(page: Page): Promise<number> {
  const label = await page.locator('#canvas').getAttribute('aria-label');
  const m = label?.match(/(\d+)% of fog revealed/);
  return m ? Number(m[1]) : 0;
}

async function dragStrokeAcrossCenter(page: Page) {
  const box = await page.locator('#canvas').boundingBox();
  if (!box) throw new Error('canvas has no bounding box');
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx - 100, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 100, cy, { steps: 10 });
  await page.mouse.up();
}

test.describe('Phase 133 — hex multi-hex brush', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
    await selectHexGrid(page);
    await page.keyboard.press('r');
    await setFreehandFog(page);
  });

  test('brush 1 in hex mode reveals a thin stripe (single hex per pointermove)', async ({
    page,
  }) => {
    await setBrushSize(page, 1);
    await dragStrokeAcrossCenter(page);
    await expect.poll(() => getFogRevealedPct(page)).toBeGreaterThan(0);
    const pct = await getFogRevealedPct(page);
    // A thin stripe across half the width on a 30-col grid should
    // reveal a small but measurable fraction.
    expect(pct).toBeGreaterThan(0);
    expect(pct).toBeLessThan(15);
  });

  test('brush 3 in hex mode reveals a much wider band (19-hex disk per pointermove)', async ({
    page,
  }) => {
    await setBrushSize(page, 3);
    await dragStrokeAcrossCenter(page);
    await expect.poll(() => getFogRevealedPct(page)).toBeGreaterThan(0);
    const pct = await getFogRevealedPct(page);
    // The 19-hex disk per pointermove makes the same stroke flip
    // ~10x as many cells. Floor at 10% gives plenty of headroom over
    // brush-1's typical 2-3% result without being so high that small
    // grid-size tweaks would flake the test.
    expect(pct).toBeGreaterThan(10);
  });
});
