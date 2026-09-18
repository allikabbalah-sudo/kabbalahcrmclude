import { createMiddleware } from "@tanstack/react-start";
import { getSupabaseServerClient } from "./supabase-server";

// Every server function that touches org/client/session/task data should
// compose with this middleware — it guarantees `context.user` is a real,
// session-verified Supabase user (never trust a client-supplied user id).
export const authMiddleware = createMiddleware().server(async ({ next }) => {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("UNAUTHENTICATED");
  }

  return next({ context: { user, supabase } });
});
