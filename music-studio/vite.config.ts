import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: {
      "/local-audio-runtime": {
        target: "http://127.0.0.1:8002",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/local-audio-runtime/, ""),
      },
    },
  },
  build: {
    outDir: "dist",
  },
});
