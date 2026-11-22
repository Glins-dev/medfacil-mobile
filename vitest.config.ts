import { defineConfig } from "vitest/config";

const srcDir = new URL("./src", import.meta.url).pathname.replace(
  /^\/([A-Za-z]:)/,
  "$1"
);

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/__tests__/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": srcDir,
    },
  },
});
