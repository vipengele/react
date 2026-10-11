import type { Meta, StoryObj } from "@storybook/react-vite";
import { LocaleProvider, useLocale } from "@vipengele/react-tokens";
import { Locale } from "@vipengele/ts";
import type { ReactNode } from "react";

const meta = {
  title: "Tokens/LocaleProvider",
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

function Reader({ label, locale }: { label: string; locale?: Locale }) {
  const resolved = useLocale(locale);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
      <strong>{label}</strong>
      <code>tag: {resolved.tag}</code>
      <code>months: {resolved.monthNames("long").join(", ")}</code>
      <code>weekdays: {resolved.weekdayNames("short").join(", ")}</code>
      <code>uses 24-hour clock: {String(resolved.uses24Hour)}</code>
      <code>first day of week: {resolved.firstDayOfWeek}</code>
    </div>
  );
}

function Box({ children }: { children: ReactNode }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "1rem", border: "1px solid" }}>{children}</div>;
}

export const Nested: Story = {
  render: () => (
    <LocaleProvider locale={new Locale("en-US")}>
      <Box>
        <Reader label="Outer provider" />
        <LocaleProvider locale={new Locale("de-DE")}>
          <Box>
            <Reader label="Nested provider (replaces the outer locale)" />
          </Box>
        </LocaleProvider>
      </Box>
    </LocaleProvider>
  ),
};

export const PropOverride: Story = {
  render: () => (
    <LocaleProvider locale={new Locale("en-US")}>
      <Box>
        <Reader label="Provider only" />
        <Reader label="locale prop (wins over the provider)" locale={new Locale("ja-JP")} />
      </Box>
    </LocaleProvider>
  ),
};

export const NoProvider: Story = {
  render: () => (
    <Box>
      <Reader label="No provider (the runtime default, Locale.default())" />
    </Box>
  ),
};
