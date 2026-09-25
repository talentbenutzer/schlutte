"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

type NavItem = {
  href: string;
  label: string;
  icon: "receipt" | "doc-stripe" | "user" | "card" | "settings";
  /** Pfad-Präfixe, für die der Eintrag aktiv ist (Unterseiten der Phasen 2/3). */
  match: string[];
  finance?: boolean;
};

const ITEMS: NavItem[] = [
  { href: "/auslagen", label: "Belege", icon: "receipt", match: ["/auslagen/erfassen", "/auslagen/belege"] },
  { href: "/auslagen/antraege", label: "Anträge", icon: "doc-stripe", match: ["/auslagen/antraege", "/auslagen/antrag"] },
  { href: "/auslagen/eingang", label: "Eingang", icon: "doc-stripe", match: ["/auslagen/eingang"], finance: true },
  { href: "/auslagen/profil", label: "Profil", icon: "user", match: ["/auslagen/profil"] },
  { href: "/auslagen/abgleich", label: "Abgleich", icon: "card", match: ["/auslagen/abgleich"], finance: true },
  {
    href: "/auslagen/einstellungen",
    label: "Einstellungen",
    icon: "settings",
    match: ["/auslagen/einstellungen"],
    finance: true,
  },
];

function isActive(item: NavItem, pathname: string): boolean {
  if (pathname === item.href) return true;
  return item.match.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/**
 * Navigation des Auslagen-Bereichs: im Kopf (ab Tablet) bzw. als untere
 * Tab-Leiste (Smartphone). Welche Einträge erscheinen, entscheidet der Server
 * (finance); die Seiten prüfen ihre Berechtigung zusätzlich selbst.
 */
export function AuslagenNav({ variant, finance }: { variant: "top" | "tabs"; finance: boolean }) {
  const pathname = usePathname() ?? "/auslagen";
  const items = ITEMS.filter((item) => !item.finance || finance);

  if (variant === "top") {
    return (
      <nav className="aus-nav" aria-label="Auslagen">
        {items.map((item) => {
          const active = isActive(item, pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={active ? "is-active" : undefined}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="aus-tabbar" aria-label="Auslagen">
      {items.map((item) => {
        const active = isActive(item, pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={active ? "aus-tab is-active" : "aus-tab"}
            aria-current={active ? "page" : undefined}
          >
            <Icon name={item.icon} size={22} stroke={1.5} />
            <span className="aus-tab-label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
