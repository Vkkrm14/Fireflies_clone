import type { ReactNode } from "react";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "./Button";
import styles from "./Dropdown.module.css";

export interface DropdownOption<T extends string> {
  value: T;
  label: string;
}

export interface DropdownProps<T extends string> {
  label: string;
  value: T;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
  icon?: ReactNode;
}

export function Dropdown<T extends string>({ label, value, options, onChange, icon }: DropdownProps<T>) {
  const current = options.find((o) => o.value === value);
  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <Button variant="secondary" leftIcon={icon} rightIcon={<ChevronDown size={16} aria-hidden />}>
          <span className={styles.triggerLabel}>{label}</span>
          <span>{current?.label ?? ""}</span>
        </Button>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content className={styles.content} align="end" sideOffset={6}>
          <Menu.RadioGroup value={value} onValueChange={(v) => onChange(v as T)}>
            {options.map((option) => (
              <Menu.RadioItem key={option.value} value={option.value} className={styles.item}>
                <Menu.ItemIndicator className={styles.indicator}>
                  <Check size={14} />
                </Menu.ItemIndicator>
                {option.label}
              </Menu.RadioItem>
            ))}
          </Menu.RadioGroup>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
