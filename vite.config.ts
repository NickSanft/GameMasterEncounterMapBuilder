import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: '/GameMasterEncounterMapBuilder/',
  build: {
    rollupOptions: {
      input: {
        landing: resolve(__dirname, 'index.html'),
        gm: resolve(__dirname, 'gm.html'),
        spectator: resolve(__dirname, 'spectator.html'),
      },
    },
  },
});
