import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "../auth-middleware";
import { getSupabaseAdminClient } from "../supabase-admin";
import { notifyUser } from "./push";

const createInviteSchema = z.object({
  organizationId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(["admin", "therapist", "member"]),
});

/**
 * Creates an invite row (RLS on org_invites already restricts this to
 * admins/owners of the org) and returns a shareable link. Sending the actual
 * email is left to your provider of choice (Resend/Postmark) — wire it in
 * where noted below.
 */
export const createInvite = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(createInviteSchema)
  .handler(async ({ data, context }) => {
    const { data: invite, error } = await context.supabase
      .from("org_invites")
      .insert({
        organization_id: data.organizationId,
        email: data.email,
        role: data.role,
        invited_by: context.user.id,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // TODO: send email via your provider, e.g.:
    // await resend.emails.send({ to: data.email, subject: "...", html: `.../invite/${invite.token}` })

    return { token: invite.token as string };
  });

export const acceptInvite = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ token: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("accept_invite", {
      _token: data.token,
    });
    if (error) throw new Error(error.message);
    return result as { ok: boolean; reason?: string; organization_id?: string; role?: string };
  });

export const getInvitePreview = createServerFn({ method: "GET" })
  .validator(z.object({ token: z.string().uuid() }))
  .handler(async ({ data }) => {
    const admin = getSupabaseAdminClient();
    const { data: result, error } = await admin.rpc("get_invite", { _token: data.token });
    if (error) throw new Error(error.message);
    return result as { ok: boolean; reason?: string; organization_name?: string; role?: string };
  });

export const addMemberByEmail = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      organizationId: z.string().uuid(),
      email: z.string().email(),
      role: z.enum(["admin", "therapist", "member"]),
    }),
  )
  .handler(async ({ data, context }) => {
    const { data: result, error } = await context.supabase.rpc("add_member_by_email", {
      _org: data.organizationId,
      _email: data.email,
      _role: data.role,
    });
    if (error) throw new Error(error.message);
    return result as { ok: boolean; reason?: string };
  });

export const approvePendingMember = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ memberId: z.string().uuid(), role: z.enum(["admin", "therapist", "member"]) }))
  .handler(async ({ data, context }) => {
    const { data: member, error } = await context.supabase
      .from("organization_members")
      .update({ role: data.role })
      .eq("id", data.memberId)
      .select()
      .single();
    if (error) throw new Error(error.message);

    await notifyUser({
      userId: member.user_id,
      organizationId: member.organization_id,
      type: "membership_approved",
      title: "הבקשה שלך אושרה",
      body: "ההצטרפות שלך לארגון אושרה. ברוך הבא!",
      link: "/dashboard",
    });

    return { ok: true };
  });
