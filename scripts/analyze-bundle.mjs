#!/usr/bin/env node
/**
 * Phase 65 — bundle analyzer.
 *
 * Reads `dist/stats.html` (emitted by `rollup-plugin-visualizer` when
 * `ANALYZE_BUNDLE=1` is set on the build) and prints a per-chunk
 * breakdown of the largest raw module sizes. Useful for finding the
 * tree-shaking + lazy-loading wins that justify a bundle-trim phase.
 *
 * Usage:
 *   ANALYZE_BUNDLE=1 npm run build
 *   node scripts/analyze-bundle.mjs
 */

import fs from 'node:fs';

const html = fs.readFileSync('dist/stats.html', 'utf8');

// The visualizer template inlines `const data = {...};` inside its
// second <script> tag. Walk braces from that anchor to extract.
const start = html.indexOf('const data = ') + 'const data = '.length;
let depth = 0;
let end = -1;
for (let i = start; i < html.length; i++) {
  const ch = html[i];
  if (ch === '{') depth++;
  else if (ch === '}') {
    depth--;
    if (depth === 0) {
      end = i + 1;
      break;
    }
  }
}
if (end === -1) {
  console.error('Could not find data block in dist/stats.html');
  process.exit(1);
}
const data = JSON.parse(html.slice(start, end));

// Tree leaf nodes have `uid` mapping into `nodeParts` (the chunk-
// rendered length record). Each part has a `metaUid` pointing into
// `nodeMetas` for the underlying source path.
function leafInfo(uid) {
  const part = data.nodeParts[uid];
  if (!part) return null;
  const meta = data.nodeMetas[part.metaUid];
  if (!meta) return null;
  return { id: meta.id, rendered: part.renderedLength, brotli: part.brotliLength };
}

const byChunk = {};
function walk(node, chunk) {
  const myChunk = node.name && node.name.startsWith('assets/') ? node.name : chunk;
  if (node.children) {
    for (const c of node.children) walk(c, myChunk);
    return;
  }
  if (!node.uid) return;
  const info = leafInfo(node.uid);
  if (!info) return;
  if (!byChunk[myChunk]) byChunk[myChunk] = [];
  byChunk[myChunk].push(info);
}
walk(data.tree, '<root>');

for (const [chunk, modules] of Object.entries(byChunk)) {
  modules.sort((a, b) => b.brotli - a.brotli);
  const totalRaw = modules.reduce((s, m) => s + m.rendered, 0);
  const totalBr = modules.reduce((s, m) => s + m.brotli, 0);
  console.log(
    `\n===== ${chunk}  (raw ${totalRaw.toLocaleString()} B  /  brotli ${totalBr.toLocaleString()} B) =====`,
  );
  console.log('   brotli   raw     module');
  for (const m of modules.slice(0, 18)) {
    const short = m.id.split(/[\\/]/).slice(-3).join('/');
    console.log(
      `  ${String(m.brotli).padStart(6)}  ${String(m.rendered).padStart(6)}  ${short}`,
    );
  }
}
