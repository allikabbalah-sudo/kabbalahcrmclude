import { createServerFn } from "@tanstack/react-start";
import webpush from "web-push";
import { z } from "zod";
import { authMiddleware } from "../auth-middleware";
import { getSupabaseAdminClient } from "../supabase-admin";

function configureWebPush() {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
}

export const getVapidPublicKey = createServerFn({ method: "GET" }).handler(async () => {
  return { publicKey: process.env.VAPID_PUBLIC_KEY! };
});

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string(), auth: z.string() }),
});

export const registerPushSubscription = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(subscribeSchema)
  .handler(async ({ data, context }) => {
    const admin = getSupabaseAdminClient();
    const { error } = await admin.from("push_subscriptions").upsert(
      {
        user_id: context.user.id,
        endpoint: data.endpoint,
        p256dh: data.keys.p256dh,
        auth_key: data.keys.auth,
      },
      { onConflict: "endpoint" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const unregisterPushSubscription = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ endpoint: z.string().url() }))
  .handler(async ({ data, context }) => {
    const admin = getSupabaseAdminClient();
    await admin
      .from("push_subscriptions")
      .delete()
      .eq("user_id", context.user.id)
      .eq("endpoint", data.endpoint);
    return { ok: true };
  });

/**
 * Fan-out helper (server-only, not exposed as a createServerFn — call this
 * directly from other server functions / cron handlers). Writes an in-app
 * notification row AND best-effort pushes to every registered device;
 * expired (410/404) subscriptions are pruned automatically.
 */
export async function notifyUser(params: {
  userId: string;
  organizationId: string | null;
  type: string;
  title: string;
  body?: string;
  link?: string;
}) {
  const admin = getSupabaseAdminClient();

  await admin.from("notifications").insert({
    user_id: params.userId,
    organization_id: params.organizationId,
    type: params.type,
    title: params.title,
    body: params.body ?? null,
    link: params.link ?? null,
  });

  configureWebPush();
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", params.userId);

  const payload = JSON.stringify({
    title: params.title,
    body: params.body,
    url: params.link ?? "/",
  });

  for (const sub of subs ?? []) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth_key },
        },
        payload,
      );
    } catch (err: any) {
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        await admin.from("push_subscriptions").delete().eq("id", sub.id);
      }
    }
  }
}
