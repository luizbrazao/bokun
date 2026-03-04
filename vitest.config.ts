import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "convex/**/*.test.ts"],
    globals: false,
    // No transform needed — Vitest handles TypeScript natively via esbuild
  },
});
