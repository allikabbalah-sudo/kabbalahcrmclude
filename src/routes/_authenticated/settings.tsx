import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useOrganization } from "@/hooks/useOrganization";
import { createInvite, approvePendingMember } from "@/lib/server-fns/invites";
import { exportOrganizationData } from "@/lib/server-fns/export";
import { getVapidPublicKey, registerPushSubscription } from "@/lib/server-fns/push";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

function SettingsPage() {
  const { activeOrgId, isAdmin, memberships, activeRole } = useOrganization();
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "therapist" | "member">("member");
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const { data: members = [] } = useQuery({
    queryKey: ["org-members", activeOrgId],
    enabled: !!activeOrgId,
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("organization_members")
        .select("id, role, user_id, profiles(full_name, email)")
        .eq("organization_id", activeOrgId!);
      if (error) throw error;
      return data;
    },
  });

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!activeOrgId || !inviteEmail.trim()) return;
    const { token } = await createInvite({
      data: { organizationId: activeOrgId, email: inviteEmail, role: inviteRole },
    });
    setInviteLink(`${window.location.origin}/invite/${token}`);
    setInviteEmail("");
  }

  async function handleEnablePush() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const { publicKey } = await getVapidPublicKey();
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const json = sub.toJSON();
      await registerPushSubscription({
        data: { endpoint: json.endpoint!, keys: { p256dh: json.keys!.p256dh, auth: json.keys!.auth } },
      });
      toast.success("התראות הופעלו");
    } catch (err: any) {
      toast.error("לא ניתן היה להפעיל התראות: " + err.message);
    }
  }

  async function handleExport() {
    if (!activeOrgId) return;
    const { filename, base64 } = await exportOrganizationData({ data: { organizationId: activeOrgId } });
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl space-y-6">
      <h1 className="text-lg font-semibold">הגדרות</h1>

      <section className="bg-card border border-border rounded-lg p-4">
        <h2 className="font-medium mb-3 text-sm">התראות</h2>
        <button onClick={handleEnablePush} className="rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm">
          הפעל התראות דחיפה
        </button>
      </section>

      <section className="bg-card border border-border rounded-lg p-4">
        <h2 className="font-medium mb-3 text-sm">חברי ארגון (התפקיד שלך: {activeRole})</h2>
        <ul className="space-y-1.5 mb-4">
          {members.map((m: any) => (
            <li key={m.id} className="flex items-center justify-between text-sm border-b border-border last:border-0 pb-1.5">
              <span>{m.profiles?.full_name ?? m.profiles?.email}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{m.role}</span>
                {isAdmin && m.role === "pending_approval" && (
                  <button
                    onClick={async () => {
                      await approvePendingMember({ data: { memberId: m.id, role: "member" } });
                      queryClient.invalidateQueries({ queryKey: ["org-members", activeOrgId] });
                    }}
                    className="text-xs rounded-md bg-primary text-primary-foreground px-2 py-1"
                  >
                    אשר
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>

        {isAdmin && (
          <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-2">
            <input
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              type="email"
              placeholder="אימייל להזמנה"
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as any)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="member">חבר</option>
              <option value="therapist">מטפל</option>
              <option value="admin">מנהל</option>
            </select>
            <button type="submit" className="rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm">
              הזמן
            </button>
          </form>
        )}
        {inviteLink && (
          <p className="text-xs text-muted-foreground mt-2 break-all">קישור הזמנה: {inviteLink}</p>
        )}
      </section>

      {isAdmin && (
        <section className="bg-card border border-border rounded-lg p-4">
          <h2 className="font-medium mb-3 text-sm">ייצוא נתונים</h2>
          <button onClick={handleExport} className="rounded-md border border-input px-3 py-2 text-sm">
            ייצא את כל נתוני הארגון (ZIP)
          </button>
        </section>
      )}
    </div>
  );
}
