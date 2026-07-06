"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { BrandMark } from "@/components/ui/BrandMark";
import { UserChip } from "@/components/ui/UserChip";
import { Icon } from "@/components/ui/Icon";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { label: "Dashboard", href: "/" },
  { label: "Kommissionen", href: "/kommissionen" },
  { label: "Archiv", href: "/archiv" },
  { label: "Vorlagen", href: "/vorlagen" },
  { label: "Mitarbeiter", href: "/mitarbeiter", adminOnly: true },
];

function isActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function Topbar() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [employee, setEmployee] = useState<{ initials?: string; name?: string; is_admin?: boolean } | null>(null);

  useEffect(() => {
    let active = true;
    const fetchUser = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!active) return;
      setUser(currentUser);
      if (currentUser) {
        const { data: rows } = await supabase
          .from("employees")
          .select("initials, name, is_admin")
          .or(`id.eq.${currentUser.id},email.ilike.${currentUser.email ?? ""}`)
          .limit(1);
        if (!active) return;
        setEmployee(rows?.[0] ?? null);
      }
    };
    fetchUser();
    return () => {
      active = false;
    };
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="grb-topbar">
      <Link href="/start" aria-label="Zur Startseite" style={{ display: "flex", textDecoration: "none", color: "inherit" }}>
        <BrandMark />
      </Link>
      <nav className="grb-nav" style={{ marginLeft: 16 }}>
        {NAV.filter((item) => !item.adminOnly || employee?.is_admin).map((item) => {
          const isTemplates = item.label === "Vorlagen";
          if (isTemplates) {
            return (
              <span
                key={item.label}
                style={{
                  opacity: 0.4,
                  cursor: "not-allowed",
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  fontWeight: 500,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  padding: "4px 0",
                  userSelect: "none"
                }}
                title="Vorlagenverwaltung folgt später."
              >
                {item.label}
              </span>
            );
          }
          return (
            <Link
              key={item.label}
              href={item.href}
              className={isActive(item.href, pathname) ? "is-active" : ""}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div
        className="grb-search"
        style={{
          marginLeft: "auto",
          opacity: 0.4,
          cursor: "not-allowed"
        }}
        title="Bitte die Suche auf dem Dashboard verwenden."
      >
        <Icon name="search" size={16} />
        <span className="grb-search-placeholder" style={{ userSelect: "none" }}>
          Suche auf Dashboard nutzen
        </span>
        <kbd style={{ opacity: 0.6 }}>⌘ K</kbd>
      </div>
      {user && (
        <>
          <Link
            href="/feedback"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--fg-subtle)",
              textDecoration: "none",
              padding: "4px 8px",
              whiteSpace: "nowrap",
            }}
            title="Feedback an Eddy"
          >
            Feedback
          </Link>
          <UserChip
            kuerzel={employee?.initials || (user.email ? user.email.slice(0, 3).toUpperCase() : "USR")}
            name={employee?.name || user.email || "Benutzer"}
            role={employee ? (employee.is_admin ? "Admin" : "Mitarbeiter") : "Mitarbeiter"}
            onLogout={handleLogout}
          />
        </>
      )}
    </header>
  );
}
