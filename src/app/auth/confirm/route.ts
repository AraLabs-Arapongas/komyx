import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Landing for links sent by email (/auth/confirm?token_hash=…&type=recovery&next=/nova-senha).
 * Exchanges the token for a session cookie and moves on; a used or expired link goes back to
 * /esqueci-senha with a note so the person can ask for a new one.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextParam = searchParams.get("next") ?? "/home";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/home";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }
  return NextResponse.redirect(new URL("/esqueci-senha?expirado=1", request.url));
}
