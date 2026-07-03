import "@/styles/intranet.css";
import { createClient } from "@/lib/supabase/server";
import { IntranetHub } from "@/components/intranet/IntranetHub";

export const dynamic = "force-dynamic";

function salutationForHour(hour: number): string {
  if (hour >= 5 && hour < 11) return "Guten Morgen";
  if (hour >= 11 && hour < 18) return "Guten Tag";
  return "Guten Abend";
}

function buildDateLine(now: Date): string {
  const days = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
  const months = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const kw = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${days[now.getDay()]} · ${now.getDate()}. ${months[now.getMonth()]} ${now.getFullYear()} · KW ${kw}`;
}

// "edmund.laabs" / "edmund_laabs" -> "Edmund Laabs"
function humanizeName(raw: string): string {
  return raw
    .split(/[._\-\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
    .trim();
}

// Nur der Vorname für die Begrüßung: "Edmund Laabs" / "Edmund.laabs" -> "Edmund"
function firstNameOf(raw: string): string {
  const first = raw.split(/[._\-\s]+/).filter(Boolean)[0] ?? raw;
  return first.charAt(0).toUpperCase() + first.slice(1);
}

export default async function StartPage() {
  let displayName: string | null = null;
  let userName = "Benutzer";
  let userInitials = "USR";
  let userRole = "Mitarbeiter";

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.email) {
      // Self-Provisioning: legt den Mitarbeiter-Eintrag an, falls noch keiner existiert.
      const { data: existing } = await supabase
        .from("employees")
        .select("id")
        .ilike("email", user.email)
        .maybeSingle();

      if (!existing) {
        const local = user.email.split("@")[0];
        const metaName =
          typeof user.user_metadata?.full_name === "string"
            ? (user.user_metadata.full_name as string)
            : "";
        const fullName = metaName || humanizeName(local);
        const initials =
          local.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase() || "USR";
        await supabase.from("employees").insert({
          id: user.id,
          email: user.email,
          name: fullName,
          initials,
          is_admin: false,
          is_active: true,
        });
      }

      const { data: rows } = await supabase
        .from("employees")
        .select("name, initials, is_admin")
        .or(`id.eq.${user.id},email.ilike.${user.email}`)
        .limit(1);
      const data = rows?.[0] ?? null;
      const local = user.email.split("@")[0];
      if (data) {
        userName = data.name ? humanizeName(data.name) : humanizeName(local);
        userInitials = data.initials || user.email.slice(0, 3).toUpperCase();
        userRole = `${data.is_admin ? "Admin" : "Mitarbeiter"} · ${data.initials ?? ""}`.trim();
        displayName = firstNameOf(data.name || local);
      } else {
        userName = humanizeName(local);
        userInitials = user.email.slice(0, 3).toUpperCase();
        displayName = firstNameOf(local);
      }
    }
  } catch (e) {
    console.error("Error loading user for intranet hub:", e);
  }

  const now = new Date();
  return (
    <IntranetHub
      salutation={salutationForHour(now.getHours())}
      displayName={displayName}
      dateLine={buildDateLine(now)}
      userName={userName}
      userInitials={userInitials}
      userRole={userRole}
    />
  );
}
