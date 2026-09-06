import { defineConfig } from 'vite';

export default defineConfig({
  // Base relativa: funciona en GitHub Pages sea cual sea el nombre del repo
  // (https://usuario.github.io/nombre-del-repo/) sin tener que hardcodearlo.
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
});
