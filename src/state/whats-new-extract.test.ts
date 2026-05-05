/**
 * Phase 161 — verify the generated whats-new entries match what the
 * extractor would produce from the current CHANGELOG.md.
 *
 * The extractor lives in `scripts/extract-whats-new.mjs` and writes
 * `src/state/whats-new-entries.generated.ts`. This test re-parses
 * the CHANGELOG inline and asserts the generated file's `version`
 * + `date` + `highlights[0]` columns match. If a developer adds a
 * new release entry to CHANGELOG.md without re-running
 * `npm run extract:whats-new`, this test fails at CI time so the
 * out-of-sync state never reaches main.
 *
 * The parser logic here is intentionally an independent
 * re-implementation of the script's regex — keeping them in lock-
 * step is part of what the test enforces.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GENERATED_WHATS_NEW_ENTRIES } from './whats-new-entries.generated.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const CHANGELOG_PATH = resolve(HERE, '../../CHANGELOG.md');
const VERSION_HEADER_RE =
  /^## \[(\d+\.\d+\.\d+)\] — (\d{4}-\d{2}-\d{2}) — (.+?)\s*$/;
const MAX_ENTRIES = 24;

interface Parsed {
  version: string;
  date: string;
  title: string;
}

function parseChangelog(): Parsed[] {
  const md = readFileSync(CHANGELOG_PATH, 'utf8');
  const out: Parsed[] = [];
  for (const line of md.split(/\r?\n/)) {
    const m = VERSION_HEADER_RE.exec(line);
    if (!m) continue;
    out.push({ version: m[1]!, date: m[2]!, title: m[3]!.trim() });
    if (out.length >= MAX_ENTRIES) break;
  }
  return out;
}

describe('Phase 161 — generated whats-new entries stay in sync with CHANGELOG.md', () => {
  const parsed = parseChangelog();

  it('parses at least one release entry from CHANGELOG.md (sanity)', () => {
    expect(parsed.length).toBeGreaterThan(0);
  });

  it('generated entries match the parsed CHANGELOG line-for-line', () => {
    expect(GENERATED_WHATS_NEW_ENTRIES.length).toBe(parsed.length);
    for (let i = 0; i < parsed.length; i++) {
      const p = parsed[i]!;
      const g = GENERATED_WHATS_NEW_ENTRIES[i]!;
      expect(g.version).toBe(p.version);
      expect(g.date).toBe(p.date);
      expect(g.highlights).toHaveLength(1);
      expect(g.highlights[0]).toBe(p.title);
    }
  });

  it('newest entry comes first', () => {
    if (GENERATED_WHATS_NEW_ENTRIES.length < 2) return;
    const first = GENERATED_WHATS_NEW_ENTRIES[0]!;
    const second = GENERATED_WHATS_NEW_ENTRIES[1]!;
    // Compare versions numerically (the parseVersion helper uses the
    // same comparison the runtime modal uses).
    const cmp = compareVersion(first.version, second.version);
    expect(cmp).toBeGreaterThan(0);
  });
});

function compareVersion(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) return da - db;
  }
  return 0;
}
