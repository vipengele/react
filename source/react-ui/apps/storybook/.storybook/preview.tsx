import type { Decorator, Preview } from "@storybook/react-vite";
import { type ColorModePreference, ThemeProvider } from "@vipengele/react-tokens";
import { useGlobals } from "storybook/preview-api";

/**
 * Wraps every story in a `ThemeProvider` controlled by the toolbar's `colorMode` global, and
 * writes every `setColorMode` call back to that global. Without the write-back, a story calling
 * `setColorMode` from `useColorMode()` only fires `onColorModeChange` into a controlled provider
 * and the mode never changes.
 */
const withColorMode: Decorator = (Story) => {
  const [globals, updateGlobals] = useGlobals();
  return (
    <ThemeProvider colorMode={globals.colorMode as ColorModePreference} onColorModeChange={(colorMode) => updateGlobals({ colorMode })}>
      <Story />
    </ThemeProvider>
  );
};

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
          { value: "system", icon: "browser", title: "System" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    colorMode: "light",
  },
  decorators: [withColorMode],
};

export default preview;
