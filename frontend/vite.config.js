import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,          // exposes on the LAN so a phone can reach the dev server
    port: 5173,
    proxy: {
      // API_PROXY_TARGET lets the dev server follow a backend on another port.
      "/api": { target: process.env.API_PROXY_TARGET || "http://localhost:8080", changeOrigin: true },
    },
  },
});
