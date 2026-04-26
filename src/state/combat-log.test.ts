import { describe, it, expect, vi } from 'vitest';
import {
  createCombatLog,
  formatLogEvent,
  formatClock,
  type CombatLogEvent,
} from './combat-log.js';

describe('createCombatLog', () => {
  it('starts empty', () => {
    const log = createCombatLog();
    expect(log.size()).toBe(0);
    expect(log.entries()).toEqual([]);
  });

  it('add() appends + records the timestamp from the clock seam', () => {
    let nowMs = 1000;
    const log = createCombatLog({ now: () => nowMs });
    log.add({
      kind: 'damage',
      tokenId: 't',
      tokenLabel: 'Goblin',
      amount: 3,
    });
    expect(log.size()).toBe(1);
    expect(log.entries()[0]!.timestamp).toBe(1000);
    nowMs = 2000;
    log.add({
      kind: 'damage',
      tokenId: 't',
      tokenLabel: 'Goblin',
      amount: 5,
    });
    expect(log.entries()[1]!.timestamp).toBe(2000);
  });

  it('evicts the oldest entry once over maxEntries (FIFO ring buffer)', () => {
    const log = createCombatLog({ maxEntries: 3 });
    for (const c of ['A', 'B', 'C', 'D']) {
      log.add({
        kind: 'condition-added',
        tokenId: 't',
        tokenLabel: c,
        condition: 'Poisoned',
      });
    }
    expect(log.size()).toBe(3);
    expect(
      log.entries().map((e) => (e.event as { tokenLabel: string }).tokenLabel),
    ).toEqual(['B', 'C', 'D']);
  });

  it('clear() empties the buffer + notifies subscribers', () => {
    const log = createCombatLog();
    const listener = vi.fn();
    log.subscribe(listener);
    log.add({ kind: 'turn', round: 1, tokenId: 't', tokenLabel: 'G' });
    expect(listener).toHaveBeenCalledTimes(1);
    log.clear();
    expect(log.size()).toBe(0);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('clear() on an empty log is a no-op (no notify)', () => {
    const log = createCombatLog();
    const listener = vi.fn();
    log.subscribe(listener);
    log.clear();
    expect(listener).not.toHaveBeenCalled();
  });

  it('subscribe returns an unsubscribe fn', () => {
    const log = createCombatLog();
    const listener = vi.fn();
    const off = log.subscribe(listener);
    log.add({ kind: 'turn', round: 1, tokenId: 't', tokenLabel: 'G' });
    expect(listener).toHaveBeenCalledTimes(1);
    off();
    log.add({ kind: 'turn', round: 2, tokenId: 't', tokenLabel: 'G' });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('entries() returns a copy (caller mutation does not affect storage)', () => {
    const log = createCombatLog();
    log.add({ kind: 'turn', round: 1, tokenId: 't', tokenLabel: 'G' });
    const out = log.entries();
    out.length = 0;
    expect(log.size()).toBe(1);
  });

  it('exportText() formats one line per entry, oldest first', () => {
    const log = createCombatLog({ now: () => 1672531200000 }); // 2023-01-01 00:00:00 UTC
    log.add({ kind: 'turn', round: 1, tokenId: 't', tokenLabel: 'Goblin' });
    log.add({ kind: 'damage', tokenId: 't', tokenLabel: 'Goblin', amount: 3 });
    const text = log.exportText();
    const lines = text.split('\n');
    expect(lines).toHaveLength(2);
    // Both lines start with [HH:MM:SS] (locale-dependent timezone).
    expect(lines[0]).toMatch(/^\[\d{2}:\d{2}:\d{2}\] Round 1 — Goblin's turn$/);
    expect(lines[1]).toMatch(/^\[\d{2}:\d{2}:\d{2}\] Goblin took 3 damage$/);
  });
});

describe('formatLogEvent', () => {
  it('formats damage with HP context', () => {
    const e: CombatLogEvent = {
      kind: 'damage',
      tokenId: 't',
      tokenLabel: 'Goblin',
      amount: 7,
      hpAfter: { current: 3, max: 10 },
    };
    expect(formatLogEvent(e)).toBe('Goblin took 7 damage (3/10 HP)');
  });

  it('formats heal as positive amount in the message', () => {
    const e: CombatLogEvent = {
      kind: 'damage',
      tokenId: 't',
      tokenLabel: 'Cleric',
      amount: -5,
      hpAfter: { current: 8, max: 12 },
    };
    expect(formatLogEvent(e)).toBe('Cleric healed 5 HP (8/12 HP)');
  });

  it('formats damage without HP context when omitted', () => {
    const e: CombatLogEvent = {
      kind: 'damage',
      tokenId: 't',
      tokenLabel: 'Bandit',
      amount: 3,
    };
    expect(formatLogEvent(e)).toBe('Bandit took 3 damage');
  });

  it('falls back to "Token" when label is empty', () => {
    const e: CombatLogEvent = {
      kind: 'damage',
      tokenId: 't',
      tokenLabel: '',
      amount: 3,
    };
    expect(formatLogEvent(e)).toBe('Token took 3 damage');
  });

  it('formats condition adds + removes', () => {
    expect(
      formatLogEvent({
        kind: 'condition-added',
        tokenId: 't',
        tokenLabel: 'Bandit',
        condition: 'Poisoned',
      }),
    ).toBe('Bandit gained Poisoned');
    expect(
      formatLogEvent({
        kind: 'condition-removed',
        tokenId: 't',
        tokenLabel: 'Bandit',
        condition: 'Stunned',
      }),
    ).toBe('Bandit lost Stunned');
  });

  it('formats death-save changes with current counts', () => {
    expect(
      formatLogEvent({
        kind: 'death-save',
        tokenId: 't',
        tokenLabel: 'Bard',
        change: 'failure',
        successes: 1,
        failures: 2,
      }),
    ).toBe('Bard death save failure (1/3 succ, 2/3 fail)');
    expect(
      formatLogEvent({
        kind: 'death-save',
        tokenId: 't',
        tokenLabel: 'Bard',
        change: 'success',
        successes: 2,
        failures: 1,
      }),
    ).toBe('Bard death save success (2/3 succ, 1/3 fail)');
    expect(
      formatLogEvent({
        kind: 'death-save',
        tokenId: 't',
        tokenLabel: 'Bard',
        change: 'stable',
        successes: 3,
        failures: 0,
      }),
    ).toBe('Bard stabilized (3/3 succ, 0/3 fail)');
    expect(
      formatLogEvent({
        kind: 'death-save',
        tokenId: 't',
        tokenLabel: 'Bard',
        change: 'dead',
        successes: 0,
        failures: 3,
      }),
    ).toBe('Bard died (0/3 succ, 3/3 fail)');
    expect(
      formatLogEvent({
        kind: 'death-save',
        tokenId: 't',
        tokenLabel: 'Bard',
        change: 'reset',
        successes: 0,
        failures: 0,
      }),
    ).toBe('Bard death-save tracker reset');
  });

  it('formats turn changes', () => {
    expect(
      formatLogEvent({
        kind: 'turn',
        round: 3,
        tokenId: 't',
        tokenLabel: 'Goblin',
      }),
    ).toBe("Round 3 — Goblin's turn");
  });

  it('formats turn changes with no token (label fallback)', () => {
    expect(
      formatLogEvent({
        kind: 'turn',
        round: 2,
        tokenId: null,
        tokenLabel: '',
      }),
    ).toBe("Round 2 — —'s turn");
  });
});

describe('formatClock', () => {
  it('renders HH:MM:SS in 24-hour format', () => {
    const t = new Date(2024, 0, 1, 9, 5, 7).getTime();
    expect(formatClock(t)).toBe('09:05:07');
  });

  it('returns "—" for non-finite or non-positive timestamps', () => {
    expect(formatClock(0)).toBe('—');
    expect(formatClock(NaN)).toBe('—');
    expect(formatClock(-1)).toBe('—');
  });
});
