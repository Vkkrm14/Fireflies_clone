"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cx } from "@/lib/cx";
import styles from "./Toast.module.css";

type ToastTone = "success" | "error" | "info";

interface ToastItem {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
  open: boolean;
}

interface ToastApi {
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const DURATION_MS = 4500;
const EXIT_MS = 250;
const ToastContext = createContext<ToastApi | null>(null);

const ICONS = { success: CheckCircle2, error: XCircle, info: Info } as const;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const push = useCallback((tone: ToastTone, title: string, description?: string) => {
    nextId.current += 1;
    setItems((prev) => [...prev, { id: nextId.current, tone, title, description, open: true }]);
  }, []);

  const close = useCallback((id: number) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, open: false } : item)));
    window.setTimeout(() => setItems((prev) => prev.filter((item) => item.id !== id)), EXIT_MS);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (title, description) => push("success", title, description),
      error: (title, description) => push("error", title, description),
      info: (title, description) => push("info", title, description),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      <ToastPrimitive.Provider duration={DURATION_MS} swipeDirection="right">
        {children}
        {items.map((item) => {
          const Icon = ICONS[item.tone];
          return (
            <ToastPrimitive.Root
              key={item.id}
              open={item.open}
              onOpenChange={(open) => {
                if (!open) close(item.id);
              }}
              className={cx(styles.toast, styles[item.tone])}
            >
              <Icon className={styles.icon} size={20} aria-hidden />
              <div className={styles.text}>
                <ToastPrimitive.Title className={styles.title}>{item.title}</ToastPrimitive.Title>
                {item.description ? (
                  <ToastPrimitive.Description className={styles.description}>{item.description}</ToastPrimitive.Description>
                ) : null}
              </div>
              <ToastPrimitive.Close className={styles.close} aria-label="Dismiss notification">
                <X size={16} />
              </ToastPrimitive.Close>
              <span className={styles.progress} style={{ animationDuration: `${DURATION_MS}ms` }} aria-hidden />
            </ToastPrimitive.Root>
          );
        })}
        <ToastPrimitive.Viewport className={styles.viewport} label="Notifications" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
