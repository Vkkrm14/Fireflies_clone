import type { ReactNode } from "react";
import * as Menu from "@radix-ui/react-dropdown-menu";
import styles from "./Dropdown.module.css";

export interface ActionMenuItem {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  danger?: boolean;
  separatorBefore?: boolean;
}

export interface ActionMenuProps {
  trigger: ReactNode;
  items: ActionMenuItem[];
  align?: "start" | "center" | "end";
  header?: ReactNode;
}

/** Radix menu of plain actions (row menus, capture options, notifications). */
export function ActionMenu({ trigger, items, align = "end", header }: ActionMenuProps) {
  return (
    <Menu.Root modal={false}>
      <Menu.Trigger asChild>{trigger}</Menu.Trigger>
      <Menu.Portal>
        <Menu.Content className={styles.content} align={align} sideOffset={6}>
          {header}
          {items.map((item) => (
            <div key={item.label}>
              {item.separatorBefore ? <Menu.Separator className={styles.separator} /> : null}
              <Menu.Item className={styles.actionItem} data-danger={item.danger || undefined} onSelect={item.onSelect}>
                {item.icon}
                {item.label}
              </Menu.Item>
            </div>
          ))}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
