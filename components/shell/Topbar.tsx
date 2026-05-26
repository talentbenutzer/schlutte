"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/ui/BrandMark";
import { UserChip } from "@/components/ui/UserChip";
import { Icon } from "@/components/ui/Icon";

const NAV = [
  { label: "Dashboard", href: "/" },
  { label: "Kommissionen", href: "/kommissionen" },
  { label: "Archiv", href: "/archiv" },
  { label: "Vorlagen", href: "/vorlagen" },
];

function isActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function Topbar() {
  const pathname = usePathname() ?? "/";
  return (
    <header className="grb-topbar">
      <BrandMark />
      <nav className="grb-nav" style={{ marginLeft: 16 }}>
        {NAV.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={isActive(item.href, pathname) ? "is-active" : ""}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="grb-search" style={{ marginLeft: "auto" }}>
        <Icon name="search" size={16} />
        <span className="grb-search-placeholder">
          Kommissionsnummer oder Kunde …
        </span>
        <kbd>⌘ K</kbd>
      </div>
      <UserChip kuerzel="EDL" name="Eddy Lorenz" role="Admin" />
    </header>
  );
}
