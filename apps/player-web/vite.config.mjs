import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // In dev the player UI runs here; in prod the GM server serves the built dist.
  server: {
    port: 5174,
    // Dev-only proxy so socket.io reaches the GM server without CORS pain.
    proxy: { "/socket.io": { target: "http://localhost:4317", ws: true } },
  },
});
