import { test, expect, type Page } from '@playwright/test';

/**
 * Build a minimal exported-session JSON (v1) for the given tokens so
 * we don't need a fixture file on disk.
 */
function buildExportJson(options: {
  tokens: Array<{ id: string; label: string; x: number; y: number }>;
}): string {
  const tokens = options.tokens.map((t) => ({
    id: t.id,
    x: t.x,
    y: t.y,
    label: t.label,
    color: '#00aaff',
    imageId: null,
    size: 1,
    borderColor: null,
    hp: null,
    conditions: [],
    rotation: 0,
  }));
  const cols = 30;
  const rows = 20;
  return JSON.stringify({
    version: 1,
    exportedAt: new Date().toISOString(),
    state: {
      version: 1,
      grid: { cols, rows, cellSize: 50, showGridLines: true },
      background: { imageId: null, offsetX: 0, offsetY: 0, scaleX: 1, scaleY: 1 },
      tokens,
      fog: new Array(cols * rows).fill(0),
      annotations: [],
      aoeTemplates: [],
      initiative: { order: [], activeId: null, round: 0 },
      strokes: [],
    },
    images: [],
  });
}

async function uploadJsonFile(page: Page, json: string, fileName = 'import.json') {
  const fileInput = page.locator('input[type="file"][accept*="json"]');
  await fileInput.setInputFiles({
    name: fileName,
    mimeType: 'application/json',
    buffer: Buffer.from(json, 'utf-8'),
  });
}

async function placeTokenAtCenter(page: Page) {
  await page.keyboard.press('t');
  const box = await page.locator('#canvas').boundingBox();
  if (!box) throw new Error('canvas has no bounding box');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

test.describe('Partial import', () => {
  test('Import opens the options modal with category checkboxes', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    const json = buildExportJson({
      tokens: [{ id: 'imp-a', label: 'Imported A', x: 5, y: 5 }],
    });
    await uploadJsonFile(page, json);

    const dialog = page.getByRole('dialog', { name: 'Import options' });
    await expect(dialog).toBeVisible();

    for (const label of [
      'Background',
      'Tokens',
      'Fog of war',
      'Annotations',
      'AoE templates',
      'Initiative',
      'Drawings',
      'Grid dimensions',
    ]) {
      await expect(
        dialog.locator('.import-options-row', { hasText: label }),
      ).toBeVisible();
    }

    // Cancel closes the modal and makes no changes.
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(dialog).toBeHidden();
  });

  test('Unchecking Tokens keeps the current token and skips the imported ones', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    // Place a token on the local canvas first.
    await placeTokenAtCenter(page);

    // Upload a JSON containing a different token.
    const json = buildExportJson({
      tokens: [{ id: 'imp-a', label: 'Imported Boss', x: 2, y: 2 }],
    });
    await uploadJsonFile(page, json);

    const dialog = page.getByRole('dialog', { name: 'Import options' });
    await expect(dialog).toBeVisible();

    // Uncheck Tokens.
    const tokensRow = dialog.locator('.import-options-row', { hasText: 'Tokens' });
    await tokensRow.locator('input[type="checkbox"]').uncheck();

    // Apply.
    await dialog.getByRole('button', { name: 'Import', exact: true }).click();
    await expect(dialog).toBeHidden();

    // The local token should still be selectable at the canvas center.
    await page.keyboard.press('s');
    const box = await page.locator('#canvas').boundingBox();
    if (!box) throw new Error('canvas has no bounding box');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.keyboard.press('e');
    const editor = page.getByRole('dialog', { name: 'Edit Token' });
    await expect(editor).toBeVisible();
    // The default-placed token is labeled "Token 1" — not "Imported Boss".
    await expect(page.locator('input[data-field="label"]')).toHaveValue('Token 1');
  });

  test('disabled checkboxes for empty categories', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    // Export with only tokens — everything else is empty.
    const json = buildExportJson({
      tokens: [{ id: 'imp-a', label: 'Only Token', x: 2, y: 2 }],
    });
    await uploadJsonFile(page, json);

    const dialog = page.getByRole('dialog', { name: 'Import options' });
    await expect(dialog).toBeVisible();

    // Tokens row enabled; Annotations/AoE/Initiative/Drawings rows disabled.
    await expect(
      dialog
        .locator('.import-options-row', { hasText: 'Tokens' })
        .locator('input[type="checkbox"]'),
    ).toBeEnabled();

    for (const label of [
      'Annotations',
      'AoE templates',
      'Initiative',
      'Drawings',
      'Background',
    ]) {
      await expect(
        dialog
          .locator('.import-options-row', { hasText: label })
          .locator('input[type="checkbox"]'),
      ).toBeDisabled();
    }
  });

  test('checking Fog also auto-checks + locks the Grid box (dimensions are coupled)', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    const json = buildExportJson({
      tokens: [{ id: 't', label: 'T', x: 0, y: 0 }],
    });
    await uploadJsonFile(page, json);

    const dialog = page.getByRole('dialog', { name: 'Import options' });
    const fog = dialog
      .locator('.import-options-row', { hasText: 'Fog of war' })
      .locator('input[type="checkbox"]');
    const grid = dialog
      .locator('.import-options-row', { hasText: 'Grid dimensions' })
      .locator('input[type="checkbox"]');

    // Default: fog checked → grid auto-checked + disabled.
    await expect(fog).toBeChecked();
    await expect(grid).toBeChecked();
    await expect(grid).toBeDisabled();

    // Uncheck fog → grid becomes independent and stays checked by default.
    await fog.uncheck();
    await expect(grid).toBeEnabled();
    // Still checked (default was true).
    await expect(grid).toBeChecked();
  });
});
