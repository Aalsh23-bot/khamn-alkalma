import { resolve } from "node:path";
import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const rootDir = import.meta.dirname;

/** Static SPA bundle for Capacitor (iOS/Android). Independent of the web SSR build. */
export default defineConfig({
  root: resolve(rootDir, "native"),
  base: "./",
  plugins: [tailwindcss(), viteReact()],
  resolve: {
    alias: { "@": resolve(rootDir, "src") },
    tsconfigPaths: true,
  },
  publicDir: resolve(rootDir, "public"),
  build: {
    outDir: resolve(rootDir, "dist-native"),
    emptyOutDir: true,
    assetsInlineLimit: 4096,
  },
});
