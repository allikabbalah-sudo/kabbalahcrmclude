import { useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { createServerFn } from "@tanstack/react-start";

const checkAuth = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { authenticated: !!user };
});

export const Route = createFileRoute("/auth")({
  beforeLoad: async () => {
    const { authenticated } = await checkAuth();
    if (authenticated) throw redirect({ to: "/dashboard" });
  },
  component: AuthPage,
});

function AuthPage() {
  const { signInWithPassword, signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result =
      mode === "signin"
        ? await signInWithPassword(email, password)
        : await signUp(email, password, fullName);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm bg-card rounded-lg border border-border p-6 shadow-sm">
        <h1 className="text-xl font-semibold mb-1 text-center">Kabbalah CRM</h1>
        <p className="text-sm text-muted-foreground text-center mb-6">
          {mode === "signin" ? "התחברות לחשבון" : "יצירת חשבון חדש"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "signup" && (
            <input
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="שם מלא"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          )}
          <input
            type="email"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="אימייל"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="סיסמה"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-primary text-primary-foreground py-2 text-sm font-medium disabled:opacity-50"
          >
            {mode === "signin" ? "התחבר" : "הרשם"}
          </button>
        </form>

        <div className="my-4 flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          או
          <div className="h-px flex-1 bg-border" />
        </div>

        <button
          onClick={() => signInWithGoogle()}
          className="w-full rounded-md border border-input py-2 text-sm font-medium hover:bg-secondary"
        >
          המשך עם Google
        </button>

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="w-full text-center text-sm text-primary mt-4"
        >
          {mode === "signin" ? "אין לך חשבון? הרשם" : "יש לך כבר חשבון? התחבר"}
        </button>
      </div>
    </div>
  );
}
