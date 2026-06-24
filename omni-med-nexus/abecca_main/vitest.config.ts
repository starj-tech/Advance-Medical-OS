import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Test runner for the committed suite under `tests/`. Runs in a Node environment
 * against the in-memory backend (no Supabase env vars), exercising the pure libs
 * (`@/lib/*`) and the env-gated server stores (`@/server/*`). The `@` alias mirrors
 * tsconfig paths so tests import modules exactly as the app does.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
