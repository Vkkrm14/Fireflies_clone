import type { ComponentPropsWithRef } from "react";
import { cx } from "@/lib/cx";
import styles from "./Badge.module.css";

export type BadgeTone = "neutral" | "brand" | "success" | "warning" | "danger" | "info";

export interface BadgeProps extends ComponentPropsWithRef<"span"> {
  tone?: BadgeTone;
  dot?: boolean;
}

export function Badge({ tone = "neutral", dot = false, className, children, ...rest }: BadgeProps) {
  return (
    <span className={cx(styles.badge, styles[tone], className)} {...rest}>
      {dot ? <span className={styles.dot} aria-hidden /> : null}
      {children}
    </span>
  );
}
