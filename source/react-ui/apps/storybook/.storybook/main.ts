import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  // Serves @tandiko/brand's SVGs at the manager root so the custom theme's
  // brandImage (.storybook/manager.ts) can reference the Tandiko logo. The
  // package exports these as "@tandiko/brand/svg/*" but on disk they live in
  // assets/dist, which is what staticDirs needs.
  staticDirs: ["../../../packages/brand/assets/dist"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
};

export default config;
