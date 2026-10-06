import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import styles from "./PageContainer.module.css";

export interface PageContainerProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  width?: "narrow" | "default" | "wide";
  children: ReactNode;
}

export function PageContainer({ title, description, actions, width = "default", children }: PageContainerProps) {
  return (
    <div className={cx(styles.container, styles[width])}>
      {title ? (
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>{title}</h1>
            {description ? <p className={styles.description}>{description}</p> : null}
          </div>
          {actions ? <div className={styles.actions}>{actions}</div> : null}
        </header>
      ) : null}
      {children}
    </div>
  );
}
