import { describe, it, expect, beforeEach } from 'vitest';
import {
  normalizeTokensForTemplate,
  placeTemplate,
  saveTemplateToLibrary,
  listLibraryTemplates,
  deleteLibraryTemplate,
  type TemplateCatalogEntry,
} from './template-catalog.js';
import { _resetDBForTests } from './idb.js';
import type { Token } from './types.js';

function tok(overrides: Partial<Token> = {}): Token {
  return {
    id: overrides.id ?? 't-' + Math.random().toString(36).slice(2, 6),
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    label: overrides.label ?? 'T',
    color: overrides.color ?? '#888',
    imageId: overrides.imageId ?? null,
    size: overrides.size ?? 1,
    borderColor: overrides.borderColor ?? null,
    hp: overrides.hp ?? null,
    conditions: overrides.conditions ?? [],
    rotation: overrides.rotation ?? 0,
    losRadius: overrides.losRadius ?? null,
    light: overrides.light ?? null,
    initiativeMod: overrides.initiativeMod ?? 0,
    conditionExpirations: overrides.conditionExpirations ?? {},
    deathSaves: overrides.deathSaves ?? { successes: 0, failures: 0 },
  };
}

beforeEach(() => {
  _resetDBForTests();
});

describe('template-catalog: normalization', () => {
  it('returns empty for empty input', () => {
    expect(normalizeTokensForTemplate([])).toEqual([]);
  });

  it('shifts minimum x/y to zero', () => {
    const a = tok({ x: 5, y: 7, label: 'A' });
    const b = tok({ x: 8, y: 9, label: 'B' });
    const c = tok({ x: 6, y: 15, label: 'C' });
    const normalized = normalizeTokensForTemplate([a, b, c]);
    expect(normalized.map((t) => ({ dx: t.dx, dy: t.dy }))).toEqual([
      { dx: 0, dy: 0 },
      { dx: 3, dy: 2 },
      { dx: 1, dy: 8 },
    ]);
  });

  it('preserves per-token appearance fields', () => {
    const t = tok({
      x: 10,
      y: 20,
      label: 'Boss',
      color: '#ff0000',
      size: 3,
      borderColor: '#ffff00',
      imageId: 'img-42',
    });
    const [norm] = normalizeTokensForTemplate([t]);
    expect(norm!.label).toBe('Boss');
    expect(norm!.color).toBe('#ff0000');
    expect(norm!.size).toBe(3);
    expect(norm!.borderColor).toBe('#ffff00');
    expect(norm!.imageId).toBe('img-42');
  });

  it('strips token identity (no id or absolute position)', () => {
    const t = tok({ id: 'original-id', x: 5, y: 5 });
    const [norm] = normalizeTokensForTemplate([t]);
    expect(norm).toBeDefined();
    expect((norm as unknown as { id?: string }).id).toBeUndefined();
    expect((norm as unknown as { x?: number }).x).toBeUndefined();
    expect((norm as unknown as { y?: number }).y).toBeUndefined();
  });
});

describe('template-catalog: placement', () => {
  const entry: TemplateCatalogEntry = {
    id: 'tmpl-1',
    name: 'Pair',
    createdAt: 0,
    tokens: normalizeTokensForTemplate([
      tok({ x: 2, y: 2, label: 'A' }),
      tok({ x: 4, y: 5, label: 'B' }),
    ]),
  };

  it('places all tokens relative to the anchor', () => {
    const placed = placeTemplate(entry, 10, 10);
    expect(placed).toHaveLength(2);
    expect(placed[0]!.x).toBe(10);
    expect(placed[0]!.y).toBe(10);
    expect(placed[1]!.x).toBe(12);
    expect(placed[1]!.y).toBe(13);
  });

  it('mints fresh ids for each placed token', () => {
    const p1 = placeTemplate(entry, 0, 0);
    const p2 = placeTemplate(entry, 5, 5);
    const ids = new Set([...p1, ...p2].map((t) => t.id));
    expect(ids.size).toBe(4);
  });
});

describe('template-catalog: persistence', () => {
  it('saves + lists + deletes templates', async () => {
    const id = await saveTemplateToLibrary('Pack of wolves', [
      tok({ x: 0, y: 0, label: 'Wolf 1' }),
      tok({ x: 1, y: 0, label: 'Wolf 2' }),
    ]);
    const list1 = await listLibraryTemplates();
    expect(list1).toHaveLength(1);
    expect(list1[0]!.id).toBe(id);
    expect(list1[0]!.name).toBe('Pack of wolves');
    expect(list1[0]!.tokens).toHaveLength(2);

    await deleteLibraryTemplate(id);
    const list2 = await listLibraryTemplates();
    expect(list2).toHaveLength(0);
  });

  it('sorts newest first', async () => {
    const a = await saveTemplateToLibrary('Old', [tok()]);
    await new Promise((r) => setTimeout(r, 2));
    const b = await saveTemplateToLibrary('New', [tok()]);
    const list = await listLibraryTemplates();
    expect(list.map((e) => e.id)).toEqual([b, a]);
  });
});
