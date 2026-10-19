import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The app's half of setNewPassword: after `auth.updateUser({ password })` in the app, it calls this
 * with its own access token (Bearer) so the temporary-password flag is cleared, exactly like the site.
 * The app then refreshes its session so the new token no longer carries it.
 */
// Bearer token, no cookies: any origin may call it (the app on the web build runs on another origin).
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "authorization, content-type" };
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: CORS });

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return json({ ok: false, error: "Faça login de novo." }, 401);

  const supabase = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  // getUser asks the auth server, so app_metadata is the current one (not the token's copy).
  const { data } = await supabase.auth.getUser(token);
  const user = data.user;
  if (!user) return json({ ok: false, error: "Faça login de novo." }, 401);

  if (user.app_metadata?.must_change_password) {
    // app_metadata is replaced, so keep the rest.
    const { error } = await createAdminClient().auth.admin.updateUserById(user.id, { app_metadata: { ...user.app_metadata, must_change_password: false } });
    if (error) return json({ ok: false, error: "Não foi possível concluir. Tente de novo." }, 500);
  }
  return json({ ok: true });
}
