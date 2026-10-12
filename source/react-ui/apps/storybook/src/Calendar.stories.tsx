import type { Meta, StoryObj } from "@storybook/react-vite";
import { LocaleProvider } from "@vipengele/react-tokens";
import { Calendar } from "@vipengele/react-ui";
import { Locale, LocalDate } from "@vipengele/ts";
import { useState } from "react";

const meta = {
  title: "Components/Calendar",
  component: Calendar,
  parameters: {
    docs: {
      description: {
        component:
          "A month grid for picking one day. It is one tab stop: arrows move by day or week, Home and End to the ends of the week, Page Up and Page Down by month (with Shift, by year), and Enter or Space selects. Days of the neighbouring months are inert blanks, and the grid is always six rows tall. The selected day and the visible month are each controlled or held by the component. Month and weekday names, day labels and the first day of the week come from the locale.",
      },
    },
  },
} satisfies Meta<typeof Calendar>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A fixed day, so the stories that mark it are the same whenever they are viewed. */
const TODAY = LocalDate.of(2030, 6, 12);

const german = new Locale("de-DE");

export const Default: Story = {};

export const Selected: Story = {
  args: { today: TODAY, defaultValue: LocalDate.of(2030, 6, 20) },
};

export const Clearable: Story = {
  args: { today: TODAY, defaultValue: LocalDate.of(2030, 6, 20), clearable: true },
  parameters: {
    docs: {
      description: {
        story:
          "Clear empties the selection and leaves the visible month alone. With nothing selected the button stays in place, dimmed, so the calendar's height does not change.",
      },
    },
  },
};

export const MinMax: Story = {
  args: { today: TODAY, min: LocalDate.of(2030, 6, 5), max: LocalDate.of(2030, 7, 20) },
  parameters: {
    docs: {
      description: {
        story: "Days outside `min` and `max` cannot be selected, and the month buttons stop at the months of the bounds.",
      },
    },
  },
};

export const DisabledDates: Story = {
  args: { today: TODAY, isDateDisabled: (date) => date.dayOfWeek >= 6 },
  parameters: {
    docs: {
      description: {
        story:
          "Weekends are reported as disabled. A disabled day stays focusable, so the arrow keys pass through it, but it cannot be selected.",
      },
    },
  },
};

export const GermanLocale: Story = {
  args: { today: TODAY, locale: german, defaultValue: LocalDate.of(2030, 6, 20), clearable: true, clearLabel: "Löschen" },
  parameters: {
    docs: {
      description: {
        story: "The `locale` prop sets the month and weekday names, the day labels and the first day of the week (Monday in `de-DE`).",
      },
    },
  },
};

export const GermanLocaleFromProvider: Story = {
  render: () => (
    <LocaleProvider locale={german}>
      <Calendar
        today={TODAY}
        defaultValue={LocalDate.of(2030, 6, 20)}
        previousMonthLabel="Vorheriger Monat"
        nextMonthLabel="Nächster Monat"
      />
    </LocaleProvider>
  ),
  parameters: {
    docs: {
      description: {
        story: "Without a `locale` prop the calendar reads the nearest `LocaleProvider`'s locale.",
      },
    },
  },
};

function ControlledMonthCalendar() {
  const [month, setMonth] = useState(LocalDate.of(2030, 6, 1));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "flex-start" }}>
      <Calendar today={TODAY} month={month} onMonthChange={setMonth} />
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button type="button" onClick={() => setMonth(LocalDate.of(2030, 1, 1))}>
          Jump to January 2030
        </button>
        <button type="button" onClick={() => setMonth(LocalDate.of(2030, 12, 1))}>
          Jump to December 2030
        </button>
      </div>
      <code>{`month: ${month.toString()}`}</code>
    </div>
  );
}

export const ControlledMonth: Story = {
  render: () => <ControlledMonthCalendar />,
};

function ControlledValueCalendar() {
  const [value, setValue] = useState<LocalDate | undefined>(LocalDate.of(2030, 6, 20));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "flex-start" }}>
      <Calendar today={TODAY} value={value} onChange={setValue} clearable />
      <code>{`value: ${value?.toString() ?? "undefined"}`}</code>
    </div>
  );
}

export const ControlledValue: Story = {
  render: () => <ControlledValueCalendar />,
};
