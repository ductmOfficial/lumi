/// <reference types="vitest/config" />
import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss()],
  // Never bundle the TMDB token into a production build: deployed builds call the
  // Worker proxy, which holds the token as a secret. Set ALLOW_CLIENT_TOKEN=1 to opt out.
  define:
    command === "build" && process.env.ALLOW_CLIENT_TOKEN !== "1"
      ? { "import.meta.env.VITE_TMDB_ACCESS_TOKEN": "undefined" }
      : {},
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
}));
