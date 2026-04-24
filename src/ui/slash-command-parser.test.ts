import { describe, it, expect } from 'vitest';
import { parseSlashCommand, unknownCommandMessage } from './slash-command-parser.js';

describe('parseSlashCommand — empty + bare expressions', () => {
  it('treats whitespace-only input as empty', () => {
    expect(parseSlashCommand('')).toEqual({ kind: 'empty' });
    expect(parseSlashCommand('   ')).toEqual({ kind: 'empty' });
  });

  it('treats a bare expression (no leading slash) as a roll', () => {
    expect(parseSlashCommand('1d20+5')).toEqual({
      kind: 'roll',
      expression: '1d20+5',
    });
  });

  it('treats /  (slash + nothing) as empty', () => {
    expect(parseSlashCommand('/')).toEqual({ kind: 'empty' });
    expect(parseSlashCommand('/   ')).toEqual({ kind: 'empty' });
  });
});

describe('parseSlashCommand — /r and /roll', () => {
  it('parses /r <expr> as a roll', () => {
    expect(parseSlashCommand('/r 1d20+5')).toEqual({
      kind: 'roll',
      expression: '1d20+5',
    });
  });

  it('accepts /roll as the long form', () => {
    expect(parseSlashCommand('/roll 4d6kh3')).toEqual({
      kind: 'roll',
      expression: '4d6kh3',
    });
  });

  it('is case-insensitive on the command', () => {
    expect(parseSlashCommand('/R 1d20')).toEqual({
      kind: 'roll',
      expression: '1d20',
    });
    expect(parseSlashCommand('/Roll 1d6')).toEqual({
      kind: 'roll',
      expression: '1d6',
    });
  });

  it('returns unknown when /r has no expression payload', () => {
    expect(parseSlashCommand('/r')).toEqual({ kind: 'unknown', raw: '/r' });
    // Trailing whitespace gets trimmed when looking at the payload.
    expect(parseSlashCommand('/r   ')).toEqual({ kind: 'unknown', raw: '/r' });
  });
});

describe('parseSlashCommand — /init / /initiative', () => {
  it('parses /init as the init action', () => {
    expect(parseSlashCommand('/init')).toEqual({ kind: 'init' });
  });

  it('accepts the long form /initiative', () => {
    expect(parseSlashCommand('/initiative')).toEqual({ kind: 'init' });
  });

  it('ignores trailing payload (extra args are no-ops, not errors)', () => {
    expect(parseSlashCommand('/init now please')).toEqual({ kind: 'init' });
  });
});

describe('parseSlashCommand — /help', () => {
  it('parses /help as the help action', () => {
    expect(parseSlashCommand('/help')).toEqual({ kind: 'help' });
  });

  it('accepts /? as a synonym (matches the existing ? hotkey)', () => {
    expect(parseSlashCommand('/?')).toEqual({ kind: 'help' });
  });
});

describe('parseSlashCommand — quick-die /dN shortcuts', () => {
  it('expands /d20 → 1d20', () => {
    expect(parseSlashCommand('/d20')).toEqual({
      kind: 'roll',
      expression: '1d20',
    });
  });

  it('expands /d6 → 1d6', () => {
    expect(parseSlashCommand('/d6')).toEqual({
      kind: 'roll',
      expression: '1d6',
    });
  });

  it('preserves an inline modifier: /d20+5 → 1d20+5', () => {
    expect(parseSlashCommand('/d20+5')).toEqual({
      kind: 'roll',
      expression: '1d20+5',
    });
  });

  it('preserves a negative inline modifier: /d20-2 → 1d20-2', () => {
    expect(parseSlashCommand('/d20-2')).toEqual({
      kind: 'roll',
      expression: '1d20-2',
    });
  });

  it('accepts a space-separated modifier: /d20 +5 → 1d20 +5', () => {
    // The dice parser handles internal whitespace fine.
    expect(parseSlashCommand('/d20 +5')).toEqual({
      kind: 'roll',
      expression: '1d20 +5',
    });
  });

  it('handles /d100 (zero-padded face renders elsewhere)', () => {
    expect(parseSlashCommand('/d100')).toEqual({
      kind: 'roll',
      expression: '1d100',
    });
  });

  it('rejects /d0 (out of range)', () => {
    expect(parseSlashCommand('/d0')).toEqual({
      kind: 'unknown',
      raw: '/d0',
    });
  });

  it('rejects /d99999 (out of range — caps at 9999 to match the parser)', () => {
    expect(parseSlashCommand('/d99999')).toEqual({
      kind: 'unknown',
      raw: '/d99999',
    });
  });

  it('rejects /d (no number)', () => {
    expect(parseSlashCommand('/d')).toEqual({ kind: 'unknown', raw: '/d' });
  });

  it('is case-insensitive: /D20 also works', () => {
    expect(parseSlashCommand('/D20')).toEqual({
      kind: 'roll',
      expression: '1d20',
    });
  });
});

describe('parseSlashCommand — unknown commands', () => {
  it('returns unknown for an unrecognized slash command', () => {
    expect(parseSlashCommand('/foo')).toEqual({
      kind: 'unknown',
      raw: '/foo',
    });
  });

  it('returns unknown for a typo that looks like a die', () => {
    expect(parseSlashCommand('/dee20')).toEqual({
      kind: 'unknown',
      raw: '/dee20',
    });
  });
});

describe('unknownCommandMessage', () => {
  it('mentions the offending input', () => {
    expect(unknownCommandMessage('/foo')).toContain('/foo');
  });

  it('suggests valid alternatives', () => {
    const msg = unknownCommandMessage('/foo');
    expect(msg).toMatch(/\/r/);
    expect(msg).toMatch(/\/d20/);
    expect(msg).toMatch(/\/init/);
  });
});
