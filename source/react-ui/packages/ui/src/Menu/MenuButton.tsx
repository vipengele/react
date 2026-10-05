import type { IconComponent } from "@vipengele/react-icons";
import type { ReactNode } from "react";
import { Button, type ButtonSize, type ButtonVariant } from "../Button/Button.js";
import { Menu, type MenuProps } from "./Menu.js";

export interface MenuButtonProps extends Omit<MenuProps, "trigger"> {
  /** The button's content. It names the button and stays the same whatever the menu does. */
  label: ReactNode;
  /** Passed to the `Button` trigger. */
  variant?: ButtonVariant;
  /** Passed to the `Button` trigger. */
  size?: ButtonSize;
  /** Disables the `Button` trigger, so the menu cannot be opened from it. */
  disabled?: boolean;
  /** Passed to the `Button` trigger, before the label. */
  leadingIcon?: IconComponent;
  /** Passed to the `Button` trigger, after the label. */
  trailingIcon?: IconComponent;
}

/**
 * A `Menu` whose trigger is a `Button` showing `label`. `children` are the menu's rows, under the
 * same rules as `Menu`'s, and every other `Menu` prop — `open`, `defaultOpen`, `onOpenChange`,
 * `className` (on the panel) — passes straight through.
 */
export function MenuButton({ label, variant, size, disabled, leadingIcon, trailingIcon, children, ...menuProps }: MenuButtonProps) {
  return (
    <Menu
      {...menuProps}
      trigger={
        <Button variant={variant} size={size} disabled={disabled} leadingIcon={leadingIcon} trailingIcon={trailingIcon}>
          {label}
        </Button>
      }
    >
      {children}
    </Menu>
  );
}
