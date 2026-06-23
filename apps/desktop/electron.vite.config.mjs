import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";

// electron-vite builds three parts to out/{main,preload,renderer}.
// Defaults: main = src/main/index.js, preload = src/preload/index.js,
//           renderer = src/renderer/index.html.
// externalizeDepsPlugin keeps `electron` and node builtins out of the bundle.
export default defineConfig({
  main: { plugins: [externalizeDepsPlugin()] },
  preload: { plugins: [externalizeDepsPlugin()] },
  renderer: { plugins: [react()] },
});
