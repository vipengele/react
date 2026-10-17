import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Unmounting between tests is what disconnects each `ThemeProvider`'s observers; without it they
// accumulate and fire into the next test's renders.
afterEach(() => {
  cleanup();
});
