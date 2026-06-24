/**
 * Server-only Supabase client for the Abecca IT operations BFF.
 *
 * Returns a memoised client when SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are
 * both set; otherwise returns null, which is the data layer's signal to fall
 * back to its in-memory singleton (preview/dev with no database configured).
 *
 * SECURITY: this uses the service_role key, which BYPASSES Row Level Security.
 * It must never reach the browser. The variable is intentionally NOT prefixed
 * with NEXT_PUBLIC_, so Next.js never inlines it into a client bundle, and this
 * module is imported only by other server/* modules (route handlers run on the
 * server). Every public table has RLS enabled with no anon policy, so all access
 * flows through this server BFF.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null | undefined;

export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  client =
    url && key
      ? createClient(url, key, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : null;
  return client;
}

export function supabaseEnabled(): boolean {
  return getSupabase() !== null;
}
