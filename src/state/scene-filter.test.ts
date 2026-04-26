/**
 * Phase 106 — scene filter tests.
 *
 * Pure module — exercise `filterScenes` with synthetic lists and
 * confirm the prefix > word-boundary > substring ranking + the
 * empty-query passthrough behavior.
 */
import { describe, it, expect } from 'vitest';
import { filterScenes } from './scene-filter.js';

const s = (id: string, name: string) => ({ id, name });

describe('filterScenes: empty / whitespace query', () => {
  it('returns the full list unchanged when query is empty', () => {
    const list = [s('a', 'Throne'), s('b', 'Tavern')];
    expect(filterScenes(list, '').map((x) => x.id)).toEqual(['a', 'b']);
  });

  it('returns the full list unchanged when query is just whitespace', () => {
    const list = [s('a', 'Throne'), s('b', 'Tavern')];
    expect(filterScenes(list, '   ').map((x) => x.id)).toEqual(['a', 'b']);
  });

  it('returns a fresh array (not the input reference)', () => {
    const list = [s('a', 'Throne')];
    const out = filterScenes(list, '');
    expect(out).not.toBe(list);
    expect(out).toEqual(list);
  });
});

describe('filterScenes: ranking', () => {
  it('prefix matches outrank word-boundary matches', () => {
    const list = [
      s('a', 'Roadside Ditch'),
      s('b', 'Ditch the body'),
    ];
    expect(filterScenes(list, 'ditch').map((x) => x.id)).toEqual(['b', 'a']);
  });

  it('word-boundary matches outrank substring matches', () => {
    const list = [
      s('a', 'Aswitch'), // 'switch' is a plain substring (no boundary)
      s('b', 'A switch'), // 'switch' follows a space — word boundary
    ];
    expect(filterScenes(list, 'switch').map((x) => x.id)).toEqual(['b', 'a']);
  });

  it('within a rank, preserves input ordering', () => {
    const list = [
      s('a', 'Throne Room'),
      s('b', 'Throne Hall'),
      s('c', 'Throne Antechamber'),
    ];
    expect(filterScenes(list, 'throne').map((x) => x.id)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('drops scenes with no match at all', () => {
    const list = [
      s('a', 'Tavern'),
      s('b', 'Throne Room'),
      s('c', 'Forest Glade'),
    ];
    expect(filterScenes(list, 'roo').map((x) => x.id)).toEqual(['b']);
  });

  it('case-insensitive (uppercase query, mixed-case names)', () => {
    const list = [
      s('a', 'Throne Room'),
      s('b', 'TAVERN'),
    ];
    expect(filterScenes(list, 'THR').map((x) => x.id)).toEqual(['a']);
    expect(filterScenes(list, 'tav').map((x) => x.id)).toEqual(['b']);
  });
});

describe('filterScenes: edge cases', () => {
  it('returns empty array when nothing matches', () => {
    const list = [s('a', 'Throne'), s('b', 'Tavern')];
    expect(filterScenes(list, 'xyzzy')).toEqual([]);
  });

  it('returns empty array when input list is empty', () => {
    expect(filterScenes([], 'anything')).toEqual([]);
  });

  it('treats the query as a literal substring, not a regex', () => {
    const list = [s('a', 'Tavern .* Room')];
    // The literal ".*" should match; treating as regex would also match
    // but we'd want anything anywhere to match — this proves we do
    // substring not regex.
    expect(filterScenes(list, '.*').map((x) => x.id)).toEqual(['a']);
    expect(filterScenes(list, '[a-z]')).toEqual([]); // literal — no match
  });

  it('respects the trim — leading/trailing whitespace in query is ignored', () => {
    const list = [s('a', 'Throne')];
    expect(filterScenes(list, '  thr  ').map((x) => x.id)).toEqual(['a']);
  });
});
