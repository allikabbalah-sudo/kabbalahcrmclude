import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { fileURLToPath, URL } from "node:url";

// TanStack Start v1, React 19, SSR target: Cloudflare Worker
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  plugins: [
    tailwindcss(),
    tanstackStart({
      target: "cloudflare-module",
    }),
    react(),
  ],
});
