import { defineConfig } from "vitest/config";
import { config } from "dotenv";
import { resolve } from "path";

// Load root .env BEFORE any test runs
config({ path: resolve(__dirname, "../../.env") });

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],   // ONLY tests/ — excludes src/tests/
    exclude: ["src/tests/**"],
    testTimeout: 15000,
    hookTimeout: 15000,
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
  },
});
