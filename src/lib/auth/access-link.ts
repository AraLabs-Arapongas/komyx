import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";
import { appUrl } from "@/lib/utils";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * One-time link that signs the person in and opens "create your password" (same landing as the
 * recovery e-mail: /auth/confirm → /nova-senha). Generating a new one invalidates the previous one.
 */
export async function passwordSetupLink(admin: Admin, email: string) {
  const { data, error } = await admin.auth.admin.generateLink({ type: "recovery", email });
  if (error || !data.properties?.hashed_token) throw new Error(error?.message ?? "Não foi possível gerar o link.");
  return appUrl(`/auth/confirm?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=recovery&next=/nova-senha`);
}

/** E-mail is really delivered only in production; elsewhere (local, staging) it is just logged. */
export const emailIsLogged = () => process.env.EMAIL_PROVIDER !== "resend";
