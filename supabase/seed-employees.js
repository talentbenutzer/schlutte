// Seed der bekannten Mitarbeiter in die Supabase employees-Tabelle.
// Schreibzugriff ist per RLS auf authentifizierte Nutzer beschränkt — daher
// wird (falls nötig) eine kurzlebige Auth-Session aufgebaut.
//
//   node supabase/seed-employees.js
//
// Idempotent: vorhandene Kürzel werden übersprungen.

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const env = {};
fs.readFileSync(path.join(__dirname, "../.env.local"), "utf8")
  .split("\n")
  .forEach((l) => {
    const p = l.split("=");
    if (p.length >= 2) {
      env[p[0].trim()] = p.slice(1).join("=").trim().replace(/^['"]|['"]$/g, "");
    }
  });

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anon) {
  console.error("Supabase URL/Anon-Key fehlen in .env.local");
  process.exit(1);
}

const EMPLOYEES = [
  { initials: "EDL", name: "Eddy Lorenz", is_admin: true, is_active: true },
  { initials: "TMK", name: "Thomas Köhler", is_admin: false, is_active: true },
  { initials: "MWB", name: "Marius Weber", is_admin: false, is_active: true },
  { initials: "JBR", name: "Jonas Braun", is_admin: false, is_active: true },
  { initials: "LHR", name: "Lena Herr", is_admin: false, is_active: true },
];

async function ensureSession(supabase) {
  // Bereits eine Session? (unwahrscheinlich im Skript) – sonst temporären User.
  const email = `seed-bot-${Date.now()}@grabner.design`;
  const password = `Seed!${Math.random().toString(36).slice(2, 10)}A1`;
  const { data: up, error: upErr } = await supabase.auth.signUp({ email, password });
  if (!upErr && up.session) return { email, viaSignup: true };
  // Falls keine Session (z. B. Mailbestätigung nötig): Login versuchen.
  const { error: inErr } = await supabase.auth.signInWithPassword({ email, password });
  if (inErr) {
    throw new Error(
      "Konnte keine authentifizierte Session erhalten (evtl. E-Mail-Bestätigung aktiv). " +
        "Bitte stattdessen supabase/migrations/20260528_seed_employees.sql im SQL-Editor ausführen. " +
        "Detail: " + (upErr?.message || inErr.message)
    );
  }
  return { email, viaSignup: false };
}

(async () => {
  const supabase = createClient(url, anon);

  const { data: existing, error: readErr } = await supabase
    .from("employees")
    .select("initials");
  if (readErr) {
    console.error("Lesen fehlgeschlagen:", readErr.message);
    process.exit(1);
  }
  const have = new Set((existing || []).map((e) => e.initials));
  const missing = EMPLOYEES.filter((e) => !have.has(e.initials));

  console.log("Vorhanden:", [...have].join(", ") || "(keine)");
  if (missing.length === 0) {
    console.log("Nichts zu tun — alle Mitarbeiter sind bereits angelegt.");
    return;
  }
  console.log("Lege an:", missing.map((m) => m.initials).join(", "));

  const session = await ensureSession(supabase);
  console.log("Auth-Session via", session.viaSignup ? "Signup" : "Login", "(", session.email, ")");

  const { data: inserted, error: insErr } = await supabase
    .from("employees")
    .insert(missing.map((m) => ({ ...m, email: null })))
    .select("initials, name, is_admin");
  if (insErr) {
    console.error("Insert fehlgeschlagen:", insErr.message);
    process.exit(1);
  }
  console.log("Eingefügt:", JSON.stringify(inserted));

  await supabase.auth.signOut();

  const { data: all } = await supabase
    .from("employees")
    .select("initials, name, is_admin, is_active")
    .order("name");
  console.log("Stand jetzt:", JSON.stringify(all, null, 2));
})();
