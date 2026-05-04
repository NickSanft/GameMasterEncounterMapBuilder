/**
 * Phase 137 — multi-token auto-numbering.
 *
 * Validates that Alt+stamp duplicates the previously-placed token
 * with an auto-suffixed label. We synthesize a `pointerdown` event
 * directly with `altKey: true` because Playwright's
 * `page.mouse.click` doesn't propagate keyboard.down('Alt') state to
 * pointer events in headless chromium, and `Locator.click({modifiers:
 * ['Alt']})` only sets the modifier on `mousedown`/`mouseup`/`click`
 * — not on `pointerdown`, which is what `tool-token` listens for.
 *
 * The synthetic-event approach keeps the test deterministic without
 * relying on the browser-vs-Playwright modifier dispatch lottery.
 */
import { test, expect, type Page } from '@playwright/test';

async function tokenLabels(page: Page): Promise<string[]> {
  const items = await page
    .locator('.canvas-outline li', { hasText: 'at column' })
    .allTextContents();
  return items.map((t) => {
    const m = t.match(/^(.*?)\s+at column/);
    return m ? m[1]!.trim() : t.trim();
  });
}

/**
 * Dispatch a synthetic `pointerdown` (with optional altKey) at the
 * given canvas-relative coords. Mirrors the event Playwright would
 * dispatch for a real mouse click — `pointerType: 'mouse'`, primary
 * button, bubbling. Used to bypass the chromium-headless modifier
 * dispatch quirk for the Phase 137 alt-stamp e2e.
 */
async function dispatchPointerDown(
  page: Page,
  canvasX: number,
  canvasY: number,
  alt: boolean,
) {
  await page.evaluate(
    ([x, y, altKey]) => {
      const canvas = document.querySelector(
        '#canvas',
      ) as HTMLCanvasElement | null;
      if (!canvas) throw new Error('no canvas');
      const rect = canvas.getBoundingClientRect();
      const e = new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        pointerType: 'mouse',
        button: 0,
        clientX: rect.left + (x as number),
        clientY: rect.top + (y as number),
        altKey: altKey as boolean,
      });
      canvas.dispatchEvent(e);
    },
    [canvasX, canvasY, alt],
  );
}

test.describe('Phase 137 — multi-token auto-numbering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');
  });

  test('Alt+stamp duplicates produce all-distinct labels when the pref is on (default)', async ({
    page,
  }) => {
    await page.keyboard.press('t');
    const box = await page.locator('#canvas').boundingBox();
    if (!box) throw new Error('canvas has no bounding box');
    const cx = box.width / 2;
    const cy = box.height / 2;

    // First drop via real Playwright mouse event so the canvas
    // pipeline initializes its `lastPlaced` ref from the genuine
    // pointer event.
    await page.mouse.click(box.x + cx, box.y + cy);
    await expect
      .poll(async () => (await tokenLabels(page)).length)
      .toBe(1);

    // Subsequent stamps need altKey on the pointerdown event;
    // Playwright's mouse.click + keyboard.down('Alt') doesn't
    // propagate to PointerEvent.altKey in headless chromium, so
    // dispatch a synthetic pointerdown directly.
    await dispatchPointerDown(page, cx + 80, cy, true);
    await expect
      .poll(async () => (await tokenLabels(page)).length)
      .toBe(2);

    await dispatchPointerDown(page, cx - 80, cy, true);
    await expect
      .poll(async () => (await tokenLabels(page)).length)
      .toBe(3);

    const labels = await tokenLabels(page);
    // With auto-number ON, every alt-stamp gets a fresh suffix —
    // the three labels should all be distinct (vs the OFF test
    // below where all three collide on "Token 1"). Exact suffix
    // values depend on `nextLabelSuffix`'s integer-suffix-stripping
    // semantics (exhaustively tested in the unit suite); this
    // assertion proves the wiring without binding the test to the
    // specific helper output for "Token 1"-shaped base labels.
    expect(new Set(labels).size).toBe(3);
    // The first drop preserves its original "Token 1" label
    // (the bare-counter from the fresh-drop path).
    expect(labels).toContain('Token 1');
  });

  test('Alt+stamp without auto-number pref produces collisions', async ({
    page,
  }) => {
    // Disable the preference, then alt-stamp twice. All three tokens
    // should share the same label ("Token 1").
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Settings' });
    await dialog.getByRole('tab', { name: 'Appearance' }).click();
    await dialog
      .locator('input[data-field="autoNumberDuplicateTokens"]')
      .uncheck();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();

    await page.keyboard.press('t');
    const box = await page.locator('#canvas').boundingBox();
    if (!box) throw new Error('canvas has no bounding box');
    const cx = box.width / 2;
    const cy = box.height / 2;

    // Same first-real-click + synthetic-stamp pattern as the ON test.
    await page.mouse.click(box.x + cx, box.y + cy);
    await expect
      .poll(async () => (await tokenLabels(page)).length)
      .toBe(1);
    await dispatchPointerDown(page, cx + 80, cy, true);
    await dispatchPointerDown(page, cx - 80, cy, true);

    await expect
      .poll(async () => (await tokenLabels(page)).length)
      .toBe(3);
    const labels = await tokenLabels(page);
    // All three should be "Token 1" — pre-137 behavior.
    expect(labels.filter((l) => l === 'Token 1').length).toBe(3);
  });
});
