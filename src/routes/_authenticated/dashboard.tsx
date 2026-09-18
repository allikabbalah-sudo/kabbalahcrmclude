import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useOrganization } from "@/hooks/useOrganization";
import { CLIENT_STATUS_LABELS_HE, formatSessionDateHe } from "@/lib/business-logic";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function useDashboardData(orgId: string | null) {
  return useQuery({
    queryKey: ["dashboard", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const [clients, todaySessions, openTasks] = await Promise.all([
        supabase.from("clients").select("id, status").eq("organization_id", orgId!),
        supabase
          .from("sessions")
          .select("id, session_date, status, clients(full_name)")
          .eq("organization_id", orgId!)
          .gte("session_date", todayStart.toISOString())
          .lte("session_date", todayEnd.toISOString())
          .order("session_date"),
        supabase
          .from("tasks")
          .select("id, title, due_date, priority")
          .eq("organization_id", orgId!)
          .eq("status", "todo")
          .order("due_date")
          .limit(5),
      ]);

      const statusCounts: Record<string, number> = {};
      for (const c of clients.data ?? []) {
        statusCounts[c.status] = (statusCounts[c.status] ?? 0) + 1;
      }

      return {
        statusCounts,
        totalClients: clients.data?.length ?? 0,
        todaySessions: todaySessions.data ?? [],
        openTasks: openTasks.data ?? [],
      };
    },
  });
}

function DashboardPage() {
  const { activeOrgId } = useOrganization();
  const { data, isLoading } = useDashboardData(activeOrgId);

  if (isLoading || !data) return <div className="p-6 text-muted-foreground">טוען...</div>;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="סה״כ לקוחות" value={data.totalClients} />
        {Object.entries(CLIENT_STATUS_LABELS_HE)
          .filter(([key]) => ["active", "lead", "waiting"].includes(key))
          .map(([key, label]) => (
            <StatCard key={key} label={label} value={data.statusCounts[key] ?? 0} />
          ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <section className="bg-card border border-border rounded-lg p-4">
          <h2 className="font-medium mb-3">פגישות היום</h2>
          {data.todaySessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">אין פגישות היום</p>
          ) : (
            <ul className="space-y-2">
              {data.todaySessions.map((s: any) => (
                <li key={s.id} className="flex justify-between text-sm border-b border-border last:border-0 pb-2">
                  <span>{s.clients?.full_name}</span>
                  <span className="text-muted-foreground">{formatSessionDateHe(new Date(s.session_date))}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-card border border-border rounded-lg p-4">
          <h2 className="font-medium mb-3">משימות פתוחות</h2>
          {data.openTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">אין משימות פתוחות</p>
          ) : (
            <ul className="space-y-2">
              {data.openTasks.map((t: any) => (
                <li key={t.id} className="flex justify-between text-sm border-b border-border last:border-0 pb-2">
                  <span>{t.title}</span>
                  {t.due_date && (
                    <span className="text-muted-foreground">
                      {formatSessionDateHe(new Date(t.due_date))}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
