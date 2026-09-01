import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  root: "./src/client",
  build: {
    outDir: "../../dist",
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/agents": {
        target: "http://localhost:8787",
        ws: true,
      },
      "/api": {
        target: "http://localhost:8787",
      },
    },
  },
});
