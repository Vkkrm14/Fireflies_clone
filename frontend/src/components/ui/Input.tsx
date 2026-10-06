import type { ComponentPropsWithRef, ReactNode } from "react";
import { Search, X } from "lucide-react";
import { cx } from "@/lib/cx";
import styles from "./Input.module.css";

export interface InputProps extends ComponentPropsWithRef<"input"> {
  icon?: ReactNode;
  invalid?: boolean;
  wrapperClassName?: string;
}

export function Input({ icon, invalid, wrapperClassName, className, ...rest }: InputProps) {
  return (
    <div className={cx(styles.field, invalid && styles.invalid, wrapperClassName)}>
      {icon ? <span className={styles.icon} aria-hidden>{icon}</span> : null}
      <input className={cx(styles.control, className)} aria-invalid={invalid || undefined} {...rest} />
    </div>
  );
}

export interface TextareaProps extends ComponentPropsWithRef<"textarea"> {
  invalid?: boolean;
}

export function Textarea({ invalid, className, ...rest }: TextareaProps) {
  return (
    <textarea
      className={cx(styles.textarea, invalid && styles.invalid, className)}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
}

export interface SearchInputProps extends Omit<InputProps, "icon" | "type" | "value" | "onChange"> {
  value: string;
  onValueChange: (value: string) => void;
}

export function SearchInput({ value, onValueChange, placeholder = "Search", wrapperClassName, ...rest }: SearchInputProps) {
  return (
    <div className={cx(styles.field, wrapperClassName)}>
      <span className={styles.icon} aria-hidden><Search size={16} /></span>
      <input
        type="search"
        className={cx(styles.control, styles.search)}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onValueChange(e.target.value)}
        {...rest}
      />
      {value ? (
        <button type="button" className={styles.clear} aria-label="Clear search" onClick={() => onValueChange("")}>
          <X size={14} />
        </button>
      ) : null}
    </div>
  );
}
