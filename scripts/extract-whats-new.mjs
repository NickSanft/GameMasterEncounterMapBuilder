#!/usr/bin/env node
/**
 * Phase 161 — extract `WHATS_NEW_ENTRIES` from `CHANGELOG.md`.
 *
 * Replaces the hand-maintained array in `src/state/whats-new.ts`
 * with a generated module derived from the canonical CHANGELOG. Run
 * via `npm run extract:whats-new` after appending a new release
 * entry; the script writes
 * `src/state/whats-new-entries.generated.ts`.
 *
 * Parsing rules:
 *   - Version-header line matches `^## [<version>] — <date> — <title>`
 *     (em-dash separators). The "Unreleased" entry is skipped.
 *   - The capture cuts off at `## [` (next entry) OR `---` (separator).
 *   - One highlight per release: the section title (text after the
 *     date em-dash). Future polish: also extract the first bullet of
 *     the "Added" section if a richer summary is wanted.
 *   - Limited to the most recent N entries (default 24) to keep the
 *     bundle small. The whats-new modal is intended for "since I
 *     last opened" context, not full history.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const CHANGELOG_PATH = resolve(ROOT, 'CHANGELOG.md');
const OUTPUT_PATH = resolve(
  ROOT,
  'src/state/whats-new-entries.generated.ts',
);

const MAX_ENTRIES = 24;

const VERSION_HEADER_RE =
  /^## \[(\d+\.\d+\.\d+)\] — (\d{4}-\d{2}-\d{2}) — (.+?)\s*$/;

/**
 * @typedef {Object} ParsedEntry
 * @property {string} version
 * @property {string} date    `YYYY-MM-DD`
 * @property {string} title   Section title (post-date em-dash text)
 */

/**
 * Parse the CHANGELOG into the most-recent-first list of entries.
 * Skips the `## [Unreleased]` header (which has no `- date —` segment
 * matching VERSION_HEADER_RE so it falls through naturally).
 *
 * @param {string} markdown
 * @returns {ParsedEntry[]}
 */
function parseChangelog(markdown) {
  /** @type {ParsedEntry[]} */
  const out = [];
  const lines = markdown.split(/\r?\n/);
  for (const line of lines) {
    const m = VERSION_HEADER_RE.exec(line);
    if (!m) continue;
    out.push({
      version: m[1],
      date: m[2],
      title: m[3].trim(),
    });
    if (out.length >= MAX_ENTRIES) break;
  }
  return out;
}

/**
 * Render the parsed entries as a generated TypeScript module. Output
 * MUST match the `WhatsNewEntry` shape exported by `whats-new.ts`.
 *
 * @param {ParsedEntry[]} entries
 * @returns {string}
 */
function renderModule(entries) {
  const records = entries
    .map((e) => {
      const escapedTitle = e.title.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      return `  {
    version: '${e.version}',
    date: '${e.date}',
    highlights: ['${escapedTitle}'],
  },`;
    })
    .join('\n');
  return `/**
 * Phase 161 — AUTO-GENERATED from CHANGELOG.md.
 * Do NOT edit by hand. Run \`npm run extract:whats-new\` to regenerate.
 *
 * Source: \`CHANGELOG.md\` version-header lines like
 * \`## [1.35.0] — 2026-05-05 — Wall-clipping for auras\`.
 *
 * Each entry's \`highlights\` array contains exactly one string —
 * the section-title text after the date em-dash. Multi-line richer
 * summaries can be added in a future phase by extending the
 * extractor.
 */

import type { WhatsNewEntry } from './whats-new.js';

export const GENERATED_WHATS_NEW_ENTRIES: readonly WhatsNewEntry[] = [
${records}
];
`;
}

async function main() {
  const md = await readFile(CHANGELOG_PATH, 'utf8');
  const entries = parseChangelog(md);
  if (entries.length === 0) {
    throw new Error(
      'No version headers parsed from CHANGELOG.md — did the format change?',
    );
  }
  const moduleText = renderModule(entries);
  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, moduleText, 'utf8');
  console.log(
    `[extract-whats-new] wrote ${entries.length} entries → ${OUTPUT_PATH}`,
  );
}

main().catch((err) => {
  console.error('[extract-whats-new] failed:', err);
  process.exitCode = 1;
});
