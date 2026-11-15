import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base: the built site works at any path, including
  // https://<user>.github.io/<repo>/ on GitHub Pages, whatever the repo is called.
  base: './',
  build: {
    target: 'es2022',
    // three.js is large; one chunk per level (via dynamic import) is the expected pattern.
    chunkSizeWarningLimit: 1200,
  },
});
