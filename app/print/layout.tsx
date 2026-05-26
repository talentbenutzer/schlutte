import type { ReactNode } from "react";
import "@/styles/print.css";

export default function PrintLayout({ children }: { children: ReactNode }) {
  // Force light color scheme for prints — no dark theme on paper.
  return <div className="print-root" data-theme="light">{children}</div>;
}
