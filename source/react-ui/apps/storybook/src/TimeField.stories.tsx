import type { Meta, StoryObj } from "@storybook/react-vite";
import { LocaleProvider } from "@vipengele/react-tokens";
import { FormField, TimeField } from "@vipengele/react-ui";
import { Locale, LocalTime } from "@vipengele/ts";
import { useState } from "react";

const meta = {
  title: "Components/TimeField",
  component: TimeField,
  args: { "aria-label": "Start time", locale: new Locale("en-US") },
} satisfies Meta<typeof TimeField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { defaultValue: LocalTime.of(14, 30) },
};

export const Empty: Story = {};

/** With `seconds` off, a value carrying seconds shows hour and minute; its seconds are kept until
 * the user edits, and the first commit zeroes them. */
export const SecondsHiddenOnAValueWithSeconds: Story = {
  args: { defaultValue: LocalTime.of(14, 30, 15) },
};

export const WithSeconds: Story = {
  args: { seconds: true, defaultValue: LocalTime.of(14, 30, 15) },
};

export const TwentyFourHourLocaleProp: Story = {
  args: { locale: new Locale("de-DE"), defaultValue: LocalTime.of(14, 30) },
};

export const PeriodFirstUnderLocaleProvider: Story = {
  render: (args) => (
    <LocaleProvider locale={new Locale("ko-KR")}>
      <TimeField {...args} locale={undefined} />
    </LocaleProvider>
  ),
  args: { defaultValue: LocalTime.of(14, 30) },
};

export const Controlled: Story = {
  render: (args) => {
    const [value, setValue] = useState<LocalTime | undefined>(LocalTime.of(9, 5));
    return (
      <div>
        <TimeField {...args} value={value} onChange={setValue} />
        <p>Committed: {value?.toString() ?? "none"}</p>
      </div>
    );
  },
};

/** `min` and `max` are inclusive. Arrow steps that would leave the window do nothing, and a
 * complete time outside it is rejected on commit: the group is `aria-invalid`, `onChange` is not
 * called and the typed text stays. */
export const MinMax: Story = {
  render: (args) => {
    const [value, setValue] = useState<LocalTime | undefined>(LocalTime.of(9, 0));
    return (
      <div>
        <TimeField {...args} value={value} onChange={setValue} />
        <p>Committed: {value?.toString() ?? "none"}</p>
      </div>
    );
  },
  args: { min: LocalTime.of(9, 0), max: LocalTime.of(17, 30) },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: LocalTime.of(14, 30) },
};

export const InFormFieldWithError: Story = {
  render: (args) => (
    <FormField label="Start time" error="Enter a start time.">
      <TimeField {...args} aria-label={undefined} />
    </FormField>
  ),
};
