/**
 * Phase 137 — multi-token auto-numbering tests.
 */
import { describe, it, expect } from 'vitest';
import { nextLabelSuffix } from './token-numbering.js';

describe('nextLabelSuffix (Phase 137)', () => {
  it('returns the candidate unchanged when no existing token shares the base', () => {
    expect(nextLabelSuffix(['Goblin', 'Orc'], 'Bandit')).toBe('Bandit');
  });

  it('returns the candidate unchanged when no existing tokens at all', () => {
    expect(nextLabelSuffix([], 'Goblin')).toBe('Goblin');
  });

  it('suffixes "2" when the base exists once with no suffix', () => {
    expect(nextLabelSuffix(['Goblin'], 'Goblin')).toBe('Goblin 2');
  });

  it('suffixes max+1 when the base exists multiple times', () => {
    expect(nextLabelSuffix(['Goblin', 'Goblin 2'], 'Goblin')).toBe('Goblin 3');
    expect(
      nextLabelSuffix(['Goblin', 'Goblin 2', 'Goblin 3'], 'Goblin'),
    ).toBe('Goblin 4');
  });

  it('does not gap-fill — picks max+1 even when intermediate suffixes are missing', () => {
    expect(nextLabelSuffix(['Goblin', 'Goblin 5'], 'Goblin')).toBe('Goblin 6');
  });

  it('treats the candidate label\'s own suffix as irrelevant — uses max+1 anyway', () => {
    // Dropping "Goblin 3" when "Goblin", "Goblin 5" exist → "Goblin 6"
    // (not "Goblin 4" — we ignore the candidate's own suffix and just
    // pick the next free integer above the existing max).
    expect(nextLabelSuffix(['Goblin', 'Goblin 5'], 'Goblin 3')).toBe(
      'Goblin 6',
    );
  });

  it('is case-insensitive when matching bases', () => {
    expect(nextLabelSuffix(['GOBLIN', 'goblin 4'], 'Goblin')).toBe('Goblin 5');
  });

  it('preserves the candidate\'s case in the output base', () => {
    expect(nextLabelSuffix(['goblin'], 'Goblin')).toBe('Goblin 2');
    expect(nextLabelSuffix(['Goblin'], 'goblin')).toBe('goblin 2');
  });

  it('preserves multi-word bases', () => {
    expect(
      nextLabelSuffix(['Cave Goblin', 'Cave Goblin 4'], 'Cave Goblin'),
    ).toBe('Cave Goblin 5');
  });

  it('treats non-integer trailing words as part of the base', () => {
    // "Goblin 1.5" has no integer suffix (the regex requires a pure
    // \d+); the whole string is the base.
    expect(nextLabelSuffix(['Goblin 1.5'], 'Goblin 1.5')).toBe('Goblin 1.5 2');
  });

  it('ignores tokens whose base is a strict prefix but not a suffix-stripped match', () => {
    // "GoblinChief" does not match base "Goblin" (no whitespace
    // separator before the integer).
    expect(nextLabelSuffix(['GoblinChief'], 'Goblin')).toBe('Goblin');
  });

  it('handles a bare-base existing alongside a higher numbered one (bare = effective 1)', () => {
    expect(nextLabelSuffix(['Goblin', 'Goblin 2'], 'Goblin')).toBe('Goblin 3');
    // If only "Goblin 7" exists (no bare base), max is still 7 → next is 8.
    expect(nextLabelSuffix(['Goblin 7'], 'Goblin')).toBe('Goblin 8');
  });
});
