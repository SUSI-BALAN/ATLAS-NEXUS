import { resolve } from "node:path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  main: { plugins: [externalizeDepsPlugin()], build: { lib: { entry: resolve(import.meta.dirname, "electron/index.ts") } } },
  preload: {
    build: {
      lib: { entry: resolve(import.meta.dirname, "preload/index.ts"), formats: ["cjs"] },
      rollupOptions: {
        output: { format: "cjs", entryFileNames: "index.cjs", inlineDynamicImports: true }
      }
    }
  },
  renderer: {
    root: resolve(import.meta.dirname, "src"),
    plugins: [react(), tailwindcss()],
    build: { rollupOptions: { input: resolve(import.meta.dirname, "src/index.html") } }
  }
});
