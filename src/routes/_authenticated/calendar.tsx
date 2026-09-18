import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { addDays, startOfWeek, format, isSameDay } from "date-fns";
import { he } from "date-fns/locale";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useOrganization } from "@/hooks/useOrganization";
import { ChevronRight, ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/calendar")({
  component: CalendarPage,
});

function CalendarPage() {
  const { activeOrgId } = useOrganization();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const weekEnd = addDays(weekStart, 6);

  const { data: sessions = [] } = useQuery({
    queryKey: ["calendar-sessions", activeOrgId, weekStart.toISOString()],
    enabled: !!activeOrgId,
    queryFn: async () => {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("sessions")
        .select("id, session_date, status, client_id, clients(full_name)")
        .eq("organization_id", activeOrgId!)
        .gte("session_date", weekStart.toISOString())
        .lte("session_date", addDays(weekEnd, 1).toISOString())
        .order("session_date");
      if (error) throw error;
      return data;
    },
  });

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold">יומן</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekStart(addDays(weekStart, -7))} className="p-1.5 rounded-md hover:bg-secondary">
            <ChevronRight size={18} />
          </button>
          <span className="text-sm">
            {format(weekStart, "d MMM", { locale: he })} - {format(weekEnd, "d MMM", { locale: he })}
          </span>
          <button onClick={() => setWeekStart(addDays(weekStart, 7))} className="p-1.5 rounded-md hover:bg-secondary">
            <ChevronLeft size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
        {days.map((day) => {
          const daySessions = sessions.filter((s: any) => isSameDay(new Date(s.session_date), day));
          return (
            <div key={day.toISOString()} className="bg-card border border-border rounded-lg p-2 min-h-32">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                {format(day, "EEEE d/M", { locale: he })}
              </p>
              <div className="space-y-1.5">
                {daySessions.map((s: any) => (
                  <Link
                    key={s.id}
                    to="/clients/$id"
                    params={{ id: s.client_id }}
                    className="block text-xs rounded-md bg-accent text-accent-foreground px-2 py-1 truncate"
                  >
                    {format(new Date(s.session_date), "HH:mm")} · {s.clients?.full_name}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
