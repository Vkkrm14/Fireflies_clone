import { notFound } from "next/navigation";
import type { ReactNode } from "react";

/** The component gallery is a development aid; it is not served from a production build. */
export default function DesignSystemLayout({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV === "production") notFound();
  return children;
}
