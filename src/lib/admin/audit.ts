import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/database.types";

/**
 * Records what a platform admin did (/admin/auditoria). Never throws: a failed log line must not undo
 * or block the action itself. Call it after the action succeeded.
 */
export async function logAdminAction(
  admin: { id: string; email?: string | null },
  action: string,
  opts: { organizationId?: string | null; details?: Record<string, unknown> } = {},
) {
  try {
    await createAdminClient().from("admin_audit").insert({
      admin_id: admin.id,
      admin_email: admin.email ?? null,
      action,
      organization_id: opts.organizationId ?? null,
      details: (opts.details ?? {}) as Json,
    });
  } catch (e) {
    console.error("[admin-audit]", action, e);
  }
}
