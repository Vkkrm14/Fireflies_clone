import type { ReactNode } from "react";
import styles from "./EmptyState.module.css";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className={styles.empty}>
      <div className={styles.art} aria-hidden>
        <svg viewBox="0 0 120 120" width="120" height="120">
          <defs>
            <radialGradient id="empty-glow">
              <stop offset="0" stopColor="#6c5ce7" stopOpacity="0.28" />
              <stop offset="1" stopColor="#6c5ce7" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="60" cy="60" r="58" fill="url(#empty-glow)" />
          <circle cx="60" cy="60" r="34" fill="none" stroke="#d9d4ff" strokeDasharray="3 5" />
          <circle cx="94" cy="60" r="3.5" fill="#ffd45e" />
          <circle cx="30" cy="38" r="2.5" fill="#b9b0ff" />
          <circle cx="40" cy="92" r="2" fill="#b9b0ff" />
        </svg>
        <span className={styles.icon}>{icon}</span>
      </div>
      <h2 className={styles.title}>{title}</h2>
      {description ? <p className={styles.description}>{description}</p> : null}
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
