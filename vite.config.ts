import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react()],
  build: { target: ["es2022", "safari16.4"], sourcemap: false },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
  server: {
    fs: { deny: ["**/.env*", "**/.git/**", "**/sample/**", "**/artwork/**"] },
  },
});
