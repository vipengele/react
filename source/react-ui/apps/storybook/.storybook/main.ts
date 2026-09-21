import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  // Serves @vipengele/brand's vectors under /brand so the custom theme's
  // brandImage (.storybook/manager.ts) can reference the lockup. staticDirs
  // copies from a directory rather than resolving "@vipengele/brand/svg/*"
  // through the package's exports, so it names the installed package's dist/.
  //
  // A `from` that resolves to nothing is not a build failure — Storybook
  // builds happily and the sidebar heading renders as a broken image — so
  // changing this means loading the built site and looking at it.
  staticDirs: [{ from: "../node_modules/@vipengele/brand/dist/svg", to: "/brand" }],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
};

export default config;
