import type { Meta, StoryObj } from "@storybook/react-vite";
import { Vipengele } from "@vipengele/react";
import { useScope } from "@vipengele/react-telemetry";
import { type ColorModePreference, createTheme, useColorMode, useLocale } from "@vipengele/react-tokens";
import { Locale } from "@vipengele/ts";

const meta = {
  title: "React/Vipengele",
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const colorModePreferences: ColorModePreference[] = ["light", "dark", "system"];

function Reader() {
  const { colorMode, setColorMode, resolvedColorMode } = useColorMode();
  const locale = useLocale();
  const scope = useScope();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <fieldset aria-label="Colour mode" style={{ display: "flex", gap: "0.5rem", border: "none", margin: 0, padding: 0 }}>
        {colorModePreferences.map((preference) => (
          <button
            key={preference}
            type="button"
            aria-pressed={colorMode === preference}
            onClick={() => setColorMode(preference)}
            style={{
              background: colorMode === preference ? "var(--vpg-accent)" : "transparent",
              color: colorMode === preference ? "var(--vpg-accent-contrast)" : "var(--vpg-ink)",
              border: "1px solid var(--vpg-accent)",
              borderRadius: "var(--vpg-radius-sm)",
              padding: "0.5rem 1rem",
            }}
          >
            {preference}
          </button>
        ))}
      </fieldset>
      <code>
        colour mode: {colorMode} (painting in {resolvedColorMode ?? "unknown"})
      </code>
      <code>locale: {locale.tag}</code>
      <code>months: {locale.monthNames("long").join(", ")}</code>
      <code>
        scope: user.id={String(scope.get("user.id"))}, region={String(scope.get("region"))}
      </code>
    </div>
  );
}

const rootStyle = {
  background: "var(--vpg-surface)",
  color: "var(--vpg-ink)",
  padding: "var(--vpg-radius-lg)",
  borderRadius: "var(--vpg-radius)",
};

/** One `<Vipengele>` mounts the theme, locale and scope together. It owns its colour mode
 * (`defaultColorMode`), so the buttons here move this subtree and leave the toolbar alone. */
export const Composed: Story = {
  render: () => (
    <Vipengele
      theme={createTheme({ accent: "oklch(0.6 0.2 150)" })}
      defaultColorMode="light"
      locale={new Locale("de-DE")}
      scope={{ tag: "app", attributes: { "user.id": "u-1", region: "eu" } }}
      style={rootStyle}
    >
      <Reader />
    </Vipengele>
  ),
};

/** Without `locale`, `<Vipengele>` resolves `Locale.default()`; without `theme`, the default seed. */
export const Defaults: Story = {
  render: () => (
    <Vipengele defaultColorMode="system" style={rootStyle}>
      <Reader />
    </Vipengele>
  ),
};
