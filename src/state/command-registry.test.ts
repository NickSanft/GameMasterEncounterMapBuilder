import { describe, it, expect, vi } from 'vitest';
import { createCommandRegistry, type Command } from './command-registry.js';

function cmd(id: string, label: string, extra: Partial<Command> = {}): Command {
  return { id, label, run: vi.fn(), ...extra };
}

describe('createCommandRegistry', () => {
  it('starts empty', () => {
    const r = createCommandRegistry();
    expect(r.list()).toEqual([]);
  });

  it('register() preserves registration order', () => {
    const r = createCommandRegistry();
    r.register(cmd('a', 'Alpha'));
    r.register(cmd('b', 'Bravo'));
    r.register(cmd('c', 'Charlie'));
    expect(r.list().map((c) => c.id)).toEqual(['a', 'b', 'c']);
  });

  it('register() with the same id replaces the existing command in place', () => {
    const r = createCommandRegistry();
    r.register(cmd('a', 'Alpha'));
    r.register(cmd('b', 'Bravo'));
    r.register(cmd('a', 'Apple')); // replaces id 'a'
    const list = r.list();
    expect(list.map((c) => c.label)).toEqual(['Apple', 'Bravo']);
    expect(list.length).toBe(2);
  });

  it('unregister() removes by id; missing id is a no-op', () => {
    const r = createCommandRegistry();
    r.register(cmd('a', 'Alpha'));
    r.register(cmd('b', 'Bravo'));
    r.unregister('a');
    expect(r.list().map((c) => c.id)).toEqual(['b']);
    r.unregister('ghost'); // no-op
    expect(r.list().map((c) => c.id)).toEqual(['b']);
  });

  it('clear() forgets every command', () => {
    const r = createCommandRegistry();
    r.register(cmd('a', 'Alpha'));
    r.register(cmd('b', 'Bravo'));
    r.clear();
    expect(r.list()).toEqual([]);
  });
});

describe('match', () => {
  function setup() {
    const r = createCommandRegistry();
    r.register(cmd('select', 'Switch to Select tool', { hint: 'S' }));
    r.register(cmd('token', 'Switch to Token tool', { hint: 'T' }));
    r.register(cmd('reveal', 'Reveal a 5×5 area', { hint: 'fog' }));
    r.register(cmd('settings', 'Open Settings'));
    r.register(cmd('combat-log', 'Open Combat Log'));
    return r;
  }

  it('returns every command (in registration order) for an empty query', () => {
    const r = setup();
    const ids = r.match('').map((m) => m.command.id);
    expect(ids).toEqual(['select', 'token', 'reveal', 'settings', 'combat-log']);
  });

  it('treats whitespace-only query as empty', () => {
    const r = setup();
    expect(r.match('   ').length).toBe(5);
  });

  it('case-insensitive substring filter on label', () => {
    const r = setup();
    expect(r.match('select').map((m) => m.command.id)).toEqual(['select']);
    expect(r.match('SELECT').map((m) => m.command.id)).toEqual(['select']);
    expect(r.match('reveal').map((m) => m.command.id)).toEqual(['reveal']);
  });

  it('label prefix outranks word-boundary outranks substring', () => {
    const r = createCommandRegistry();
    r.register(cmd('a', 'Settings panel'));     // prefix on "settings"
    r.register(cmd('b', 'Open Settings'));      // word-boundary on "settings"
    r.register(cmd('c', 'Re-set settings now')); // word-boundary on "settings"
    r.register(cmd('d', 'Resettings indeed'));  // pure substring (no boundary)
    const order = r.match('settings').map((m) => m.command.id);
    // Prefix first, then the two word-boundary entries (registration
    // order tiebreak), then the substring.
    expect(order[0]).toBe('a');
    expect(order.slice(1, 3).sort()).toEqual(['b', 'c']);
    expect(order[3]).toBe('d');
  });

  it('matches against the hint too (substring rank)', () => {
    const r = setup();
    // "fog" is in the hint of `reveal`, not its label.
    const ids = r.match('fog').map((m) => m.command.id);
    expect(ids).toEqual(['reveal']);
  });

  it('returns multiple matches sorted by rank then position', () => {
    const r = createCommandRegistry();
    r.register(cmd('a', 'Open Combat Log')); // word-boundary on "open"
    r.register(cmd('b', 'Open Settings'));   // word-boundary on "open"
    r.register(cmd('c', 'Reopen modal'));    // substring on "open"
    const ids = r.match('open').map((m) => m.command.id);
    expect(ids[0]).toBe('a'); // prefix on "Open"
    expect(ids[1]).toBe('b'); // also prefix
    expect(ids[2]).toBe('c'); // substring
  });

  it('non-matching query returns empty', () => {
    const r = setup();
    expect(r.match('xyzzy')).toEqual([]);
  });

  it('match() preserves the command object reference (not a copy)', () => {
    const r = createCommandRegistry();
    const c = cmd('a', 'Alpha');
    r.register(c);
    expect(r.match('alpha')[0]!.command).toBe(c);
  });
});
