import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' so the built renderer loads correctly from file:// inside Electron.
// outDir: 'renderer' so electron/main.js can loadFile('../renderer/index.html').
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { outDir: 'renderer', emptyOutDir: true },
  server: { port: 5173 },
});
