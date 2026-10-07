import type { Preview } from "@storybook/react-vite";
import { ThemeProvider } from "@vipengele/react-tokens";

const preview: Preview = {
  globalTypes: {
    colorMode: {
      description: "Global color mode for ThemeProvider",
      toolbar: {
        title: "Color mode",
        icon: "circlehollow",
        items: [
          { value: "light", icon: "sun", title: "Light" },
          { value: "dark", icon: "moon", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    colorMode: "light",
  },
  decorators: [
    (Story, context) => (
      <ThemeProvider colorMode={context.globals.colorMode}>
        <Story />
      </ThemeProvider>
    ),
  ],
};

export default preview;
