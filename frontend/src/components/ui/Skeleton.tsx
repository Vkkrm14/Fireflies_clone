import type { CSSProperties } from "react";
import { cx } from "@/lib/cx";
import styles from "./Skeleton.module.css";

export interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  circle?: boolean;
  className?: string;
}

export function Skeleton({ width = "100%", height = 14, circle = false, className }: SkeletonProps) {
  const style: CSSProperties = { width, height };
  return <span className={cx(styles.skeleton, circle && styles.circle, className)} style={style} aria-hidden />;
}
