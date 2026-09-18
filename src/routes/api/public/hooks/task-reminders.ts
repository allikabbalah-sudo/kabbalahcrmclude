import { createServerFileRoute } from "@tanstack/react-start/server";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import { notifyUser } from "@/lib/server-fns/push";

/**
 * Invoked by an external scheduler (Cloudflare Cron Trigger hitting this
 * route, or GitHub Actions/cron-job.org) every few minutes. Protected by a
 * shared secret rather than user auth, since there is no logged-in caller.
 *
 * Configure in wrangler.toml:
 *   [triggers]
 *   crons = ["*\/5 * * * *"]
 * and route the scheduled() handler to fetch this URL with the header
 * `x-cron-secret: <CRON_SECRET>`.
 */
export const ServerRoute = createServerFileRoute("/api/public/hooks/task-reminders").methods({
  POST: async ({ request }) => {
    if (request.headers.get("x-cron-secret") !== process.env.CRON_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }

    const admin = getSupabaseAdminClient();
    const now = new Date();
    const in1h = new Date(now.getTime() + 60 * 60 * 1000);
    const in10m = new Date(now.getTime() + 10 * 60 * 1000);

    const { data: dueSoon1h } = await admin
      .from("tasks")
      .select("*")
      .eq("status", "todo")
      .is("reminder_1h_sent_at", null)
      .lte("due_date", in1h.toISOString())
      .gte("due_date", now.toISOString());

    const { data: dueSoon10m } = await admin
      .from("tasks")
      .select("*")
      .eq("status", "todo")
      .is("reminder_10m_sent_at", null)
      .lte("due_date", in10m.toISOString())
      .gte("due_date", now.toISOString());

    let sent = 0;

    for (const task of dueSoon1h ?? []) {
      if (!task.assigned_to) continue;
      await notifyUser({
        userId: task.assigned_to,
        organizationId: task.organization_id,
        type: "task_due_soon",
        title: "משימה מתקרבת",
        body: `"${task.title}" מגיעה לתאריך יעד בעוד שעה`,
        link: "/tasks",
      });
      await admin.from("tasks").update({ reminder_1h_sent_at: now.toISOString() }).eq("id", task.id);
      sent += 1;
    }

    for (const task of dueSoon10m ?? []) {
      if (!task.assigned_to) continue;
      await notifyUser({
        userId: task.assigned_to,
        organizationId: task.organization_id,
        type: "task_due_soon",
        title: "משימה דחופה",
        body: `"${task.title}" מגיעה לתאריך יעד בעוד 10 דקות`,
        link: "/tasks",
      });
      await admin.from("tasks").update({ reminder_10m_sent_at: now.toISOString() }).eq("id", task.id);
      sent += 1;
    }

    return Response.json({ ok: true, sent });
  },
});
