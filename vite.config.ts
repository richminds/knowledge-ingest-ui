import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Console for the wbg-oissaagent-knowledge RAG API. Every route it calls lives
// under /api/v1, so in development that one prefix is proxied to the service
// (`make dev` serves it on :8000). The hop is server-side, so the browser stays
// same-origin and CORS never applies.
//
// RAG_PROXY_TARGET points the dev server at a different instance — a deployed
// QA one, say.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const target = env.RAG_PROXY_TARGET || "http://localhost:8000";

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 5174,
      proxy: {
        "/api": {
          target,
          changeOrigin: true,
          // Verify TLS when the target is https — a real deployment, not a
          // self-signed dev box.
          secure: true,
        },
      },
    },
    build: {
      target: "esnext",
    },
  };
});
