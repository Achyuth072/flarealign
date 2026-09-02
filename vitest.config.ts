import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    server: {
      deps: {
        inline: ["agents", "@cloudflare/ai-chat"],
      },
    },
  },
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(import.meta.dirname, "./src") },
      { find: /^cloudflare:.*/, replacement: path.resolve(import.meta.dirname, "./src/test-utils/cloudflare-workers-shim.ts") },
    ],
  },
});
