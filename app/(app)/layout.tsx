import type { ReactNode } from "react";
import Link from "next/link";
import { Topbar } from "@/components/shell/Topbar";

export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grb" style={{ minHeight: "100vh" }}>
      <Topbar />
      {children}
      {/* Feedback FAB — not visible in print */}
      <Link
        href="/feedback"
        className="grb-feedback-fab"
        title="Feedback an Eddy"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 100,
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "9px 16px",
          background: "var(--bg-raised)",
          border: "1px solid var(--border-strong)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--fg-muted)",
          textDecoration: "none",
          transition: "border-color 0.15s, color 0.15s",
        }}
      >
        Feedback an Eddy
      </Link>
    </div>
  );
}

