import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import { getRequest, setCookie } from "@tanstack/react-start/server";
import type { Database } from "./database.types";

// Request-scoped Supabase client bound to the incoming cookie jar.
// Runs RLS as the logged-in user — never use for privileged operations.
export function getSupabaseServerClient() {
  return createServerClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          const header = getRequest().headers.get("cookie") ?? "";
          return parseCookieHeader(header);
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            setCookie(name, value, options);
          });
        },
      },
    },
  );
}
