import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**']},
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: {
        popup: resolve(rootDir, "popup.html"),
        app: resolve(rootDir, "app.html"),
        options: resolve(rootDir, "options.html"),
        serviceWorker: resolve(rootDir, "src/service-worker.ts"),
      },
      output: {
        entryFileNames: (entry) =>
          entry.name === "serviceWorker"
            ? "service-worker.js"
            : "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
});
