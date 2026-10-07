"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { X } from "lucide-react";
import { CreateMeetingModal } from "@/components/meetings/CreateMeetingModal";
import { chromeForPath, titleForPath } from "@/lib/routes";
import { useSystemThemeSync } from "@/lib/hooks/useTheme";
import { useUiStore } from "@/lib/store/ui";
import { IconRail } from "./IconRail";
import { TopBar } from "./TopBar";
import styles from "./AppShell.module.css";

function PromoBanner() {
  const visible = useUiStore((s) => s.promoVisible);
  const dismiss = useUiStore((s) => s.dismissPromo);
  if (!visible) return null;
  return (
    <div className={styles.promo} role="region" aria-label="Promotion">
      <span>You are eligible for 7 days business plan free trial.</span>
      <a href="/upgrade">Start free trial →</a>
      <button type="button" onClick={dismiss} aria-label="Dismiss">
        <X size={16} />
      </button>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const chrome = chromeForPath(pathname);
  const promoVisible = useUiStore((s) => s.promoVisible);
  const setPendingSearchFocus = useUiStore((s) => s.setPendingSearchFocus);
  useSystemThemeSync();

  // Ctrl+K: focus whichever search box the page has (transcript find in a notebook, else the top bar)
  // Ctrl+J: AskFred. Registered here so they work on every page, not only those with the top bar.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === "k") {
        event.preventDefault();
        const target = document.querySelector<HTMLInputElement>("[data-find-input], [data-global-search]");
        if (target) {
          target.focus();
          target.select();
        } else {
          setPendingSearchFocus(true);
          router.push("/");
        }
      } else if (key === "j") {
        event.preventDefault();
        router.push("/ask-fred");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, setPendingSearchFocus]);

  return (
    <div className={styles.root} data-chrome={chrome} style={{ ["--promo-h" as string]: promoVisible ? "40px" : "0px" }}>
      <title>{`${titleForPath(pathname)} - Fireflies.ai`}</title>
      <a href="#main" className="skip-link">Skip to content</a>
      <PromoBanner />
      {chrome === "shell" ? (
        <div className={styles.shell}>
          <IconRail />
          <div className={styles.column}>
            <TopBar />
            <main id="main" className={styles.main}>{children}</main>
          </div>
        </div>
      ) : (
        <main id="main" className={styles.bare}>{children}</main>
      )}
      <CreateMeetingModal />
    </div>
  );
}
