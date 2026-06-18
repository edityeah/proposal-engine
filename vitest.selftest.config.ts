import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Separate config so the live integration self-test isn't picked up by `npm test`.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.itest.ts"],
    testTimeout: 60000,
  },
});
