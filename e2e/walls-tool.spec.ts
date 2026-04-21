import { test, expect, type Page } from '@playwright/test';

/**
 * Phase 54 walls tool coverage.
 *
 * Walls are GM-only + stored in world coords — there's no DOM readout
 * of them, so assertions hang off the observable right-click menu
 * label ("Wall actions" vs "Map actions") and the aria-live announcer
 * tool-switch message.
 */

async function activateWalls(page: Page) {
  await page.keyboard.press('w');
  await expect(page.locator('[data-announcer="polite"]')).toHaveText(
    /Walls tool active/,
  );
}

async function drawWallSegment(
  page: Page,
  a: { fracX: number; fracY: number },
  b: { fracX: number; fracY: number },
): Promise<{ midX: number; midY: number }> {
  const box = await page.locator('#canvas').boundingBox();
  if (!box) throw new Error('canvas has no bounding box');
  const x1 = box.x + box.width * a.fracX;
  const y1 = box.y + box.height * a.fracY;
  const x2 = box.x + box.width * b.fracX;
  const y2 = box.y + box.height * b.fracY;

  // First click drops vertex A. Second click commits the segment A→B.
  await page.mouse.click(x1, y1);
  await page.mouse.click(x2, y2);
  // Escape ends the chain so the next right-click hits the Wall, not
  // the tool's own chain handler.
  await page.keyboard.press('Escape');

  return { midX: (x1 + x2) / 2, midY: (y1 + y2) / 2 };
}

test.describe('Walls tool', () => {
  test('W shortcut activates the Walls tool + toolbar button reflects it', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await activateWalls(page);
    const wallsBtn = page.locator('.gm-toolbar button', { hasText: 'Walls (W)' });
    await expect(wallsBtn).toHaveClass(/active/);
  });

  test('two clicks commit a wall; right-click mid-segment surfaces "Wall actions"', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await activateWalls(page);
    const { midX, midY } = await drawWallSegment(
      page,
      { fracX: 0.35, fracY: 0.5 },
      { fracX: 0.55, fracY: 0.5 },
    );

    // Right-click the midpoint of the wall to open the context menu.
    await page.keyboard.press('s'); // Select tool so right-click hit-tests
    await page.mouse.click(midX, midY, { button: 'right' });

    await expect(page.getByRole('menu', { name: 'Wall actions' })).toBeVisible();
    await expect(
      page.getByRole('menuitem', { name: /Delete wall/ }),
    ).toBeVisible();
    await expect(
      page.getByRole('menuitem', { name: /(Disable|Enable) sight blocking/ }),
    ).toBeVisible();

    await page.keyboard.press('Escape');
  });

  test('Delete wall removes it (next right-click falls back to Map actions)', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await activateWalls(page);
    const { midX, midY } = await drawWallSegment(
      page,
      { fracX: 0.4, fracY: 0.5 },
      { fracX: 0.6, fracY: 0.5 },
    );

    await page.keyboard.press('s');
    await page.mouse.click(midX, midY, { button: 'right' });
    await page.getByRole('menuitem', { name: /Delete wall/ }).click();

    // Next right-click at the same spot: no wall → Map actions menu.
    await page.mouse.click(midX, midY, { button: 'right' });
    await expect(page.getByRole('menu', { name: 'Map actions' })).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('sight-blocking toggle flips the context-menu wording', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await activateWalls(page);
    const { midX, midY } = await drawWallSegment(
      page,
      { fracX: 0.4, fracY: 0.45 },
      { fracX: 0.6, fracY: 0.45 },
    );

    await page.keyboard.press('s');
    await page.mouse.click(midX, midY, { button: 'right' });
    // Default blocksSight=true → menu reads "Disable sight blocking".
    await page.getByRole('menuitem', { name: 'Disable sight blocking' }).click();

    // Re-open: should now offer "Enable sight blocking".
    await page.mouse.click(midX, midY, { button: 'right' });
    await expect(
      page.getByRole('menuitem', { name: 'Enable sight blocking' }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('Escape during an active chain ends the chain without committing a dangling segment', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await activateWalls(page);

    const box = await page.locator('#canvas').boundingBox();
    if (!box) throw new Error('canvas has no bounding box');
    // First click drops vertex A — no segment yet.
    await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.5);
    // Escape out before a second click.
    await page.keyboard.press('Escape');

    // Right-click near where vertex A landed — should get Map actions
    // because no segment was ever committed.
    await page.keyboard.press('s');
    await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.5, {
      button: 'right',
    });
    await expect(page.getByRole('menu', { name: 'Map actions' })).toBeVisible();
    await page.keyboard.press('Escape');
  });
});
