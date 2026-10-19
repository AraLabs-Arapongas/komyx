import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { adminDb, uniq } from "./helpers";

/** The app's door to clear the temporary-password flag (web: setNewPassword). */
test("api/auth/password-changed limpa a senha provisória e mantém o resto do app_metadata", async ({ request }) => {
  expect((await request.post("/api/auth/password-changed", { maxRedirects: 0 })).status()).toBe(401);
  expect((await request.post("/api/auth/password-changed", { headers: { Authorization: "Bearer nope" }, maxRedirects: 0 })).status()).toBe(401);

  const db = adminDb();
  const email = `${uniq("temp-pass")}@komyx.test`;
  const password = "senha12345";
  const { data: created, error } = await db.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { must_change_password: true, test_keep: "sim" } });
  expect(error).toBeNull();
  const id = created.user!.id;
  try {
    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
    const { data: signed } = await anon.auth.signInWithPassword({ email, password });
    const token = signed.session!.access_token;

    const res = await request.post("/api/auth/password-changed", { headers: { Authorization: `Bearer ${token}` }, maxRedirects: 0 });
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    const { data: after } = await db.auth.admin.getUserById(id);
    expect(after.user!.app_metadata.must_change_password).toBe(false);
    expect(after.user!.app_metadata.test_keep).toBe("sim");
    expect(after.user!.app_metadata.provider).toBe("email");
  } finally {
    await db.auth.admin.deleteUser(id);
  }
});
