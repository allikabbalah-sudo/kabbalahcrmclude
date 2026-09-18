import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import JSZip from "jszip";
import { authMiddleware } from "../auth-middleware";

const TABLES = ["clients", "programs", "sessions", "tasks", "activity_logs"] as const;

/**
 * Admin-only full-organization export. Relies on RLS to enforce that only
 * org admins can select every row (non-admins would only get back their own
 * assigned subset, which is intentionally NOT what this endpoint promises —
 * guard in the UI by only surfacing the export button to admins).
 * Returns a base64-encoded zip of one JSON file per table.
 */
export const exportOrganizationData = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(z.object({ organizationId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { data: membership } = await context.supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", data.organizationId)
      .eq("user_id", context.user.id)
      .single();

    if (!membership || !["owner", "admin"].includes(membership.role)) {
      throw new Error("FORBIDDEN");
    }

    const zip = new JSZip();

    for (const table of TABLES) {
      const { data: rows, error } = await context.supabase
        .from(table)
        .select("*")
        .eq("organization_id", data.organizationId);
      if (error) throw new Error(error.message);
      zip.file(`${table}.json`, JSON.stringify(rows ?? [], null, 2));
    }

    const base64 = await zip.generateAsync({ type: "base64" });
    return { filename: `export-${data.organizationId}-${Date.now()}.zip`, base64 };
  });
