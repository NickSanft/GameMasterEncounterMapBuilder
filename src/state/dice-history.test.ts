/**
 * Phase 107 — dice expression history tests.
 *
 * Pure helper + localStorage-backed; the test setup wipes
 * localStorage between cases so each test starts clean.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordExpression,
  listHistory,
  MAX_HISTORY,
  _resetAll,
} from './dice-history.js';

beforeEach(() => {
  _resetAll();
});

describe('dice-history: record + list', () => {
  it('starts empty', () => {
    expect(listHistory()).toEqual([]);
  });

  it('records a single expression', () => {
    recordExpression('1d20+5');
    expect(listHistory()).toEqual(['1d20+5']);
  });

  it('orders newest-first', () => {
    recordExpression('a');
    recordExpression('b');
    recordExpression('c');
    expect(listHistory()).toEqual(['c', 'b', 'a']);
  });

  it('returns a fresh array (caller mutations do not affect the store)', () => {
    recordExpression('1d20');
    const list = listHistory();
    list.push('mutate');
    expect(listHistory()).toEqual(['1d20']);
  });
});

describe('dice-history: deduplication', () => {
  it('moves an existing entry to the front instead of duplicating', () => {
    recordExpression('1d20+5');
    recordExpression('2d6');
    recordExpression('1d20+5');
    // 1d20+5 was the oldest; re-rolling it bumps it to the front.
    expect(listHistory()).toEqual(['1d20+5', '2d6']);
  });

  it('exact-match dedupe preserves whitespace-trimmed comparison', () => {
    recordExpression('1d20+5');
    recordExpression('  1d20+5  '); // trim-equal to the first
    expect(listHistory()).toEqual(['1d20+5']);
  });

  it('different expressions are not deduped', () => {
    recordExpression('1d20');
    recordExpression('1d20+5');
    expect(listHistory()).toEqual(['1d20+5', '1d20']);
  });
});

describe('dice-history: cap eviction', () => {
  it('caps at MAX_HISTORY entries (oldest evicted)', () => {
    for (let i = 0; i < MAX_HISTORY + 5; i++) {
      recordExpression(`expr-${i}`);
    }
    const list = listHistory();
    expect(list).toHaveLength(MAX_HISTORY);
    // Newest is the last expr; oldest kept is expr-5 (5 evicted).
    expect(list[0]).toBe(`expr-${MAX_HISTORY + 4}`);
    expect(list[list.length - 1]).toBe('expr-5');
  });
});

describe('dice-history: trim + edge cases', () => {
  it('trims whitespace before storing', () => {
    recordExpression('  1d20+5  ');
    expect(listHistory()).toEqual(['1d20+5']);
  });

  it('ignores empty / whitespace-only inputs', () => {
    recordExpression('');
    recordExpression('   ');
    expect(listHistory()).toEqual([]);
  });
});

describe('dice-history: defensive parsing', () => {
  it('returns empty when localStorage holds malformed JSON', () => {
    localStorage.setItem('gm-encounter-maps-dice-history', '{not json');
    expect(listHistory()).toEqual([]);
  });

  it('returns empty when version mismatch', () => {
    localStorage.setItem(
      'gm-encounter-maps-dice-history',
      JSON.stringify({ version: 999, entries: ['1d20'] }),
    );
    expect(listHistory()).toEqual([]);
  });

  it('drops non-string entries inside an otherwise-valid blob', () => {
    localStorage.setItem(
      'gm-encounter-maps-dice-history',
      JSON.stringify({
        version: 1,
        entries: ['valid', 42, null, '', 'also-valid'],
      }),
    );
    expect(listHistory()).toEqual(['valid', 'also-valid']);
  });
});
