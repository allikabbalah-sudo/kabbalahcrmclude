import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { formatSessionDateHe } from "@/lib/business-logic";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!user) return;
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ["notifications", user.id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  async function markRead(id: string) {
    const supabase = getSupabaseBrowserClient();
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
  }

  return (
    <div className="p-4 md:p-6 max-w-xl space-y-3">
      <h1 className="text-lg font-semibold">התראות</h1>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">טוען...</p>
      ) : notifications.length === 0 ? (
        <p className="text-sm text-muted-foreground">אין התראות</p>
      ) : (
        <ul className="space-y-2">
          {notifications.map((n: any) => (
            <li
              key={n.id}
              onClick={() => !n.read_at && markRead(n.id)}
              className={`bg-card border border-border rounded-lg p-3 text-sm cursor-pointer ${
                !n.read_at ? "border-primary/40" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="font-medium">{n.title}</p>
                {!n.read_at && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
              </div>
              {n.body && <p className="text-muted-foreground mt-0.5">{n.body}</p>}
              <p className="text-xs text-muted-foreground mt-1">
                {formatSessionDateHe(new Date(n.created_at))}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
