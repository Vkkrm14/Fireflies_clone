"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { useThemePreference } from "@/lib/hooks/useTheme";
import type { ThemePreference } from "@/lib/theme";
import styles from "./ThemePicker.module.css";

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

/** Settings → Language & Appearance → Theme. The choice is saved in this browser and applied at once. */
export function ThemePicker() {
  const [preference, setPreference] = useThemePreference();

  return (
    <div className={styles.card}>
      <Moon size={20} className={styles.lead} aria-hidden />
      <div className={styles.body}>
        <h3 className={styles.title}>
          Theme <Badge tone="brand">BETA</Badge>
        </h3>
        <p className={styles.help} id="theme-help">
          Choose how the application looks. Select System to automatically match your device settings.
        </p>
        <div className={styles.options} role="radiogroup" aria-label="Theme" aria-describedby="theme-help">
          {OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={preference === value}
              className={styles.option}
              onClick={() => setPreference(value)}
            >
              <Icon size={20} aria-hidden />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
