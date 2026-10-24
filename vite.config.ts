import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Console for the knowledge-service RAG API. Everything it calls goes through
// the API gateway, in development as well as when deployed, the same as
// makemerich-frontend's setupProxy.js: the gateway is where authentication,
// rate limits, budgets and usage metering live, so a dev server that reached
// the services directly would exercise a path that does not exist in
// production. The rewrite below therefore mirrors vercel.json exactly:
//
//   /auth/*  ->  <gateway>/auth/*               (gateway routes it to auth-service)
//   /api/*   ->  <gateway>/api/knowledge/api/*  (gateway strips /api/knowledge)
//
// so /api/v1/chat arrives at knowledge-service as /api/v1/chat, with the
// X-User-* identity headers the gateway injects. React Router owns every other
// path (/login, /register, /forgot-password, /reset-password, /).
//
// GATEWAY_PROXY_TARGET points the dev server at a different gateway (a deployed
// one, say). Both hops are server-side, so the browser stays same-origin and
// CORS never applies.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const gateway = env.GATEWAY_PROXY_TARGET || "http://localhost:8000";

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
        "/auth": {
          target: gateway,
          changeOrigin: true,
          // Verify TLS when the target is https — a real deployment, not a
          // self-signed dev box.
          secure: true,
        },
        "/api": {
          target: gateway,
          changeOrigin: true,
          secure: true,
          rewrite: (p) => p.replace(/^\/api/, "/api/knowledge/api"),
        },
      },
    },
    build: {
      target: "esnext",
    },
  };
});
