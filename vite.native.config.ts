import { resolve } from "node:path";
import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const rootDir = import.meta.dirname;

/** Static SPA bundle for Capacitor (iOS/Android). Independent of the web SSR build. */
export default defineConfig({
  root: resolve(rootDir, "native"),
  // Load root `.env` / `.env.*` so Mac clones without native/.env still pick up keys.
  envDir: rootDir,
  base: "./",
  plugins: [tailwindcss(), viteReact()],
  resolve: {
    alias: { "@": resolve(rootDir, "src") },
    tsconfigPaths: true,
  },
  publicDir: resolve(rootDir, "public"),
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: true,
    fs: {
      allow: [rootDir],
    },
  },
  build: {
    outDir: resolve(rootDir, "dist-native"),
    emptyOutDir: true,
    assetsInlineLimit: 4096,
  },
});
