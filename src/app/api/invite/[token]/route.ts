import { saveInviteByToken } from "@/lib/invite-save";

/**
 * Invite update for the app (multipart): fields invite_title, invite_message and/or image. The
 * token is the INVITE_EDIT link the party owner already holds. Replies { ok, imageUrl }.
 */
export async function POST(request: Request, { params }: RouteContext<"/api/invite/[token]">) {
  const { token } = await params;
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ ok: false, error: "Envio inválido." }, { status: 400 });
  }
  const text = (k: string) => { const v = form.get(k); return typeof v === "string" ? (v.trim() || null) : undefined; };
  const image = form.get("image");
  try {
    const { imageUrl } = await saveInviteByToken(token, { title: text("invite_title"), message: text("invite_message"), file: image instanceof File ? image : null });
    return Response.json({ ok: true, imageUrl });
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message }, { status: 400 });
  }
}
