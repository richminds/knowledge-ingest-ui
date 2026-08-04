import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Standalone console for the Knowledge Service — talks to it, and to
// auth-service for sign-in, directly (no gateway/BFF in front). Set
// VITE_API_BASE_URL / VITE_AUTH_BASE_URL to point at deployed instances;
// leave either unset and its dev proxy below forwards to a local instance
// (knowledge-service on 8090, auth-service on 8100).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5174,
    proxy: {
      "/v1": {
        target: "http://localhost:8090",
        changeOrigin: true,
      },
      "/auth": {
        target: "http://localhost:8100",
        changeOrigin: true,
      },
    },
  },
  build: {
    target: "esnext",
  },
});
