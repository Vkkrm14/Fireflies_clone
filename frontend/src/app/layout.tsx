import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DM_Sans, Inter, Poppins } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { ToastProvider } from "@/components/ui/Toast";

const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"], display: "swap" });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const poppins = Poppins({ variable: "--font-poppins", weight: ["400", "500"], subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  // No `title` here: AppShell renders a per-route <title>, which a static metadata title would override.
  description: "Meeting notes, transcripts and action items in one workspace.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="dark" className={`${dmSans.variable} ${inter.variable} ${poppins.variable}`}>
      <body>
        <ToastProvider>
          <AppShell>{children}</AppShell>
        </ToastProvider>
      </body>
    </html>
  );
}
