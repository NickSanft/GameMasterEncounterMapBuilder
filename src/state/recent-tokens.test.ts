/**
 * Phase 148 — recent-tokens helper tests.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordTokenUse,
  listRecentTokens,
  removeRecentToken,
  templateOf,
  subscribeRecentTokens,
  _resetRecentTokens,
  MAX_RECENT_TOKENS,
} from './recent-tokens.js';

const BASE = {
  label: 'Goblin',
  color: '#7e57c2',
  imageId: null,
  size: 1,
  borderColor: null,
};

beforeEach(() => {
  _resetRecentTokens();
});

describe('templateOf (Phase 148)', () => {
  it('produces stable strings for matching template fields', () => {
    expect(templateOf(BASE)).toBe(templateOf(BASE));
  });

  it('differs across labels', () => {
    expect(templateOf({ ...BASE, label: 'Orc' })).not.toBe(templateOf(BASE));
  });

  it('differs across imageIds', () => {
    expect(templateOf({ ...BASE, imageId: 'img-1' })).not.toBe(
      templateOf(BASE),
    );
  });

  it('treats null vs empty-string borderColor differently is fine — both stringify as ""', () => {
    // Both null and '' coerce to '' in the join; that's intentional —
    // they're functionally equivalent for the recent-tokens dedupe.
    expect(templateOf({ ...BASE, borderColor: null })).toBe(
      templateOf({ ...BASE, borderColor: '' }),
    );
  });
});

describe('recordTokenUse + listRecentTokens (Phase 148)', () => {
  it('starts with no entries', () => {
    expect(listRecentTokens()).toEqual([]);
  });

  it('records a single use', () => {
    recordTokenUse(BASE);
    expect(listRecentTokens().length).toBe(1);
    expect(listRecentTokens()[0]!.label).toBe('Goblin');
  });

  it('moves a re-used template to the front (dedupe + bump)', () => {
    recordTokenUse(BASE, 1000);
    recordTokenUse({ ...BASE, label: 'Orc' }, 2000);
    recordTokenUse(BASE, 3000);
    const list = listRecentTokens();
    expect(list.length).toBe(2);
    expect(list[0]!.label).toBe('Goblin');
    expect(list[0]!.lastUsedAt).toBe(3000);
    expect(list[1]!.label).toBe('Orc');
  });

  it('caps at MAX_RECENT_TOKENS (=6)', () => {
    for (let i = 0; i < 10; i++) {
      recordTokenUse({ ...BASE, label: `Token ${i}` }, 1000 + i);
    }
    const list = listRecentTokens();
    expect(list.length).toBe(MAX_RECENT_TOKENS);
    // Most recent is "Token 9", oldest in the list is "Token 4"
    // (Tokens 0-3 evicted).
    expect(list[0]!.label).toBe('Token 9');
    expect(list[list.length - 1]!.label).toBe('Token 4');
  });

  it('separate template fields create separate entries', () => {
    recordTokenUse(BASE);
    recordTokenUse({ ...BASE, color: '#ff0000' });
    recordTokenUse({ ...BASE, size: 2 });
    expect(listRecentTokens().length).toBe(3);
  });
});

describe('removeRecentToken (Phase 148)', () => {
  it('removes the entry by templateId', () => {
    recordTokenUse(BASE);
    recordTokenUse({ ...BASE, label: 'Orc' });
    const list = listRecentTokens();
    const goblinId = list.find((e) => e.label === 'Goblin')!.templateId;
    removeRecentToken(goblinId);
    const after = listRecentTokens();
    expect(after.length).toBe(1);
    expect(after[0]!.label).toBe('Orc');
  });

  it('is a silent no-op for unknown ids', () => {
    recordTokenUse(BASE);
    removeRecentToken('definitely-not-a-real-id');
    expect(listRecentTokens().length).toBe(1);
  });
});

describe('subscribeRecentTokens (Phase 148)', () => {
  it('notifies subscribers after every persist', () => {
    let calls = 0;
    const unsub = subscribeRecentTokens(() => calls++);
    recordTokenUse(BASE);
    expect(calls).toBe(1);
    recordTokenUse({ ...BASE, label: 'Orc' });
    expect(calls).toBe(2);
    removeRecentToken(templateOf(BASE));
    expect(calls).toBe(3);
    unsub();
    recordTokenUse({ ...BASE, label: 'Bandit' });
    expect(calls).toBe(3); // Unsub respected.
  });
});
