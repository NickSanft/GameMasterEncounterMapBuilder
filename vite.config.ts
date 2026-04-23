import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  base: '/GameMasterEncounterMapBuilder/',
  build: {
    rollupOptions: {
      input: {
        landing: resolve(__dirname, 'index.html'),
        gm: resolve(__dirname, 'gm.html'),
        spectator: resolve(__dirname, 'spectator.html'),
      },
      // Phase 65 — emit a brotli-sized treemap to dist/stats.html
      // when ANALYZE_BUNDLE=1 is set in the environment. Off by
      // default so production builds stay fast.
      plugins: process.env['ANALYZE_BUNDLE']
        ? [
            visualizer({
              filename: 'dist/stats.html',
              gzipSize: true,
              brotliSize: true,
              template: 'treemap',
              open: false,
            }),
          ]
        : [],
    },
  },
});
