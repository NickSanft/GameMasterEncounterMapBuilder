import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createAnnouncer } from './announcer.js';

describe('createAnnouncer', () => {
  let announcer: ReturnType<typeof createAnnouncer>;

  beforeEach(() => {
    announcer = createAnnouncer();
  });

  afterEach(() => {
    announcer.destroy();
  });

  it('mounts two live regions with the correct aria attributes', () => {
    const polite = document.querySelector('[data-announcer="polite"]');
    const assertive = document.querySelector('[data-announcer="assertive"]');
    expect(polite).not.toBeNull();
    expect(assertive).not.toBeNull();
    expect(polite!.getAttribute('aria-live')).toBe('polite');
    expect(assertive!.getAttribute('aria-live')).toBe('assertive');
    expect(polite!.getAttribute('aria-atomic')).toBe('true');
    expect(polite!.getAttribute('role')).toBe('status');
  });

  it('routes polite announcements to the polite region by default', () => {
    announcer.announce('Tool: Select');
    expect(announcer.readCurrent('polite')).toBe('Tool: Select');
    expect(announcer.readCurrent('assertive')).toBe('');
  });

  it('routes assertive announcements to the assertive region', () => {
    announcer.announce('GM tab conflict detected', 'assertive');
    expect(announcer.readCurrent('assertive')).toBe('GM tab conflict detected');
    expect(announcer.readCurrent('polite')).toBe('');
  });

  it('forces repeats of identical text to register (toggles NBSP suffix)', () => {
    announcer.announce('Token placed');
    const polite = document.querySelector<HTMLElement>('[data-announcer="polite"]')!;
    const first = polite.textContent;
    announcer.announce('Token placed');
    const second = polite.textContent;
    // Raw textContent MUST differ so assistive tech picks the change up.
    expect(second).not.toBe(first);
    // But the logical message is still the same, after stripping the NBSP.
    expect(announcer.readCurrent('polite')).toBe('Token placed');
  });

  it('destroy() removes the regions from the DOM', () => {
    announcer.destroy();
    expect(document.querySelector('[data-announcer="polite"]')).toBeNull();
    expect(document.querySelector('[data-announcer="assertive"]')).toBeNull();
  });
});
