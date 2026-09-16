import { playwright } from "@vitest/browser-playwright";
import { configDefaults, defineConfig } from "vitest/config";

// Tests that need a real engine — layout, computed styles, focus — are named
// `*.browser.test.*` and run only in the chromium project.
const browserTests = ["src/**/*.browser.test.{ts,tsx}"];

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "json-summary"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/vitest.setup.ts", "bundle-check/**"],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
    projects: [
      {
        test: {
          name: "jsdom",
          environment: "jsdom",
          setupFiles: ["./src/vitest.setup.ts"],
          // The default `include` matches `*.browser.test.tsx` too. Without this exclude every
          // browser test runs a second time under jsdom, which lays nothing out and so fails
          // exactly the assertions the test exists to make.
          exclude: [...configDefaults.exclude, ...browserTests],
        },
      },
      {
        test: {
          name: "chromium",
          include: browserTests,
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});
