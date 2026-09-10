import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Console for the Knowledge Service. Everything it calls goes through the API
// gateway — in development as well as when deployed, and that symmetry is the
// point: the gateway is where authentication, rate limits, budgets and usage
// metering live, so a dev server that reached the services directly would
// exercise a path that does not exist in production and would let bugs in all
// four of those hide until deploy.
//
// The rewrite below therefore mirrors vercel.json exactly:
//
//   /auth/*  ->  <gateway>/auth/*                 (gateway routes it to auth-service)
//   /v1/*    ->  <gateway>/api/knowledge/v1/*     (gateway strips the prefix)
//
// auth-service is never addressed directly by this app. The gateway is the
// only thing on the platform that talks to it.
//
// GATEWAY_PROXY_TARGET points the dev server at a different gateway — a
// deployed one, say. Both hops are server-side, so the browser stays
// same-origin and CORS never applies.
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
        "/v1": {
          target: gateway,
          changeOrigin: true,
          // Verify TLS when the target is https — a real deployment, not a
          // self-signed dev box.
          secure: true,
          rewrite: (p) => p.replace(/^\/v1/, "/api/knowledge/v1"),
        },
        "/auth": {
          target: gateway,
          changeOrigin: true,
          secure: true,
        },
      },
    },
    build: {
      target: "esnext",
    },
  };
});
