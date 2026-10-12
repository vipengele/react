import type { Meta, StoryObj } from "@storybook/react-vite";
import { LocaleProvider } from "@vipengele/react-tokens";
import { DateField, FormField } from "@vipengele/react-ui";
import { Locale, LocalDate } from "@vipengele/ts";
import { useState } from "react";

const meta = {
  title: "Components/DateField",
  component: DateField,
  args: { "aria-label": "Date", today: LocalDate.of(2030, 6, 12) },
  argTypes: {
    onChange: { action: "changed" },
    onOpenChange: { action: "open changed" },
  },
  parameters: {
    docs: {
      description: {
        component:
          "A locale-aware date field. Type or paste a date in the locale's numeric pattern or as ISO 8601; `onChange` fires on commit (blur, Enter, an arrow-key step, a calendar pick or Clear), never per keystroke. Text that is not an accepted date stays on screen and is flagged invalid. A button opens a Calendar in a non-modal Popover below the field, on every viewport width. A hidden input submits the value as an ISO 8601 date.",
      },
    },
  },
} satisfies Meta<typeof DateField>;

export default meta;

type Story = StoryObj<typeof meta>;

const german = new Locale("de-DE");

export const Default: Story = {};

export const TypedEntry: Story = {
  args: { defaultValue: LocalDate.of(2030, 6, 20) },
  parameters: {
    docs: {
      description: {
        story:
          "Type a date as `06/20/2030` or `2030-06-20`. ArrowUp and ArrowDown step the day, month or year under the caret and commit at once; in an empty field they step onto `today`. Text that reads as no date stays on screen, flagged through `aria-invalid`.",
      },
    },
  },
};

export const PastedEntry: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Paste `2030-06-20` or `06/20/2030` into the box and tab away: pasted text is read exactly like typed text, in the locale's pattern or as ISO 8601, and commits on blur.",
      },
    },
  },
};

export const MinMax: Story = {
  args: { min: LocalDate.of(2030, 6, 5), max: LocalDate.of(2030, 7, 20), defaultValue: LocalDate.of(2030, 6, 20) },
  parameters: {
    docs: {
      description: {
        story:
          "Dates outside `min` and `max` are not committed: typed text stays on screen, flagged invalid, and a step stops at the bound. The calendar bounds the same range.",
      },
    },
  },
};

export const DisabledDates: Story = {
  args: { isDateDisabled: (date) => date.dayOfWeek >= 6, defaultValue: LocalDate.of(2030, 6, 20) },
  parameters: {
    docs: {
      description: {
        story: "Weekends are reported as disabled. They are not committed when typed, and a step walks past them.",
      },
    },
  },
};

export const Clearable: Story = {
  args: { defaultValue: LocalDate.of(2030, 6, 20) },
  parameters: {
    docs: {
      description: {
        story:
          "The clear button at the end shows while the field holds a date or text. Pressing it keeps focus on the input and commits `undefined`.",
      },
    },
  },
};

export const OpenCalendar: Story = {
  args: { defaultOpen: true, defaultValue: LocalDate.of(2030, 6, 20) },
  parameters: {
    docs: {
      description: {
        story:
          "The calendar pop-up open on the committed date's month. Picking a day commits it, closes the pop-up and focuses the input; Escape and an outside press close it with focus back on the button.",
      },
    },
  },
};

export const NarrowViewport: Story = {
  args: { defaultOpen: true, defaultValue: LocalDate.of(2030, 6, 20) },
  globals: { viewport: { value: "mobile1", isRotated: false } },
  parameters: {
    docs: {
      description: {
        story: "On a phone-width viewport the calendar is still a non-modal popover below the field; it shifts to stay on screen.",
      },
    },
  },
};

export const Invalid: Story = {
  args: { "aria-invalid": true, defaultValue: LocalDate.of(2030, 6, 20) },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: LocalDate.of(2030, 6, 20) },
};

export const ReadOnly: Story = {
  args: { readOnly: true, defaultValue: LocalDate.of(2030, 6, 20) },
};

export const GermanLocaleProp: Story = {
  args: { locale: german, defaultValue: LocalDate.of(2030, 6, 20), clearLabel: "Löschen", openCalendarLabel: "Datum wählen" },
};

export const PortugueseTypedEntry: Story = {
  args: { locale: new Locale("pt-PT"), clearLabel: "Limpar", openCalendarLabel: "Escolher data" },
  parameters: {
    docs: {
      description: {
        story:
          "The placeholder shows the locale's format. Typing `1010` reads `10/10/` as each day or month completes, and typing the `/` yourself works too. The calendar opens below the field, not as a modal.",
      },
    },
  },
};

export const UnderLocaleProvider: Story = {
  render: (args) => (
    <LocaleProvider locale={german}>
      <DateField {...args} />
    </LocaleProvider>
  ),
  args: { defaultValue: LocalDate.of(2030, 6, 20) },
};

export const InFormField: Story = {
  render: (args) => (
    <FormField label="Due date" hint="Weekdays only.">
      <DateField {...args} />
    </FormField>
  ),
  args: { "aria-label": undefined, isDateDisabled: (date) => date.dayOfWeek >= 6 },
};

export const Controlled: Story = {
  render: (args) => {
    const [value, setValue] = useState<LocalDate | undefined>(LocalDate.of(2030, 6, 20));
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "flex-start" }}>
        <DateField
          {...args}
          value={value}
          onChange={(next) => {
            setValue(next);
            args.onChange?.(next);
          }}
        />
        <code>{`value: ${value?.toString() ?? "undefined"}`}</code>
      </div>
    );
  },
};

export const InForm: Story = {
  render: (args) => {
    const [submitted, setSubmitted] = useState<string | null>(null);
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(String(new FormData(event.currentTarget).get("due")));
        }}
      >
        <DateField {...args} name="due" />
        <button type="submit">Submit</button>
        {submitted !== null && <p>Submitted: {submitted}</p>}
      </form>
    );
  },
  args: { defaultValue: LocalDate.of(2030, 6, 20) },
  parameters: {
    docs: {
      description: {
        story: "The form submits the committed date as ISO 8601 under `name`, whatever the locale the box is written in.",
      },
    },
  },
};
