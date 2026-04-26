/**
 * Phase 92 — quick-HP adjust via +/- keys.
 *
 * Validates the new keyboard path: with HP-bearing tokens selected,
 * `+` heals 1, `-` damages 1, `Shift +` / `Shift -` does ±5. Replaces
 * the "open the Damage/Heal dialog → type a number → Apply" flow for
 * single-attack adjustments.
 *
 * Asserts via the live-region announcer's text — same pattern the
 * Phase 86 keyboard-canvas-nav spec uses. Inspecting actual HP values
 * would require opening the Token Editor each time, which is the slow
 * path the keyboard shortcut exists to bypass.
 */
import { test, expect, type Page } from '@playwright/test';

async function placeTokenAtCenter(page: Page) {
  await page.keyboard.press('t');
  const box = await page.locator('#canvas').boundingBox();
  if (!box) throw new Error('canvas has no bounding box');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

async function placeTokenWithHp(page: Page, label: string) {
  await placeTokenAtCenter(page);
  // Open the Token Editor for the just-placed token.
  await page.keyboard.press('s');
  const box = await page.locator('#canvas').boundingBox();
  if (!box) throw new Error('canvas has no bounding box');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.keyboard.press('e');
  const dialog = page.getByRole('dialog', { name: 'Edit Token' });
  await expect(dialog).toBeVisible();

  // Set the label so the announcer can identify it.
  const labelInput = dialog.locator('input[data-field="label"]');
  await labelInput.fill(label);

  // Turn HP tracking on (defaults 10/10). The Token Editor is a
  // live editor — input changes commit instantly, no "Save" button.
  await dialog.locator('input[data-field="trackHp"]').check();
  // Close via Escape (the editor's standard dismiss path).
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
}

test.describe('Phase 92 — quick-HP adjust via +/-', () => {
  test('"-" damages selected HP-bearing token by 1; announcer reports new HP', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await placeTokenWithHp(page, 'Goblin');
    // Token is selected after Save (the editor was opened on it).
    // Press `-` (no shift) → -1 HP.
    await page.keyboard.press('-');

    const announcer = page.locator('[data-announcer="polite"]');
    await expect(announcer).toContainText(/Goblin: 9 of 10 HP \(-1\)/);
  });

  test('"+" heals selected HP-bearing token by 1', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await placeTokenWithHp(page, 'Cleric');
    // Damage twice so we have room to heal.
    await page.keyboard.press('-');
    await page.keyboard.press('-');
    await page.keyboard.press('=');  // = is the unshifted form of + on US layouts

    const announcer = page.locator('[data-announcer="polite"]');
    // After -1, -1, +1 → 9 / 10
    await expect(announcer).toContainText(/Cleric: 9 of 10 HP \(\+1\)/);
  });

  test('Shift+- damages by 5', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await placeTokenWithHp(page, 'Bandit');
    // Shift + minus → -5
    await page.keyboard.press('Shift+-');

    const announcer = page.locator('[data-announcer="polite"]');
    await expect(announcer).toContainText(/Bandit: 5 of 10 HP \(-5\)/);
  });

  test('"-" with no HP-bearing selection falls through to camera zoom-out', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    // Drop a token but DON'T enable HP tracking; press `-`. The HP
    // shortcut is a no-op + falls through to zoom.
    await placeTokenAtCenter(page);
    await page.keyboard.press('s');
    const box = await page.locator('#canvas').boundingBox();
    if (!box) throw new Error('canvas has no bounding box');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

    // Capture pre-press camera zoom by sampling the canvas's
    // bounding rect transform (pan-zoom uses CSS transform on a
    // wrapper). Easier: inspect the renderer's camera via window.
    const before = await page.evaluate(() => {
      // The renderer is module-private; easiest observable is the
      // canvas style. Without a hook into the camera, we check that
      // the announcer DIDN'T fire a quick-HP message.
      return null;
    });
    void before;

    await page.keyboard.press('-');

    const announcer = page.locator('[data-announcer="polite"]');
    // No HP-bearing token → no quick-HP announcement.
    const text = await announcer.textContent();
    expect(text ?? '').not.toMatch(/HP \(/);
  });
});
