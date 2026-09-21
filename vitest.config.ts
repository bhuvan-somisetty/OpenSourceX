import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["**/*.test.ts"],
          exclude: ["**/*.int.test.ts", "**/node_modules/**"],
        },
      },
      {
        test: {
          name: "integration",
          include: ["**/*.int.test.ts"],
          exclude: ["**/node_modules/**"],
          testTimeout: 30000,
          fileParallelism: false,
        },
      },
    ],
  },
});
