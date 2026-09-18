import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "../auth-middleware";
import { generateSessionDates } from "../business-logic";

const createProgramSchema = z.object({
  organizationId: z.string().uuid(),
  clientId: z.string().uuid(),
  title: z.string().min(1),
  totalSessions: z.number().int().min(1),
  weeklyDays: z.array(z.number().int().min(0).max(6)),
  startDate: z.string(), // ISO date
  sessionTimes: z.array(z.string()), // ["09:00", ...]
  assignedTo: z.string().uuid().optional(),
});

/**
 * Creates a program AND eagerly materializes all of its sessions up front
 * (rather than generating them lazily), so the calendar/agenda views can
 * just query `sessions` directly. Postponements are handled later by the
 * DB trigger tg_session_postponed_reschedule, which appends one more.
 */
export const createProgram = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(createProgramSchema)
  .handler(async ({ data, context }) => {
    const { data: program, error } = await context.supabase
      .from("programs")
      .insert({
        organization_id: data.organizationId,
        client_id: data.clientId,
        title: data.title,
        total_sessions: data.totalSessions,
        weekly_days: data.weeklyDays,
        start_date: data.startDate,
        session_times: data.sessionTimes,
        session_time: data.sessionTimes[0] ?? null,
        assigned_to: data.assignedTo ?? context.user.id,
        created_by: context.user.id,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    const dates = generateSessionDates({
      startDate: new Date(data.startDate),
      totalSessions: data.totalSessions,
      weeklyDays: data.weeklyDays as any,
      sessionTimes: data.sessionTimes,
    });

    if (dates.length > 0) {
      const { error: sessionsError } = await context.supabase.from("sessions").insert(
        dates.map((d) => ({
          organization_id: data.organizationId,
          program_id: program.id,
          client_id: data.clientId,
          session_date: d.toISOString(),
          status: "scheduled" as const,
          assigned_to: data.assignedTo ?? context.user.id,
        })),
      );
      if (sessionsError) throw new Error(sessionsError.message);
    }

    return program;
  });

export const updateSessionStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      id: z.string().uuid(),
      status: z.enum(["scheduled", "completed", "cancelled", "no_show", "postponed"]),
      notes: z.string().optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("sessions")
      .update({ status: data.status, notes: data.notes })
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const attachSessionMedia = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    z.object({
      id: z.string().uuid(),
      audioUrls: z.array(z.string()).optional(),
      imageUrls: z.array(z.string()).optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    if (data.audioUrls) patch.audio_urls = data.audioUrls;
    if (data.imageUrls) patch.image_urls = data.imageUrls;
    const { error } = await context.supabase.from("sessions").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Signed URL for a private storage object (1h expiry — matches storage policy comment). */
export const getSignedMediaUrl = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ bucket: z.string(), path: z.string() }))
  .handler(async ({ data, context }) => {
    const { data: signed, error } = await context.supabase.storage
      .from(data.bucket)
      .createSignedUrl(data.path, 60 * 60);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });
