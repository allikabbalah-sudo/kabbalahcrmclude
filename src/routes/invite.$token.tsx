import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getInvitePreview, acceptInvite } from "@/lib/server-fns/invites";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/invite/$token")({
  component: InvitePage,
});

function InvitePage() {
  const { token } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [accepting, setAccepting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const { data: preview, isLoading } = useQuery({
    queryKey: ["invite-preview", token],
    queryFn: () => getInvitePreview({ data: { token } }),
  });

  async function handleAccept() {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    setAccepting(true);
    const result = await acceptInvite({ data: { token } });
    setAccepting(false);
    if (!result.ok) {
      setMessage("לא ניתן היה לקבל את ההזמנה (ייתכן שכבר נוצלה).");
      return;
    }
    navigate({ to: "/dashboard" });
  }

  if (isLoading) return <div className="p-8 text-center">טוען...</div>;
  if (!preview?.ok) {
    return <div className="p-8 text-center text-destructive">ההזמנה אינה תקפה או שכבר נוצלה.</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-card rounded-lg border border-border p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold mb-2">הוזמנת להצטרף אל {preview.organization_name}</h1>
        <p className="text-sm text-muted-foreground mb-6">תפקיד: {preview.role}</p>
        <button
          onClick={handleAccept}
          disabled={accepting}
          className="w-full rounded-md bg-primary text-primary-foreground py-2 text-sm font-medium disabled:opacity-50"
        >
          {user ? "קבל הזמנה" : "התחבר כדי לקבל"}
        </button>
        {message && <p className="text-sm text-destructive mt-3">{message}</p>}
      </div>
    </div>
  );
}
