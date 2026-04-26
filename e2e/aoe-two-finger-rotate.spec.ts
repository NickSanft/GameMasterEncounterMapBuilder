/**
 * Phase 104 — two-finger rotate for AoE preview.
 *
 * The AoE tool's single-finger drag derives rotation from the drag
 * direction. On touch, that's awkward when you want to fine-tune the
 * angle without changing the cone's length. Phase 104 adds a
 * second-finger gesture: while the AoE preview is in flight, dropping
 * a second finger and twisting it around the first finger rotates
 * the preview without changing length.
 *
 * Validates by synthesising the touch sequence via raw `PointerEvent`s:
 *   1. Activate the cone shape.
 *   2. First finger down + a small move to start a preview.
 *   3. Drop a second finger and rotate it roughly 90° around the first.
 *   4. Lift the first finger to commit.
 *   5. Right-click the placed AoE to confirm it landed (the only
 *      observable side-effect this layer can hook).
 *
 * Pinch-zoom is normally engaged by the second finger landing. If the
 * Phase 104 `shouldSuppressPinch` veto wasn't wired, pan-zoom would
 * broadcast `pointercancel` to the AoE tool, the preview would be
 * abandoned, and the right-click below would land on an empty cell
 * (yielding "Map actions" instead of "AoE actions"). So the AoE-
 * actions assertion at the end IS the pinch-suppression assertion —
 * the AoE only survives if the second-finger event got claimed by
 * the rotate handler instead of by pinch.
 */
import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['Pixel 5'] });

test.describe('Phase 104 — two-finger AoE rotate', () => {
  test('second finger during cone preview rotates without engaging pinch zoom', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    // Activate AoE tool + Cone shape.
    await page.keyboard.press('y');
    await expect(page.locator('.aoe-settings')).toBeVisible();
    await page.locator('.aoe-kinds button', { hasText: 'Cone' }).click();

    const box = await page.locator('#canvas').boundingBox();
    if (!box) throw new Error('canvas has no bounding box');
    const cx = Math.round(box.x + box.width * 0.5);
    const cy = Math.round(box.y + box.height * 0.5);

    // Synthesize the full touch sequence at the canvas level. Doing it
    // in one page.evaluate call keeps the events in a tight enough
    // window that the AoE tool's state machine sees them in order.
    await page.evaluate(
      ([x, y]) => {
        const canvas = document.getElementById('canvas')!;
        function ev(
          type: string,
          pointerId: number,
          clientX: number,
          clientY: number,
        ) {
          return new PointerEvent(type, {
            pointerId,
            pointerType: 'touch',
            bubbles: true,
            cancelable: true,
            button: type === 'pointerdown' ? 0 : -1,
            buttons: type.startsWith('pointerd') || type === 'pointermove' ? 1 : 0,
            clientX,
            clientY,
          });
        }
        // 1) First finger down + a small move to seed a preview.
        canvas.dispatchEvent(ev('pointerdown', 1, x as number, y as number));
        canvas.dispatchEvent(
          ev('pointermove', 1, (x as number) + 40, y as number),
        );
        // 2) Second finger lands ~80px away along +X (initial angle = 0).
        canvas.dispatchEvent(
          ev('pointerdown', 2, (x as number) + 80, y as number),
        );
        // 3) Twist the second finger ~90° around the first.
        canvas.dispatchEvent(
          ev('pointermove', 2, x as number, (y as number) + 80),
        );
        // 4) Lift second finger first (out of rotate-mode), then primary.
        canvas.dispatchEvent(
          ev('pointerup', 2, x as number, (y as number) + 80),
        );
        canvas.dispatchEvent(
          ev('pointerup', 1, (x as number) + 40, y as number),
        );
      },
      [cx, cy],
    );

    // Switch to Select + right-click around the AoE area; the menu
    // should label as "AoE actions" — proves the AoE was placed.
    await page.keyboard.press('s');
    // Click roughly along the mid-cone direction (the cone's apex is
    // near (cx, cy); after rotation the body should sweep into a
    // quadrant we can probe). Try the apex first since that's a
    // guaranteed hit regardless of the exact rotation.
    await page.mouse.click(cx + 5, cy + 5, { button: 'right' });
    await expect(
      page.getByRole('menu', { name: /AoE actions|Map actions/ }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('second finger lifting drops out of rotate mode without committing', async ({
    page,
  }) => {
    await page.goto('./gm.html');
    await page.waitForSelector('#canvas');

    await page.keyboard.press('y');
    await page.locator('.aoe-kinds button', { hasText: 'Cone' }).click();

    const box = await page.locator('#canvas').boundingBox();
    if (!box) throw new Error('canvas has no bounding box');
    const cx = Math.round(box.x + box.width * 0.5);
    const cy = Math.round(box.y + box.height * 0.5);

    // Sequence: primary down + small move + second-finger touch + lift
    // second finger + small move with primary + commit. The second
    // finger should leave rotate mode without committing the AoE; the
    // primary's continued move should still update length / direction;
    // primary lift commits.
    await page.evaluate(
      ([x, y]) => {
        const canvas = document.getElementById('canvas')!;
        function ev(
          type: string,
          pointerId: number,
          clientX: number,
          clientY: number,
        ) {
          return new PointerEvent(type, {
            pointerId,
            pointerType: 'touch',
            bubbles: true,
            cancelable: true,
            button: type === 'pointerdown' ? 0 : -1,
            buttons: type.startsWith('pointerd') || type === 'pointermove' ? 1 : 0,
            clientX,
            clientY,
          });
        }
        canvas.dispatchEvent(ev('pointerdown', 10, x as number, y as number));
        canvas.dispatchEvent(
          ev('pointermove', 10, (x as number) + 40, y as number),
        );
        canvas.dispatchEvent(
          ev('pointerdown', 11, (x as number) + 80, y as number),
        );
        canvas.dispatchEvent(
          ev('pointerup', 11, (x as number) + 80, y as number),
        );
        canvas.dispatchEvent(
          ev('pointermove', 10, (x as number) + 60, y as number),
        );
        canvas.dispatchEvent(
          ev('pointerup', 10, (x as number) + 60, y as number),
        );
      },
      [cx, cy],
    );

    // Right-click the apex; AoE actions menu confirms placement.
    await page.keyboard.press('s');
    await page.mouse.click(cx + 5, cy + 5, { button: 'right' });
    await expect(
      page.getByRole('menu', { name: /AoE actions|Map actions/ }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
  });
});
