import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

// Browser client — safe to use publishable (anon) key only.
export function getSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    import.meta.env.VITE_SUPABASE_URL!,
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY!,
  );
}
