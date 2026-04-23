#!/usr/bin/env node
/**
 * Phase 65 — `npm run analyze` entry point.
 *
 * Cross-platform wrapper that:
 *   1. Sets `ANALYZE_BUNDLE=1` so vite.config.ts adds the
 *      rollup-plugin-visualizer pass.
 *   2. Runs the production build.
 *   3. Runs `scripts/analyze-bundle.mjs` to print the per-chunk
 *      module-size breakdown.
 *
 * Avoids needing `cross-env` as a devDep on Windows.
 */

import { spawnSync } from 'node:child_process';

const env = { ...process.env, ANALYZE_BUNDLE: '1' };
const opts = { stdio: 'inherit', shell: true, env };

let r = spawnSync('npm', ['run', 'build'], opts);
if (r.status !== 0) process.exit(r.status ?? 1);

r = spawnSync('node', ['scripts/analyze-bundle.mjs'], opts);
process.exit(r.status ?? 0);
