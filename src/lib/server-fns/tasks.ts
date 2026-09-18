import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "../auth-middleware";
import { notifyUser } from "./push";

const taskInputSchema = z.object({
  organizationId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  dueDate: z.string().optional(),
  clientId: z.string().uuid().optional(),
  assignedTo: z.string().uuid(),
});

export const createTask = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(taskInputSchema)
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("tasks")
      .insert({
        organization_id: data.organizationId,
        title: data.title,
        description: data.description || null,
        priority: data.priority,
        due_date: data.dueDate || null,
        client_id: data.clientId || null,
        assigned_to: data.assignedTo,
        created_by: context.user.id,
        source: "manual",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    if (data.assignedTo !== context.user.id) {
      await notifyUser({
        userId: data.assignedTo,
        organizationId: data.organizationId,
        type: "task_assigned",
        title: "משימה חדשה הוקצתה לך",
        body: data.title,
        link: "/tasks",
      });
    }

    return row;
  });

export const toggleTaskStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.string().uuid(), status: z.enum(["todo", "done"]) }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("tasks")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTask = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("tasks").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
