import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { TASK_PRIORITY_LABELS_HE, formatSessionDateHe } from "@/lib/business-logic";
import { createTask, toggleTaskStatus } from "@/lib/server-fns/tasks";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/tasks")({
  component: TasksPage,
});

const PRIORITY_STYLES: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-accent text-accent-foreground",
  high: "bg-warning/15 text-warning",
  urgent: "bg-destructive/15 text-destructive",
};

function TasksPage() {
  const { activeOrgId } = useOrganization();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [showForm, setShowForm] = useState(false);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks", activeOrgId],
    enabled: !!activeOrgId,
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("tasks")
        .select("*, clients(full_name)")
        .eq("organization_id", activeOrgId!)
        .order("status")
        .order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data;
    },
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !activeOrgId || !user) return;
    await createTask({ data: { organizationId: activeOrgId, title, assignedTo: user.id } });
    setTitle("");
    setShowForm(false);
    queryClient.invalidateQueries({ queryKey: ["tasks", activeOrgId] });
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">משימות</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium"
        >
          <Plus size={16} /> משימה חדשה
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="flex gap-2">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="כותרת המשימה"
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm">
            הוסף
          </button>
        </form>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">טוען...</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((t: any) => (
            <li
              key={t.id}
              className="flex items-center gap-3 bg-card border border-border rounded-lg p-3 text-sm"
            >
              <input
                type="checkbox"
                checked={t.status === "done"}
                onChange={async (e) => {
                  await toggleTaskStatus({
                    data: { id: t.id, status: e.target.checked ? "done" : "todo" },
                  });
                  queryClient.invalidateQueries({ queryKey: ["tasks", activeOrgId] });
                }}
              />
              <div className="flex-1 min-w-0">
                <p className={t.status === "done" ? "line-through text-muted-foreground" : ""}>{t.title}</p>
                {t.clients?.full_name && (
                  <p className="text-xs text-muted-foreground">{t.clients.full_name}</p>
                )}
              </div>
              {t.due_date && (
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatSessionDateHe(new Date(t.due_date))}
                </span>
              )}
              <span className={`text-xs rounded-full px-2 py-0.5 shrink-0 ${PRIORITY_STYLES[t.priority]}`}>
                {TASK_PRIORITY_LABELS_HE[t.priority]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
