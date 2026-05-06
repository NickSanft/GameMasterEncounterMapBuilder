/**
 * Phase 152 — what's-new helper tests.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseVersion,
  isNewer,
  shouldShowWhatsNew,
  markCurrentVersionSeen,
  getLastSeenVersion,
  loadWhatsNewEntries,
} from './whats-new.js';
import {
  APP_VERSION,
  WHATS_NEW_LAST_SEEN_KEY,
} from '../util/constants.js';

beforeEach(() => {
  try {
    localStorage.removeItem(WHATS_NEW_LAST_SEEN_KEY);
  } catch {
    /* ignored */
  }
});

describe('parseVersion (Phase 152)', () => {
  it('parses standard X.Y.Z strings', () => {
    expect(parseVersion('1.27.0')).toEqual([1, 27, 0]);
    expect(parseVersion('0.0.0')).toEqual([0, 0, 0]);
    expect(parseVersion('10.20.30')).toEqual([10, 20, 30]);
  });

  it('returns [0,0,0] for malformed input (defensive)', () => {
    expect(parseVersion('')).toEqual([0, 0, 0]);
    expect(parseVersion('1.2')).toEqual([0, 0, 0]);
    expect(parseVersion('v1.2.3')).toEqual([0, 0, 0]);
    expect(parseVersion('not-a-version')).toEqual([0, 0, 0]);
  });
});

describe('isNewer (Phase 152)', () => {
  it('compares major versions numerically', () => {
    expect(isNewer('2.0.0', '1.99.99')).toBe(true);
    expect(isNewer('1.0.0', '2.0.0')).toBe(false);
  });

  it('compares minor versions correctly past 9 (the lexicographic trap)', () => {
    // "1.10.0" > "1.2.0" — a lexicographic compare would say false.
    expect(isNewer('1.10.0', '1.2.0')).toBe(true);
    expect(isNewer('1.2.0', '1.10.0')).toBe(false);
  });

  it('compares patch versions when major + minor match', () => {
    expect(isNewer('1.2.5', '1.2.3')).toBe(true);
    expect(isNewer('1.2.3', '1.2.5')).toBe(false);
  });

  it('returns false for equal versions', () => {
    expect(isNewer('1.2.3', '1.2.3')).toBe(false);
  });
});

describe('shouldShowWhatsNew (Phase 152)', () => {
  it('returns false when last-seen is empty (fresh install — onboarding tour handles first launch)', () => {
    expect(shouldShowWhatsNew()).toBe(false);
  });

  it('returns true when last-seen is older than the current APP_VERSION', () => {
    localStorage.setItem(WHATS_NEW_LAST_SEEN_KEY, '1.0.0');
    expect(shouldShowWhatsNew()).toBe(true);
  });

  it('returns false when last-seen matches the current APP_VERSION', () => {
    localStorage.setItem(WHATS_NEW_LAST_SEEN_KEY, APP_VERSION);
    expect(shouldShowWhatsNew()).toBe(false);
  });

  it('returns false when last-seen is somehow newer (defensive against downgrade)', () => {
    localStorage.setItem(WHATS_NEW_LAST_SEEN_KEY, '99.99.99');
    expect(shouldShowWhatsNew()).toBe(false);
  });
});

describe('markCurrentVersionSeen / getLastSeenVersion (Phase 152)', () => {
  it('persists APP_VERSION', () => {
    markCurrentVersionSeen();
    expect(getLastSeenVersion()).toBe(APP_VERSION);
  });

  it('after marking, shouldShowWhatsNew returns false', () => {
    localStorage.setItem(WHATS_NEW_LAST_SEEN_KEY, '1.0.0');
    expect(shouldShowWhatsNew()).toBe(true);
    markCurrentVersionSeen();
    expect(shouldShowWhatsNew()).toBe(false);
  });
});

describe('loadWhatsNewEntries (Phase 152 / 173)', () => {
  it('includes the current APP_VERSION as the first entry', async () => {
    const entries = await loadWhatsNewEntries();
    expect(entries[0]?.version).toBe(APP_VERSION);
  });

  it('every entry has a version + date + at least one highlight', async () => {
    const entries = await loadWhatsNewEntries();
    for (const entry of entries) {
      expect(entry.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(entry.highlights.length).toBeGreaterThan(0);
    }
  });
});
