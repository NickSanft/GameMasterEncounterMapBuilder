#!/usr/bin/env node
/**
 * Build-time guard against accidental null bytes (`\0`) in source files.
 *
 * Why this exists: in 0.61.1 a stray PowerShell `>>` redirect on
 * Windows wrote two null bytes to `src/ui/styles.css` (PowerShell 5.1's
 * default Out-File encoding is UTF-16, which renders ASCII content as
 * alternating `byte` + `\0`). Vite's CSS bundler tolerated the file
 * but warned `Expected "{" but found end of file` and silently
 * truncated the bundled stylesheet. Symptom in CI: many e2e tests
 * timed out because page styles + layout were broken in subtle ways.
 *
 * This script scans every tracked source file under `src/`, `e2e/`,
 * `public/`, and the project root config files for null bytes and
 * fails the build if any are present. Cheap (a few hundred file
 * stats + reads), and the failure message names the offending file.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SCAN_ROOTS = ['src', 'e2e', 'public'];
const ROOT_FILES = [
  'package.json',
  'package-lock.json',
  'playwright.config.ts',
  'vite.config.ts',
  'tsconfig.json',
];

function collectFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectFiles(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

const files = [
  ...SCAN_ROOTS.flatMap((d) => collectFiles(path.join(ROOT, d))),
  ...ROOT_FILES.map((f) => path.join(ROOT, f)).filter(fs.existsSync),
];

const offenders = [];
for (const file of files) {
  // Skip binaries we know contain non-text data (PNG baselines, etc.)
  if (/\.(png|jpe?g|gif|webp|svg|ico|woff2?|ttf|otf|zip)$/i.test(file)) continue;
  const buf = fs.readFileSync(file);
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] === 0) {
      offenders.push({ file: path.relative(ROOT, file), offset: i });
      break;
    }
  }
}

if (offenders.length > 0) {
  console.error('\n[check-no-null-bytes] Found null bytes in source files:');
  for (const { file, offset } of offenders) {
    console.error(`  - ${file} (first null at byte ${offset})`);
  }
  console.error(
    '\nThis usually happens when a Windows PowerShell `>>` redirect writes UTF-16',
  );
  console.error(
    'instead of UTF-8. Re-save the file as UTF-8, or strip the trailing junk via',
  );
  console.error(
    'a Node script. Vite will silently truncate CSS files containing null bytes,',
  );
  console.error('which has caused real e2e failures.');
  process.exit(1);
}

console.log(`[check-no-null-bytes] Scanned ${files.length} files — clean.`);
