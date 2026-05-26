import type { ReactNode } from "react";
import { Topbar } from "@/components/shell/Topbar";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grb" style={{ minHeight: "100vh" }}>
      <Topbar />
      {children}
    </div>
  );
}
