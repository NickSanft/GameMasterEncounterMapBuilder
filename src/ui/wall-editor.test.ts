/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mountWallEditor } from './wall-editor.js';
import { createWall, WALL_DEFAULT_THICKNESS_PX } from '../state/walls.js';
import type { Wall } from '../state/types.js';

function makeWall(over: Partial<Wall> = {}): Wall {
  const w = createWall({ x1: 0, y1: 0, x2: 10, y2: 0 });
  return { ...w, ...over };
}

describe('mountWallEditor', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('starts closed', () => {
    const editor = mountWallEditor({
      getWallById: () => null,
      onChange: vi.fn(),
      onDelete: vi.fn(),
    });
    expect(editor.isOpen()).toBe(false);
    editor.destroy();
  });

  it('openFor([]) is a no-op (refuses to open without walls)', () => {
    const editor = mountWallEditor({
      getWallById: () => null,
      onChange: vi.fn(),
      onDelete: vi.fn(),
    });
    editor.openFor([]);
    expect(editor.isOpen()).toBe(false);
    editor.destroy();
  });

  it('opens with the single-wall title + populates fields from the wall', () => {
    const wall = makeWall({ blocksSight: true, blocksMovement: false, thickness: 4 });
    const editor = mountWallEditor({
      getWallById: (id) => (id === wall.id ? wall : null),
      onChange: vi.fn(),
      onDelete: vi.fn(),
    });
    editor.openFor([wall]);
    expect(editor.isOpen()).toBe(true);

    const title = document.querySelector('[data-field="title"]')!;
    expect(title.textContent).toBe('Edit wall');

    const sight = document.querySelector<HTMLInputElement>('[data-field="sight"]')!;
    expect(sight.checked).toBe(true);

    const movement = document.querySelector<HTMLInputElement>('[data-field="movement"]')!;
    expect(movement.checked).toBe(false);

    const visShared = document.querySelector<HTMLInputElement>('[data-field="vis-shared"]')!;
    const visGm = document.querySelector<HTMLInputElement>('[data-field="vis-gm"]')!;
    // Wall has no explicit visibility → defaults to 'shared'.
    expect(visShared.checked).toBe(true);
    expect(visGm.checked).toBe(false);

    const thickness = document.querySelector<HTMLInputElement>('[data-field="thickness"]')!;
    expect(parseFloat(thickness.value)).toBe(4);
    editor.destroy();
  });

  it('multi-wall title shows the count + uses default for fields with no overrides', () => {
    const a = makeWall();
    const b = makeWall();
    const editor = mountWallEditor({
      getWallById: (id) => [a, b].find((w) => w.id === id) ?? null,
      onChange: vi.fn(),
      onDelete: vi.fn(),
    });
    editor.openFor([a, b]);
    const title = document.querySelector('[data-field="title"]')!;
    expect(title.textContent).toBe('Edit walls (2)');

    // Both walls have undefined thickness → falls back to default → not mixed.
    const thickness = document.querySelector<HTMLInputElement>('[data-field="thickness"]')!;
    expect(parseFloat(thickness.value)).toBe(WALL_DEFAULT_THICKNESS_PX);
    editor.destroy();
  });

  it('multi-wall mixed values render as indeterminate / mixed', () => {
    const a = makeWall({ blocksSight: true, thickness: 2 });
    const b = makeWall({ blocksSight: false, thickness: 6 });
    const editor = mountWallEditor({
      getWallById: (id) => [a, b].find((w) => w.id === id) ?? null,
      onChange: vi.fn(),
      onDelete: vi.fn(),
    });
    editor.openFor([a, b]);

    const sight = document.querySelector<HTMLInputElement>('[data-field="sight"]')!;
    expect(sight.indeterminate).toBe(true);

    const thicknessOut = document.querySelector<HTMLOutputElement>(
      '[data-field="thickness-out"]',
    )!;
    expect(thicknessOut.textContent).toContain('mixed');

    const visShared = document.querySelector<HTMLInputElement>('[data-field="vis-shared"]')!;
    const visGm = document.querySelector<HTMLInputElement>('[data-field="vis-gm"]')!;
    // Both undefined visibility → default 'shared' → both are 'shared' →
    // NOT mixed → 'shared' radio is checked.
    expect(visShared.checked).toBe(true);
    expect(visGm.checked).toBe(false);
    editor.destroy();
  });

  it('toggling sight calls onChange with all selected ids', () => {
    const a = makeWall({ blocksSight: true });
    const b = makeWall({ blocksSight: true });
    const onChange = vi.fn();
    const editor = mountWallEditor({
      getWallById: (id) => [a, b].find((w) => w.id === id) ?? null,
      onChange,
      onDelete: vi.fn(),
    });
    editor.openFor([a, b]);

    const sight = document.querySelector<HTMLInputElement>('[data-field="sight"]')!;
    sight.checked = false;
    sight.dispatchEvent(new Event('change'));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith([a.id, b.id], { blocksSight: false });
    editor.destroy();
  });

  it('switching visibility radio calls onChange with the new value', () => {
    const wall = makeWall({ visibility: 'shared' });
    const onChange = vi.fn();
    const editor = mountWallEditor({
      getWallById: (id) => (id === wall.id ? wall : null),
      onChange,
      onDelete: vi.fn(),
    });
    editor.openFor([wall]);

    const visGm = document.querySelector<HTMLInputElement>('[data-field="vis-gm"]')!;
    visGm.checked = true;
    visGm.dispatchEvent(new Event('change'));
    expect(onChange).toHaveBeenCalledWith([wall.id], { visibility: 'gm' });
    editor.destroy();
  });

  it('thickness change commits the clamped value via onChange', () => {
    const wall = makeWall();
    const onChange = vi.fn();
    const editor = mountWallEditor({
      getWallById: (id) => (id === wall.id ? wall : null),
      onChange,
      onDelete: vi.fn(),
    });
    editor.openFor([wall]);

    const thickness = document.querySelector<HTMLInputElement>('[data-field="thickness"]')!;
    thickness.value = '6';
    thickness.dispatchEvent(new Event('change'));
    expect(onChange).toHaveBeenCalledWith([wall.id], { thickness: 6 });

    // Out-of-range value gets clamped.
    thickness.value = '999';
    thickness.dispatchEvent(new Event('change'));
    expect(onChange).toHaveBeenLastCalledWith([wall.id], { thickness: 12 });
    editor.destroy();
  });

  it('delete button calls onDelete + closes the modal', () => {
    const wall = makeWall();
    const onDelete = vi.fn();
    const editor = mountWallEditor({
      getWallById: (id) => (id === wall.id ? wall : null),
      onChange: vi.fn(),
      onDelete,
    });
    editor.openFor([wall]);
    const del = document.querySelector<HTMLButtonElement>('[data-field="delete"]')!;
    del.click();
    expect(onDelete).toHaveBeenCalledWith([wall.id]);
    expect(editor.isOpen()).toBe(false);
    editor.destroy();
  });

  it('Done button closes without further mutations', () => {
    const wall = makeWall();
    const onChange = vi.fn();
    const editor = mountWallEditor({
      getWallById: (id) => (id === wall.id ? wall : null),
      onChange,
      onDelete: vi.fn(),
    });
    editor.openFor([wall]);
    const done = document.querySelector<HTMLButtonElement>('[data-field="done"]')!;
    done.click();
    expect(editor.isOpen()).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
    editor.destroy();
  });

  it('Escape closes the modal', () => {
    const wall = makeWall();
    const editor = mountWallEditor({
      getWallById: (id) => (id === wall.id ? wall : null),
      onChange: vi.fn(),
      onDelete: vi.fn(),
    });
    editor.openFor([wall]);
    expect(editor.isOpen()).toBe(true);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(editor.isOpen()).toBe(false);
    editor.destroy();
  });

  it('auto-closes when all editing walls vanish from state (e.g. external delete)', () => {
    let wallExists = true;
    const wall = makeWall();
    const onChange = vi.fn();
    const editor = mountWallEditor({
      getWallById: (id) => (id === wall.id && wallExists ? wall : null),
      onChange,
      onDelete: vi.fn(),
    });
    editor.openFor([wall]);
    expect(editor.isOpen()).toBe(true);

    // Wall got deleted externally; trigger a re-render via a toggle.
    wallExists = false;
    const sight = document.querySelector<HTMLInputElement>('[data-field="sight"]')!;
    sight.checked = false;
    sight.dispatchEvent(new Event('change'));
    // The onChange fires (with our id) but the modal then re-renders,
    // sees no live walls, and closes.
    expect(editor.isOpen()).toBe(false);
    editor.destroy();
  });
});
