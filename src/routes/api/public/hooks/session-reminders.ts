import { createServerFileRoute } from "@tanstack/react-start/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { notifyUser } from "@/lib/server-fns/push";

/** Same cron pattern as task-reminders.ts — notifies the assigned therapist ~1h before a session. */
export const ServerRoute = createServerFileRoute("/api/public/hooks/session-reminders").methods({
  POST: async ({ request }) => {
    if (request.headers.get("x-cron-secret") !== process.env.CRON_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }

    const admin = getSupabaseAdminClient();
    const now = new Date();
    const in1h = new Date(now.getTime() + 60 * 60 * 1000);

    const { data: upcoming } = await admin
      .from("sessions")
      .select("*, clients(full_name)")
      .eq("status", "scheduled")
      .is("reminder_sent_at", null)
      .lte("session_date", in1h.toISOString())
      .gte("session_date", now.toISOString());

    let sent = 0;
    for (const session of upcoming ?? []) {
      if (!session.assigned_to) continue;
      await notifyUser({
        userId: session.assigned_to,
        organizationId: session.organization_id,
        type: "session_reminder",
        title: "פגישה מתקרבת",
        body: `פגישה עם ${(session as any).clients?.full_name} בעוד שעה`,
        link: `/clients/${session.client_id}`,
      });
      await admin.from("sessions").update({ reminder_sent_at: now.toISOString() }).eq("id", session.id);
      sent += 1;
    }

    return Response.json({ ok: true, sent });
  },
});
