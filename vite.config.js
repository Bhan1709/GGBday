import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Ensures assets are loaded relative to current path for GitHub Pages
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false
  }
});
