#!/usr/bin/env node
/**
 * Phase 68 — visual-regression baseline auto-regen.
 *
 * One command to regenerate the platform-specific PNG baselines for
 * `e2e/visual-regression.spec.ts` on BOTH Windows + Linux. Used to
 * be a manual two-step that we hit several times during phases 55,
 * 59, and 61 (anytime layout drifted by even a few pixels CI went
 * red and we'd hand-roll the regen). This script bundles them.
 *
 *   npm run baselines               # all visual-regression specs
 *   npm run baselines -- --grep "settings"   # just the matching ones
 *
 * What it does:
 *   1. Local: `npx playwright test e2e/visual-regression.spec.ts
 *      --update-snapshots [--grep PATTERN]` — writes the
 *      `*-chromium-win32.png` files (or whatever the host platform
 *      prefix is — macOS would write `-darwin.png`).
 *   2. Linux (via Docker): same `playwright test --update-snapshots`
 *      run inside `mcr.microsoft.com/playwright:v1.59.1-jammy`,
 *      which mirrors the CI runner. Writes the `-chromium-linux.png`
 *      files. Uses a `/scratch` copy of the project inside the
 *      container so the host's Windows-specific node_modules
 *      (esbuild.exe / rollup native bins) don't clash.
 *
 * Both steps copy the resulting PNGs back into
 * `e2e/visual-regression.spec.ts-snapshots/` ready to commit.
 *
 * Skip the Linux step on a real Linux dev box (you ARE the Linux
 * baseline platform) by passing `--win-only` — useful for fast
 * local iteration before pushing.
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SPEC = 'e2e/visual-regression.spec.ts';
const DOCKER_IMAGE = 'mcr.microsoft.com/playwright:v1.59.1-jammy';

const args = process.argv.slice(2);
const winOnlyIdx = args.indexOf('--win-only');
const winOnly = winOnlyIdx !== -1;
if (winOnly) args.splice(winOnlyIdx, 1);

const linuxOnlyIdx = args.indexOf('--linux-only');
const linuxOnly = linuxOnlyIdx !== -1;
if (linuxOnly) args.splice(linuxOnlyIdx, 1);

const grepIdx = args.indexOf('--grep');
const grepArgs = grepIdx !== -1 ? ['--grep', args[grepIdx + 1]] : [];

const playwrightArgs = [
  'playwright',
  'test',
  SPEC,
  '--update-snapshots',
  '--reporter=line',
  ...grepArgs,
];

/**
 * `shell: true` joins argv with spaces and re-parses, so anything
 * with whitespace gets re-split — wrap each arg in double-quotes
 * (escaping any embedded `"`) so the shell sees one token per
 * intended arg. Required for `--grep "Multi word match"`.
 */
function quote(arg) {
  if (!/[\s"\\]/.test(arg)) return arg;
  return `"${arg.replace(/"/g, '\\"')}"`;
}

function run(cmd, argv, opts = {}) {
  const quoted = argv.map(quote);
  console.log(`\n$ ${cmd} ${quoted.join(' ')}`);
  const r = spawnSync(cmd, quoted, {
    stdio: 'inherit',
    shell: true,
    cwd: REPO_ROOT,
    ...opts,
  });
  if (r.status !== 0) {
    console.error(`Command failed (exit ${r.status})`);
    process.exit(r.status ?? 1);
  }
}

function regenLocal() {
  console.log('\n══ Regenerating local (host-platform) baselines ══');
  run('npx', playwrightArgs);
}

function regenLinuxViaDocker() {
  console.log(`\n══ Regenerating Linux baselines via ${DOCKER_IMAGE} ══`);
  // Strategy: mount the host repo read-only at /host, copy to a
  // writable /scratch inside the container so the Linux npm ci can
  // build node_modules from scratch (the host's node_modules has
  // Windows .exe / native .node files that break a Linux unlink).
  // Then copy any updated baselines back into a writable mount.
  const snapshotsDir = path.join(
    REPO_ROOT,
    'e2e',
    'visual-regression.spec.ts-snapshots',
  );
  if (!existsSync(snapshotsDir)) {
    console.error(`Expected snapshots directory missing: ${snapshotsDir}`);
    process.exit(1);
  }

  // Build the in-container script with embedded args so we can pass
  // them across the host/container boundary cleanly.
  const innerCmd = [
    'cp -r /host /scratch',
    'cd /scratch',
    'rm -rf node_modules',
    'npm ci --no-audit --no-fund 2>&1 | tail -3',
    `npx ${playwrightArgs.join(' ')}`,
    // Sync just the linux PNGs back to the writable mount.
    'cp e2e/visual-regression.spec.ts-snapshots/*-chromium-linux.png /snapshots-out/ 2>/dev/null || true',
  ].join(' && ');

  // Pass `innerCmd` unquoted in argv — `quote()` (in `run`) wraps
  // any whitespace-containing arg with proper double-quote escaping
  // when shelling through. Pre-wrapping here would double-quote it.
  run('docker', [
    'run',
    '--rm',
    '-v',
    `${REPO_ROOT}:/host:ro`,
    '-v',
    `${snapshotsDir}:/snapshots-out`,
    DOCKER_IMAGE,
    'bash',
    '-lc',
    innerCmd,
  ]);
}

if (winOnly && linuxOnly) {
  console.error('--win-only and --linux-only are mutually exclusive');
  process.exit(2);
}

if (!linuxOnly) regenLocal();
if (!winOnly) regenLinuxViaDocker();

console.log('\n✓ Baselines regenerated. Inspect the PNG diffs + commit.');
