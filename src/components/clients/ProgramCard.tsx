import { useQueryClient } from "@tanstack/react-query";
import { formatSessionDateHe, WEEKDAY_LABELS_HE } from "@/lib/business-logic";
import { updateSessionStatus } from "@/lib/server-fns/programs";

const SESSION_STATUS_LABELS_HE: Record<string, string> = {
  scheduled: "מתוכנן",
  completed: "הושלם",
  cancelled: "בוטל",
  no_show: "לא הגיע",
  postponed: "נדחה",
};

export function ProgramCard({ program }: { program: any }) {
  const queryClient = useQueryClient();
  const sessions = [...(program.sessions ?? [])].sort(
    (a: any, b: any) => new Date(a.session_date).getTime() - new Date(b.session_date).getTime(),
  );
  const completed = sessions.filter((s: any) => s.status === "completed").length;

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-medium">{program.title}</h3>
        <span className="text-xs text-muted-foreground">
          {completed}/{program.total_sessions} הושלמו
        </span>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        {(program.weekly_days ?? []).map((d: number) => WEEKDAY_LABELS_HE[d as 0]).join(", ")}
      </p>

      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {sessions.map((s: any) => (
          <div key={s.id} className="flex items-center justify-between text-sm border-b border-border last:border-0 pb-1.5">
            <span>{formatSessionDateHe(new Date(s.session_date))}</span>
            <select
              value={s.status}
              onChange={async (e) => {
                await updateSessionStatus({ data: { id: s.id, status: e.target.value as any } });
                queryClient.invalidateQueries({ queryKey: ["client-programs"] });
              }}
              className="text-xs rounded-md border border-input bg-background px-1.5 py-0.5"
            >
              {Object.entries(SESSION_STATUS_LABELS_HE).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
