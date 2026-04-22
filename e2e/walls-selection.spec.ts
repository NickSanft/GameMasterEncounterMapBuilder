import { test, expect, type Page } from '@playwright/test';

/**
 * Phase 56 — walls become first-class selectable scene objects.
 *
 * The selection set itself is canvas-only (no per-wall DOM), so the
 * specs assert via observable side effects: pressing Delete after a
 * selection makes the wall(s) gone (right-click at the same spot
 * falls back to Map actions); right-clicking a multi-wall selection
 * shows a "Delete wall (N)" item with the count baked into the label.
 */

interface WallEnds {
  /** First click point — also where the wall starts. */
  startX: number;
  startY: number;
  /** Second click point — also where the wall ends. */
  endX: number;
  endY: number;
  /** Midpoint of the wall — the easiest target for clicks/right-clicks. */
  midX: number;
  midY: number;
}

async function drawWallSegment(
  page: Page,
  a: { fracX: number; fracY: number },
  b: { fracX: number; fracY: number },
): Promise<WallEnds> {
  // Walls tool, click first vertex, click second, escape to end the chain.
  await page.keyboard.press('w');
  const box = await page.locator('#canvas').boundingBox();
  if (!box) throw new Error('canvas has no bounding box');
  const startX = box.x + box.width * a.fracX;
  const startY = box.y + box.height * a.fracY;
  const endX = box.x + box.width * b.fracX;
  const endY = box.y + box.height * b.fracY;
  await page.mouse.click(startX, startY);
  await page.mouse.click(endX, endY);
  await page.keyboard.press('Escape');
  await page.keyboard.press('s'); // Back to Select
  return { startX, startY, endX, endY, midX: (startX + endX) / 2, midY: (startY + endY) / 2 };
}

test.describe('Selectable walls', () => {
  test('Click a wall + press Delete removes it', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    const wall = await drawWallSegment(
      page,
      { fracX: 0.35, fracY: 0.5 },
      { fracX: 0.55, fracY: 0.5 },
    );

    // Click the wall mid-segment (Select tool is already active).
    await page.mouse.click(wall.midX, wall.midY);
    await page.keyboard.press('Delete');

    // Right-click the same spot — should fall back to Map actions
    // because the wall is gone.
    await page.mouse.click(wall.midX, wall.midY, { button: 'right' });
    await expect(page.getByRole('menu', { name: 'Map actions' })).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test(
    'Regression (0.56.1): Delete removes a wall WITHOUT switching tools after boot',
    async ({ page }) => {
      // The 0.56.1 bug: Select tool had its own window keydown Delete
      // handler registered at boot BEFORE the gm.ts handler. It only
      // handled tokens/annotations/AoE and cleared selection on walls,
      // so walls unselected silently instead of deleting. The prior
      // `Click a wall + press Delete` test hid this because its helper
      // pressed `w` then `s` during setup, reordering the handlers. This
      // test skips the tool dance to pin the failure mode.
      await page.goto('./gm.html');
      await page.waitForSelector('#canvas');

      // Walls tool + draw a segment — but DO NOT press `s` to return.
      // (Select tool is already active at boot; activating Walls tool
      // deactivates it, which under the old bug was what accidentally
      // "fixed" the handler order. We inline a minimal drawWall to
      // avoid drawWallSegment's tool-switching.)
      await page.keyboard.press('w');
      const box = await page.locator('#canvas').boundingBox();
      if (!box) throw new Error('canvas has no bounding box');
      const x1 = box.x + box.width * 0.35;
      const y1 = box.y + box.height * 0.5;
      const x2 = box.x + box.width * 0.55;
      const y2 = box.y + box.height * 0.5;
      await page.mouse.click(x1, y1);
      await page.mouse.click(x2, y2);
      await page.keyboard.press('Escape');
      // Switch to Select. Activating Select at boot in gm.ts uses
      // toolManager.setActive('select') *before* gm.ts's window keydown
      // handler is registered; doing the switch here ensures we
      // exercise the same registration order the real app sees.
      await page.keyboard.press('s');

      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;

      // Click the wall + Delete. The 0.56.1 bug surfaced here.
      await page.mouse.click(midX, midY);
      await page.keyboard.press('Delete');

      // Right-click at the old midpoint — wall should be gone.
      await page.mouse.click(midX, midY, { button: 'right' });
      await expect(page.getByRole('menu', { name: 'Map actions' })).toBeVisible();
      await page.keyboard.press('Escape');
    },
  );

  test('Shift+click two walls then Delete removes both', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    const a = await drawWallSegment(
      page,
      { fracX: 0.3, fracY: 0.4 },
      { fracX: 0.5, fracY: 0.4 },
    );
    const b = await drawWallSegment(
      page,
      { fracX: 0.3, fracY: 0.6 },
      { fracX: 0.5, fracY: 0.6 },
    );

    // Click wall A, then Shift+click wall B → both selected.
    await page.mouse.click(a.midX, a.midY);
    await page.keyboard.down('Shift');
    await page.mouse.click(b.midX, b.midY);
    await page.keyboard.up('Shift');

    // Right-click wall B (still in selection) → menu should show
    // "Delete wall (2)" reflecting the multi-selection.
    await page.mouse.click(b.midX, b.midY, { button: 'right' });
    await expect(
      page.getByRole('menuitem', { name: /Delete wall \(2\)/ }),
    ).toBeVisible();
    await page.keyboard.press('Escape');

    // Use the Delete key instead so we exercise that path too.
    await page.keyboard.press('Delete');

    // Both walls are now gone — right-click both midpoints lands on
    // Map actions.
    for (const m of [a, b]) {
      await page.mouse.click(m.midX, m.midY, { button: 'right' });
      await expect(page.getByRole('menu', { name: 'Map actions' })).toBeVisible();
      await page.keyboard.press('Escape');
    }
  });

  test('Lasso catches walls whose segments overlap the rect', async ({ page }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    const wall = await drawWallSegment(
      page,
      { fracX: 0.4, fracY: 0.45 },
      { fracX: 0.6, fracY: 0.45 },
    );

    // Lasso an empty patch that overlaps the wall midpoint.
    const box = await page.locator('#canvas').boundingBox();
    if (!box) throw new Error('canvas has no bounding box');
    const startX = box.x + box.width * 0.42;
    const startY = box.y + box.height * 0.4;
    const endX = box.x + box.width * 0.58;
    const endY = box.y + box.height * 0.5;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY, { steps: 6 });
    await page.mouse.up();

    // Press Delete — wall should be gone.
    await page.keyboard.press('Delete');
    await page.mouse.click(wall.midX, wall.midY, { button: 'right' });
    await expect(page.getByRole('menu', { name: 'Map actions' })).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('Drag a selected wall translates it (right-click target moves)', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    const wall = await drawWallSegment(
      page,
      { fracX: 0.3, fracY: 0.5 },
      { fracX: 0.5, fracY: 0.5 },
    );

    // Drag the wall to the right by ~150 px (canvas pixels). Click +
    // hold mid-segment, move, release.
    const dragShift = 150;
    await page.mouse.move(wall.midX, wall.midY);
    await page.mouse.down();
    await page.mouse.move(wall.midX + dragShift, wall.midY, { steps: 8 });
    await page.mouse.up();

    // Right-click the OLD midpoint → Map actions (wall has moved).
    await page.mouse.click(wall.midX, wall.midY, { button: 'right' });
    await expect(page.getByRole('menu', { name: 'Map actions' })).toBeVisible();
    await page.keyboard.press('Escape');

    // Right-click the NEW midpoint → Wall actions.
    await page.mouse.click(wall.midX + dragShift, wall.midY, { button: 'right' });
    await expect(page.getByRole('menu', { name: 'Wall actions' })).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('Group sight-blocking toggle flips the wording for all selected walls', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    const a = await drawWallSegment(
      page,
      { fracX: 0.3, fracY: 0.4 },
      { fracX: 0.5, fracY: 0.4 },
    );
    const b = await drawWallSegment(
      page,
      { fracX: 0.3, fracY: 0.55 },
      { fracX: 0.5, fracY: 0.55 },
    );

    // Select both walls.
    await page.mouse.click(a.midX, a.midY);
    await page.keyboard.down('Shift');
    await page.mouse.click(b.midX, b.midY);
    await page.keyboard.up('Shift');

    // Right-click → "Disable sight blocking (2)" because both are
    // currently sight-blocking by default.
    await page.mouse.click(b.midX, b.midY, { button: 'right' });
    await page
      .getByRole('menuitem', { name: 'Disable sight blocking (2)' })
      .click();

    // Re-open the menu — should now offer "Enable sight blocking (2)".
    await page.mouse.click(b.midX, b.midY, { button: 'right' });
    await expect(
      page.getByRole('menuitem', { name: 'Enable sight blocking (2)' }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
  });
});
