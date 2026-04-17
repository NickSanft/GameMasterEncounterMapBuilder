import { describe, it, expect } from 'vitest';
import { nid } from './id.js';

describe('nid', () => {
  it('returns a non-empty string', () => {
    const id = nid();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('produces different values on consecutive calls', () => {
    const a = nid();
    const b = nid();
    expect(a).not.toBe(b);
  });

  it('has no collisions across many calls', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 10_000; i++) ids.add(nid());
    expect(ids.size).toBe(10_000);
  });
});
