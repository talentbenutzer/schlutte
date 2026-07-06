import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase-Client mit Service-Role-Key — NUR serverseitig verwenden
 * (Server Actions / Route Handler). Der Key darf NIEMALS an den Browser gelangen,
 * deshalb ohne NEXT_PUBLIC_-Präfix. Wird für die Auth-Admin-API benötigt
 * (Nutzer anlegen, Passwörter setzen), die der Anon-Key nicht darf.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Passwortverwaltung ist nicht konfiguriert: SUPABASE_SERVICE_ROLE_KEY fehlt in der Server-Umgebung (.env.local)."
    );
  }

  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
