import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "../auth-middleware";

const clientInputSchema = z.object({
  organizationId: z.string().uuid(),
  fullName: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  dateOfBirth: z.string().optional(),
  motherName: z.string().optional(),
  address: z.string().optional(),
  selectedReading: z.string().optional(),
  partnerFullName: z.string().optional(),
  partnerDob: z.string().optional(),
  partnerMotherName: z.string().optional(),
  notes: z.string().optional(),
  assignedTo: z.string().uuid().optional(),
});

export const createClient = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(clientInputSchema)
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("clients")
      .insert({
        organization_id: data.organizationId,
        full_name: data.fullName,
        phone: data.phone || null,
        email: data.email || null,
        date_of_birth: data.dateOfBirth || null,
        mother_name: data.motherName || null,
        address: data.address || null,
        selected_reading: data.selectedReading || null,
        partner_full_name: data.partnerFullName || null,
        partner_dob: data.partnerDob || null,
        partner_mother_name: data.partnerMotherName || null,
        notes: data.notes || null,
        assigned_to: data.assignedTo || context.user.id,
        created_by: context.user.id,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    await context.supabase.from("activity_logs").insert({
      organization_id: data.organizationId,
      client_id: row.id,
      user_id: context.user.id,
      action: "client_created",
      payload: { full_name: data.fullName },
    });

    return row;
  });

export const updateClient = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(clientInputSchema.partial().extend({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { id, organizationId: _org, ...rest } = data;
    const patch: Record<string, unknown> = {};
    if (rest.fullName !== undefined) patch.full_name = rest.fullName;
    if (rest.phone !== undefined) patch.phone = rest.phone;
    if (rest.email !== undefined) patch.email = rest.email;
    if (rest.dateOfBirth !== undefined) patch.date_of_birth = rest.dateOfBirth;
    if (rest.motherName !== undefined) patch.mother_name = rest.motherName;
    if (rest.address !== undefined) patch.address = rest.address;
    if (rest.selectedReading !== undefined) patch.selected_reading = rest.selectedReading;
    if (rest.partnerFullName !== undefined) patch.partner_full_name = rest.partnerFullName;
    if (rest.partnerDob !== undefined) patch.partner_dob = rest.partnerDob;
    if (rest.partnerMotherName !== undefined) patch.partner_mother_name = rest.partnerMotherName;
    if (rest.notes !== undefined) patch.notes = rest.notes;
    if (rest.assignedTo !== undefined) patch.assigned_to = rest.assignedTo;

    const { data: row, error } = await context.supabase
      .from("clients")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const setClientStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      id: z.string().uuid(),
      status: z.enum(["lead", "consultation", "active", "inactive", "waiting", "paid"]),
    }),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("clients")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addClientAssignee = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ clientId: z.string().uuid(), userId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("client_assignees")
      .insert({ client_id: data.clientId, user_id: data.userId, added_by: context.user.id });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeClientAssignee = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ clientId: z.string().uuid(), userId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("client_assignees")
      .delete()
      .eq("client_id", data.clientId)
      .eq("user_id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
