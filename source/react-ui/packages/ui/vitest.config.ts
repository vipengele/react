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
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
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
        // `SideNav.browser.test.tsx` imports `react-dom/server`. Left to Vite's discovery, a warm
        // dep cache that never saw it re-optimises mid-run and the test loads a second React.
        optimizeDeps: { include: ["react-dom/server"] },
        test: {
          name: "chromium",
          include: browserTests,
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: "chromium" }],
            // A desktop viewport, wider than `SideNav`'s default `mobileBelow`. Vitest's own default
            // is a 414px phone, under which a responsive component renders its narrow
            // presentation in every test that does not resize the page itself.
            viewport: { width: 1280, height: 800 },
          },
        },
      },
    ],
  },
});
