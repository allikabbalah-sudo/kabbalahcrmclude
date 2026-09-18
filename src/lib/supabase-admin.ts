import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// SERVICE ROLE client — bypasses RLS entirely.
// Only import this inside server functions / api routes, never in shared code
// that could be pulled into a client bundle.
export function getSupabaseAdminClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
